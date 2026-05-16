// routes/adminData.js — Storage diagnostics + JSON backup/restore
// Use to verify persistence on Railway, and to manually back up data.

import { Router } from 'express'
import fs from 'fs'
import { getDb, getDbPath } from '../database/init.js'
import { getStorageInfo } from '../database/storageInfo.js'
import { logInfo, logError } from '../services/logger.js'

const router = Router()

// ── /api/admin/storage — diagnostic info about the database file ──
router.get('/storage', (_req, res) => {
  res.json(getStorageInfo())
})

// ── List of tables we know about ──
// Order matters for restore (parents before children for FK-safety).
const TABLES = [
  'config', 'prompts', 'features', 'tools', 'schemas',
  'mail_accounts', 'mail_messages', 'mail_templates', 'mail_contacts', 'mail_send_queue',
  'client_scout_leads',
  'logs', 'activity_logs',
  'inquiries',
  'sops', 'sop_steps', 'sop_instances', 'sop_instance_steps', 'sop_automations', 'audit_events',
  'legal_templates', 'legal_documents', 'legal_versions', 'cookie_consents', 'privacy_requests',
  'portal_clients', 'portal_magic_links', 'portal_tickets', 'portal_ticket_messages',
  'portal_assets', 'portal_messages', 'portal_invoices', 'portal_maintenance_reports',
  'portal_approvals', 'portal_proposals', 'portal_activity',
]

function tableExists(db, name) {
  try {
    return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(name)
  } catch { return false }
}

// ── /api/admin/export — full JSON dump of every table ──
router.get('/export', (req, res) => {
  const db = getDb()
  const dump = {
    exported_at: new Date().toISOString(),
    version: 1,
    tables: {},
  }
  let totalRows = 0
  for (const t of TABLES) {
    if (!tableExists(db, t)) continue
    try {
      const rows = db.prepare(`SELECT * FROM ${t}`).all()
      dump.tables[t] = rows
      totalRows += rows.length
    } catch (e) {
      dump.tables[t] = { __error: e.message }
    }
  }
  dump.summary = { tables: Object.keys(dump.tables).length, rows: totalRows }
  logInfo(`Data export requested (${totalRows} rows across ${Object.keys(dump.tables).length} tables)`, { category: 'audit', event_type: 'data_export' })

  if (req.query.download === '1') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="cloz-backup-${new Date().toISOString().slice(0, 10)}.json"`)
  }
  res.json(dump)
})

// ── /api/admin/import — append rows from a JSON dump ──
// Defensive: never drops tables, never deletes rows. Inserts rows that don't
// already exist (matched by primary key when present).
router.post('/import', (req, res) => {
  const body = req.body || {}
  if (!body.tables || typeof body.tables !== 'object') {
    return res.status(400).json({ error: 'Body must include a `tables` object (use the /export format)' })
  }

  const db = getDb()
  const results = {}
  let inserted = 0, skipped = 0, errors = 0

  for (const [table, rows] of Object.entries(body.tables)) {
    if (!Array.isArray(rows)) continue
    if (!tableExists(db, table)) {
      results[table] = { skipped: rows.length, error: 'table does not exist in current schema' }
      continue
    }
    let tInserted = 0, tSkipped = 0, tError = 0
    for (const row of rows) {
      if (!row || typeof row !== 'object') { tSkipped++; continue }
      try {
        // Check for existing row by `id` field if present
        if (row.id !== undefined) {
          const existing = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(row.id)
          if (existing) { tSkipped++; continue }
        }
        const cols = Object.keys(row)
        const placeholders = cols.map(() => '?').join(',')
        const values = cols.map(c => row[c])
        db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(...values)
        tInserted++
      } catch (e) {
        tError++
      }
    }
    results[table] = { inserted: tInserted, skipped: tSkipped, errors: tError }
    inserted += tInserted; skipped += tSkipped; errors += tError
  }

  logInfo(`Data import completed: ${inserted} inserted, ${skipped} skipped, ${errors} errors`, { category: 'audit', event_type: 'data_import' })
  res.json({ ok: true, summary: { inserted, skipped, errors }, results })
})

// ── /api/admin/health — quick sanity check ──
router.get('/health', (_req, res) => {
  try {
    const db = getDb()
    const tables = TABLES.filter(t => tableExists(db, t))
    const counts = {}
    for (const t of tables) {
      try {
        counts[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get()?.c || 0
      } catch { counts[t] = -1 }
    }
    const storage = getStorageInfo()
    res.json({
      ok: true,
      storage,
      tables: counts,
      totalRows: Object.values(counts).reduce((s, n) => s + (n > 0 ? n : 0), 0),
    })
  } catch (e) {
    logError(`Admin health check failed: ${e.message}`)
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
