#!/usr/bin/env node
// scripts/migrate-to-pg.js
// One-shot data move from the live sql.js file at ${DATA_DIR}/cloz-admin.db
// to the PostgreSQL instance specified by DATABASE_URL.
//
// SAFE BY DESIGN:
//  - Idempotent: inserts skip rows whose primary key already exists.
//  - Read-only against SQLite (we never modify the source).
//  - You can run it as many times as you want.
//  - Run with --dry to see counts without writing.
//
// Usage:
//   DATABASE_URL=postgres://... DATA_DIR=/data node scripts/migrate-to-pg.js
//   DATABASE_URL=postgres://... node scripts/migrate-to-pg.js --dry

import { initDatabase, getDb } from '../database/init.js'
import { getPool, PG_ENABLED } from '../database/pgAdapter.js'

const DRY = process.argv.includes('--dry')

// SQLite -> Postgres type hints when the destination table doesn't exist.
// We try to be safe and use TEXT for everything except obvious INT/REAL.
function pgTypeFor(value) {
  if (value === null || value === undefined) return 'TEXT'
  if (typeof value === 'number') return Number.isInteger(value) ? 'BIGINT' : 'DOUBLE PRECISION'
  if (typeof value === 'boolean') return 'BOOLEAN'
  return 'TEXT'
}

async function ensureTableMatches(pool, table, sampleRow) {
  // Create the table if missing, using sampleRow column inference.
  // If the table exists we trust the existing schema and only add
  // missing columns (no destructive ALTERs).
  const cols = Object.keys(sampleRow)
  if (cols.length === 0) return

  const exists = await pool.query(
    `SELECT to_regclass($1) as t`, [`public."${table}"`]
  )
  if (!exists.rows[0].t) {
    const defs = cols.map(c => `"${c}" ${pgTypeFor(sampleRow[c])}`).join(', ')
    const pk = cols.includes('id') ? ', PRIMARY KEY ("id")' : ''
    const sql = `CREATE TABLE "${table}" (${defs}${pk})`
    if (DRY) console.log('  [dry] CREATE', table)
    else await pool.query(sql)
  } else {
    // Add any new columns the source has and the destination doesn't
    const existing = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [table]
    )
    const have = new Set(existing.rows.map(r => r.column_name))
    for (const c of cols) {
      if (!have.has(c)) {
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${c}" ${pgTypeFor(sampleRow[c])}`
        if (DRY) console.log('  [dry] ALTER', table, c)
        else await pool.query(sql)
      }
    }
  }
}

async function copyTable(pool, sqlite, table) {
  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
  if (!rows.length) return { table, copied: 0, skipped: 0, errors: 0 }
  await ensureTableMatches(pool, table, rows[0])

  let copied = 0, skipped = 0, errors = 0
  for (const row of rows) {
    const cols = Object.keys(row)
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
    const colList = cols.map(c => `"${c}"`).join(',')
    const values = cols.map(c => row[c])
    const conflict = cols.includes('id') ? `ON CONFLICT ("id") DO NOTHING` : ''
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflict}`
    if (DRY) { copied++; continue }
    try {
      const r = await pool.query(sql, values)
      if (r.rowCount === 0) skipped++
      else copied++
    } catch (e) {
      errors++
      if (errors <= 3) console.error(`  ✗ ${table}:`, e.message)
    }
  }
  return { table, copied, skipped, errors }
}

async function main() {
  if (!PG_ENABLED) {
    console.error('DATABASE_URL is not set. Aborting.')
    process.exit(1)
  }
  console.log(`Migrating SQLite → Postgres ${DRY ? '(dry run)' : ''}`)

  await initDatabase()
  const sqlite = getDb()
  const pool = await getPool()
  if (!pool) {
    console.error('Could not initialise PG pool. Is the `pg` package installed?')
    process.exit(1)
  }

  const tables = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  ).all().map(r => r.name)

  console.log(`Found ${tables.length} tables in SQLite.`)
  const results = []
  for (const t of tables) {
    try {
      const r = await copyTable(pool, sqlite, t)
      console.log(`  ${t.padEnd(30)} → copied ${String(r.copied).padStart(5)} · skipped ${String(r.skipped).padStart(5)} · errors ${r.errors}`)
      results.push(r)
    } catch (e) {
      console.error(`  ${t}: FATAL`, e.message)
      results.push({ table: t, copied: 0, skipped: 0, errors: 1 })
    }
  }
  const total = results.reduce((s, r) => ({ copied: s.copied + r.copied, skipped: s.skipped + r.skipped, errors: s.errors + r.errors }), { copied: 0, skipped: 0, errors: 0 })
  console.log('')
  console.log(`Done. ${total.copied} copied · ${total.skipped} skipped (already present) · ${total.errors} errors.`)
  process.exit(total.errors > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
