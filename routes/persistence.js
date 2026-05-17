// routes/persistence.js — Persistence Center backend.
//
// Surfaces:
//  GET  /status         Aggregate persistence health.
//  GET  /tables         Row counts + last-write timestamps for every table.
//  GET  /audit          Tail of the audit log with filters.
//  GET  /audit/stats    Mutation counts per route per day.
//  GET  /markers        Write-proof markers (created here, fetched after redeploy).
//  POST /markers        Drop a new marker.
//  GET  /snapshots      List backup files on disk.
//  POST /snapshots      Take a snapshot now.
//  GET  /snapshots/:f   Download a specific backup file.
//  GET  /pg             Postgres ping (when DATABASE_URL is set).

import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb, getDbPath } from '../database/init.js'
import { getStorageInfo } from '../database/storageInfo.js'
import { takeSnapshot, listSnapshotFiles } from '../database/snapshotScheduler.js'
import { pgPing, PG_ENABLED } from '../database/pgAdapter.js'

const router = Router()

const TABLES_WITH_TS = [
  // (table_name, ts_column_to_use)
  ['portal_clients','updated_at'],
  ['portal_tickets','updated_at'],
  ['portal_ticket_messages','created_at'],
  ['portal_messages','created_at'],
  ['portal_assets','created_at'],
  ['portal_approvals','created_at'],
  ['portal_proposals','created_at'],
  ['portal_invoices','created_at'],
  ['portal_maintenance_reports','created_at'],
  ['portal_activity','created_at'],
  ['client_scout_leads','updated_at'],
  ['inquiries','updated_at'],
  ['mail_messages','updated_at'],
  ['mail_accounts','created_at'],
  ['sop_instances','started_at'],
  ['legal_documents','created_at'],
  ['kb_articles','updated_at'],
  ['kb_courses','updated_at'],
  ['kb_playbooks','updated_at'],
  ['kb_prompts','updated_at'],
  ['kb_copilot_messages','created_at'],
  ['i18n_overrides','updated_at'],
  ['service_desk_tasks','updated_at'],
  ['logs','created_at'],
  ['activity_logs','created_at'],
  ['persistence_audit','ts'],
  ['persistence_markers','created_at'],
  ['persistence_snapshots','created_at'],
]

function tableExists(db, name) {
  try { return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(name) }
  catch { return false }
}

router.get('/status', async (_req, res) => {
  const db = getDb()
  const storage = getStorageInfo()
  let totalRows = 0
  let tableCount = 0
  try {
    const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all()
    for (const r of rows) {
      tableCount++
      try { totalRows += db.prepare(`SELECT COUNT(*) as c FROM ${r.name}`).get()?.c || 0 } catch {}
    }
  } catch {}

  const last = db.prepare(`SELECT MAX(ts) as last_write FROM persistence_audit`).get()?.last_write || null
  const writes24h = db.prepare(`SELECT COUNT(*) as n FROM persistence_audit WHERE ts > datetime('now','-1 day')`).get()?.n || 0
  const writes7d  = db.prepare(`SELECT COUNT(*) as n FROM persistence_audit WHERE ts > datetime('now','-7 days')`).get()?.n || 0
  const failed24h = db.prepare(`SELECT COUNT(*) as n FROM persistence_audit WHERE ts > datetime('now','-1 day') AND status >= 400`).get()?.n || 0

  const snapshots = listSnapshotFiles()
  const lastSnap = snapshots[0] || null

  const markersTotal = db.prepare(`SELECT COUNT(*) as n FROM persistence_markers`).get()?.n || 0
  const firstMarker  = db.prepare(`SELECT MIN(created_at) as ts FROM persistence_markers`).get()?.ts || null

  const pg = await pgPing()

  res.json({
    storage,
    tables: tableCount,
    total_rows: totalRows,
    last_write: last,
    writes_24h: writes24h,
    writes_7d:  writes7d,
    failed_24h: failed24h,
    snapshots: {
      count: snapshots.length,
      last:  lastSnap,
    },
    markers: { total: markersTotal, first: firstMarker },
    postgres: pg,
    boot_at: process.env.BOOT_TIME || null,
  })
})

