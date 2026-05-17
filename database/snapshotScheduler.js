// database/snapshotScheduler.js — Periodic JSON backups of the entire
// database, written to ${DATA_DIR}/backups/. Idempotent file naming
// (one per day), pruned to last N days. Manual + scheduled triggers.

import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb, getDbPath } from './init.js'

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10)
const INTERVAL_MS    = parseInt(process.env.BACKUP_INTERVAL_MS || String(24 * 3600 * 1000), 10)
const ENABLED        = String(process.env.BACKUPS_ENABLED ?? '1') !== '0'

function backupsDir() {
  const dataDir = process.env.DATA_DIR || path.dirname(getDbPath())
  const dir = path.join(dataDir, 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// All tables we know about for the dump. Mirrors routes/adminData.js
// but we discover from sqlite_master to stay future-proof.
function listTables(db) {
  try {
    return db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'persistence_audit' AND name != 'persistence_snapshots' ORDER BY name`).all().map(r => r.name)
  } catch { return [] }
}

export async function takeSnapshot({ trigger = 'scheduled' } = {}) {
  const db = getDb()
  const dir = backupsDir()
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const file = path.join(dir, `cloz-snapshot-${date}.json`)
  let ok = true, error = ''
  let totalRows = 0
  const tables = listTables(db)
  const dump = {
    exported_at: new Date().toISOString(),
    schema_version: 1,
    trigger,
    tables: {},
  }
  try {
    for (const t of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${t}`).all()
        dump.tables[t] = rows
        totalRows += rows.length
      } catch (e) {
        dump.tables[t] = { __error: e.message }
      }
    }
    dump.summary = { tables: Object.keys(dump.tables).length, rows: totalRows }
    fs.writeFileSync(file, JSON.stringify(dump))
  } catch (e) {
    ok = false; error = e.message
  }

  const bytes = ok ? fs.statSync(file).size : 0
  try {
    db.prepare(`INSERT INTO persistence_snapshots (id, path, bytes, table_count, row_count, trigger, ok, error) VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), file, bytes, tables.length, totalRows, trigger, ok ? 1 : 0, error)
  } catch {}

  pruneOldSnapshots(dir)

  return { ok, file, bytes, tables: tables.length, rows: totalRows, error }
}

function pruneOldSnapshots(dir) {
  try {
    const files = fs.readdirSync(dir).filter(f => f.startsWith('cloz-snapshot-') && f.endsWith('.json'))
    const cutoffMs = Date.now() - RETENTION_DAYS * 86400000
    for (const f of files) {
      const stat = fs.statSync(path.join(dir, f))
      if (stat.mtimeMs < cutoffMs) {
        try { fs.unlinkSync(path.join(dir, f)) } catch {}
      }
    }
  } catch {}
}

export function listSnapshotFiles() {
  try {
    const dir = backupsDir()
    return fs.readdirSync(dir)
      .filter(f => f.startsWith('cloz-snapshot-') && f.endsWith('.json'))
      .map(f => {
        const p = path.join(dir, f)
        const stat = fs.statSync(p)
        return {
          file: f, path: p, bytes: stat.size, kb: Math.round(stat.size / 1024),
          modified: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => b.modified.localeCompare(a.modified))
  } catch { return [] }
}

let timer = null
export function startSnapshotScheduler() {
  if (!ENABLED) {
    console.log('  Backups:    disabled (BACKUPS_ENABLED=0)')
    return
  }
  if (timer) return
  // One snapshot at boot (so we always have a fresh baseline), then daily.
  setTimeout(async () => {
    try {
      const r = await takeSnapshot({ trigger: 'boot' })
      if (r.ok) console.log(`  Backups:    initial snapshot ok — ${r.tables} tables · ${r.rows} rows · ${Math.round(r.bytes/1024)} KB`)
      else      console.error(`  Backups:    initial snapshot FAILED — ${r.error}`)
    } catch (e) { console.error('  Backups: initial snapshot threw —', e.message) }
  }, 5000)
  timer = setInterval(() => {
    takeSnapshot({ trigger: 'scheduled' }).catch(() => {})
  }, INTERVAL_MS)
  console.log(`  Backups:    scheduled every ${Math.round(INTERVAL_MS/3600000)}h, retain ${RETENTION_DAYS} days`)
}
