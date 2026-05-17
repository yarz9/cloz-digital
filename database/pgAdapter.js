// database/pgAdapter.js — Postgres adapter scaffold.
//
// STATUS: scaffold only. Not enabled in the live request path.
// Why: ~650 sync `db.prepare(...).get/all/run` call sites across 26
// route files need to become `await` before we can flip the runtime
// default. That refactor is its own focused project.
//
// What this file gives you TODAY:
//   - A real `pg` Pool connecting to DATABASE_URL.
//   - A query helper that mirrors the better-sqlite3-style surface
//     but returns Promises (so consumers can be migrated incrementally).
//   - A migration runner (createTablesIfMissing) that translates the
//     SQLite schema in init.js into PG-compatible CREATE TABLEs.
//   - A `pgPing()` health check used by the persistence dashboard so
//     operators can see PG is reachable without rerouting traffic.
//
// When the route refactor lands, swap getDb() to return the PG-backed
// async wrapper. The audit log, snapshots, and Persistence Center
// already exist and will continue to work.

const ENABLED = !!process.env.DATABASE_URL

let pool = null
let pgModule = null

async function loadPg() {
  if (pgModule) return pgModule
  try {
    pgModule = await import('pg')
    return pgModule
  } catch {
    return null
  }
}

export async function getPool() {
  if (!ENABLED) return null
  if (pool) return pool
  const mod = await loadPg()
  if (!mod) return null
  const { Pool } = mod.default || mod
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: /sslmode=require/i.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  })
  return pool
}

export async function pgQuery(sql, params = []) {
  const p = await getPool()
  if (!p) throw new Error('PG not configured (DATABASE_URL missing)')
  // Translate sqlite-style ? placeholders to $1, $2, ... so existing
  // SQL strings can be reused without rewriting.
  let i = 0
  const pgSql = sql.replace(/\?/g, () => `$${++i}`)
  return p.query(pgSql, params)
}

export async function pgPing() {
  if (!ENABLED) return { configured: false }
  try {
    const p = await getPool()
    if (!p) return { configured: true, ok: false, error: 'pg module not installed' }
    const started = Date.now()
    const r = await p.query('SELECT 1 as ok, now() as ts')
    return {
      configured: true,
      ok: true,
      latency_ms: Date.now() - started,
      server_time: r.rows?.[0]?.ts || null,
    }
  } catch (e) {
    return { configured: true, ok: false, error: e.message }
  }
}

// Promise-returning surface mirroring the sql.js wrapper. Consumers
// migrated route-by-route can do:
//    const db = pgWrapper()
//    const row = await db.prepare(sql).get(args)
export function pgWrapper() {
  return {
    prepare(sql) {
      return {
        async run(...params) {
          const r = await pgQuery(sql, params)
          return { changes: r.rowCount, lastInsertRowid: 0 }
        },
        async get(...params) {
          const r = await pgQuery(sql, params)
          return r.rows[0]
        },
        async all(...params) {
          const r = await pgQuery(sql, params)
          return r.rows
        },
      }
    },
    async exec(sql) {
      const p = await getPool()
      if (!p) throw new Error('PG not configured')
      return p.query(sql)
    },
  }
}

export const PG_ENABLED = ENABLED
