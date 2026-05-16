import fs from 'fs'
import path from 'path'
import { getDbPath } from './init.js'

// ══════════════════════════════════════════════════════════════
//  STORAGE DIAGNOSTICS
//  Reports where the database file lives and warns if running
//  in production without a persistent volume — which is the
//  #1 cause of "my data disappeared after a redeploy" on Railway.
// ══════════════════════════════════════════════════════════════

export function getStorageInfo() {
  const dbPath = getDbPath()
  const dataDir = process.env.DATA_DIR || path.dirname(dbPath)
  const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID)
  const isProduction = process.env.NODE_ENV === 'production'

  let fileExists = false
  let fileSizeBytes = 0
  let lastModified = null
  try {
    const stat = fs.statSync(dbPath)
    fileExists = true
    fileSizeBytes = stat.size
    lastModified = stat.mtime.toISOString()
  } catch {}

  // Heuristic: on Railway, only paths under /data or /mnt are typically volume-mounted.
  // Anything else (like /app or default working dir) is ephemeral.
  const persistentRoots = ['/data', '/mnt', '/var/data', '/persistence']
  const looksPersistent = persistentRoots.some(p => dataDir.startsWith(p))
  const persistent = !!process.env.DATA_DIR && looksPersistent

  const warnings = []
  if (isRailway && isProduction && !persistent) {
    warnings.push(
      'Running on Railway production without a recognized persistent volume path. ' +
      'Set DATA_DIR=/data (or another mounted volume path) in Railway Variables and ' +
      'attach a Volume to this service, otherwise the database file will be wiped on every redeploy.'
    )
  }
  if (!process.env.DATA_DIR) {
    warnings.push('DATA_DIR is not set. Database is being written to the project directory, which is not persistent on most cloud hosts.')
  }

  return {
    dbPath,
    dataDir,
    fileExists,
    fileSizeBytes,
    fileSizeKb: Math.round(fileSizeBytes / 1024),
    lastModified,
    persistent,
    isRailway,
    isProduction,
    warnings,
  }
}

export function logStorageInfo() {
  const info = getStorageInfo()
  console.log('  ─────────────────────────────────────')
  console.log(`  Storage:    ${info.dbPath}`)
  console.log(`  DATA_DIR:   ${info.dataDir}${process.env.DATA_DIR ? '' : ' (default — not persistent on most hosts)'}`)
  console.log(`  File:       ${info.fileExists ? `${info.fileSizeKb} KB · last modified ${info.lastModified}` : 'will be created'}`)
  console.log(`  Persistent: ${info.persistent ? 'yes (mounted volume detected)' : 'unverified'}`)
  if (info.warnings.length > 0) {
    console.log('')
    console.log('  ⚠️  STORAGE WARNINGS')
    info.warnings.forEach(w => console.log(`     • ${w}`))
  }
}