router.get('/tables', (_req, res) => {
  const db = getDb()
  const out = []
  for (const [name, tsCol] of TABLES_WITH_TS) {
    if (!tableExists(db, name)) continue
    let rowCount = 0, lastWrite = null
    try { rowCount = db.prepare(`SELECT COUNT(*) as c FROM ${name}`).get()?.c || 0 } catch {}
    try { lastWrite = db.prepare(`SELECT MAX(${tsCol}) as ts FROM ${name}`).get()?.ts || null } catch {}
    out.push({ table: name, rows: rowCount, last_write: lastWrite })
  }
  // Discover any other tables we didn't enumerate above
  try {
    const known = new Set(out.map(r => r.table))
    const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all()
    for (const r of rows) {
      if (known.has(r.name)) continue
      let rowCount = 0
      try { rowCount = db.prepare(`SELECT COUNT(*) as c FROM ${r.name}`).get()?.c || 0 } catch {}
      out.push({ table: r.name, rows: rowCount, last_write: null })
    }
  } catch {}
  out.sort((a, b) => (b.rows - a.rows))
  res.json({ tables: out })
})

router.get('/audit', (req, res) => {
  const { limit = 200, entity_type, action, actor, q } = req.query
  let sql = `SELECT * FROM persistence_audit WHERE 1=1`
  const params = []
  if (entity_type) { sql += ` AND entity_type = ?`; params.push(entity_type) }
  if (action)      { sql += ` AND action = ?`;      params.push(action) }
  if (actor)       { sql += ` AND actor = ?`;       params.push(actor) }
  if (q)           { sql += ` AND (LOWER(route) LIKE ? OR LOWER(diff) LIKE ?)`; const t = `%${String(q).toLowerCase()}%`; params.push(t, t) }
  sql += ` ORDER BY ts DESC LIMIT ?`
  params.push(Math.min(parseInt(limit) || 200, 1000))
  res.json({ entries: getDb().prepare(sql).all(...params) })
})

router.get('/audit/stats', (_req, res) => {
  const db = getDb()
  const perDay = db.prepare(`SELECT date(ts) as day, COUNT(*) as n FROM persistence_audit
    WHERE ts > datetime('now','-30 days') GROUP BY date(ts) ORDER BY day DESC`).all()
  const perAction = db.prepare(`SELECT action, COUNT(*) as n FROM persistence_audit
    WHERE ts > datetime('now','-7 days') GROUP BY action ORDER BY n DESC`).all()
  const perEntity = db.prepare(`SELECT entity_type, COUNT(*) as n FROM persistence_audit
    WHERE ts > datetime('now','-7 days') AND entity_type != '' GROUP BY entity_type ORDER BY n DESC LIMIT 20`).all()
  const failures = db.prepare(`SELECT * FROM persistence_audit WHERE status >= 400
    ORDER BY ts DESC LIMIT 30`).all()
  res.json({ per_day: perDay, per_action: perAction, per_entity: perEntity, recent_failures: failures })
})

router.get('/markers', (_req, res) => {
  const rows = getDb().prepare(`SELECT * FROM persistence_markers ORDER BY created_at DESC LIMIT 200`).all()
  res.json({ markers: rows })
})

router.post('/markers', (req, res) => {
  const { payload = '', kind = 'manual', created_by = '' } = req.body || {}
  const id = uuid()
  getDb().prepare(`INSERT INTO persistence_markers (id, kind, payload, created_by) VALUES (?,?,?,?)`)
    .run(id, kind, String(payload).slice(0, 2000), created_by)
  res.json({ id, created_at: new Date().toISOString() })
})

router.get('/snapshots', (_req, res) => {
  res.json({ snapshots: listSnapshotFiles() })
})

router.post('/snapshots', async (_req, res) => {
  try {
    const r = await takeSnapshot({ trigger: 'manual' })
    res.json(r)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/snapshots/:file', (req, res) => {
  const safe = req.params.file.replace(/[^a-zA-Z0-9._-]/g, '')
  if (!safe.startsWith('cloz-snapshot-') || !safe.endsWith('.json')) {
    return res.status(400).json({ error: 'Invalid backup filename' })
  }
  const dir = path.join(process.env.DATA_DIR || path.dirname(getDbPath()), 'backups')
  const full = path.join(dir, safe)
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Not found' })
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
  fs.createReadStream(full).pipe(res)
})

router.get('/pg', async (_req, res) => {
  res.json({ enabled: PG_ENABLED, ...(await pgPing()) })
})

export default router
