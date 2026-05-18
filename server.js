import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// ── Environment validation ──
const REQUIRED_ENV = ['ADMIN_PASSWORD', 'CEREBRAS_API_KEY'];
const missingEnv = REQUIRED_ENV.filter(v => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`\n  ✗ Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('    Set them in .env (local) or Railway dashboard (production).\n');
  process.exit(1);
}

import { initDatabase } from './database/init.js';
import { getDbPath } from './database/init.js';
import { seedDefaults } from './database/seeds.js';
import { auth } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { getActiveProvider } from './providers/index.js';
import { resolveModel } from './providers/models.js';
import configRoutes from './routes/config.js';
import healthRoutes from './routes/health.js';
import logRoutes from './routes/logs.js';
import promptRoutes from './routes/prompts.js';
import featureRoutes from './routes/features.js';
import testRoutes from './routes/test.js';
import toolRoutes from './routes/tools.js';
import schemaRoutes from './routes/schemas.js';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import auditRoutes from './routes/audit.js';
import scoutRoutes from './routes/scout.js';
import mailRoutes from './routes/mail.js';
import managementAuthRoutes from './routes/managementAuth.js';
import mailAccountRoutes from './routes/mailAccounts.js';
import { seedMailAccounts } from './routes/mailAccounts.js';
import { startSyncWorker, startSendQueueProcessor } from './services/mailService.js';
import { ensureActivityLogsTable } from './services/logger.js';
import { requestLoggerMiddleware, errorLoggerMiddleware } from './middleware/requestLogger.js';
import activityLogRoutes from './routes/activityLogs.js';
import publicInquiryRoutes from './routes/publicInquiry.js';
import marketingRoutes from './routes/marketing.js';
import portalRoutes from './routes/portal.js';
import portalAdminRoutes from './routes/portalAdmin.js';
import operationsRoutes from './routes/operations.js';
import legalRoutes from './routes/legal.js';
import { seedOps } from './database/seedOps.js';
import { logStorageInfo } from './database/storageInfo.js';
import adminDataRoutes from './routes/adminData.js';
import serviceDeskRoutes from './routes/serviceDesk.js';
import localizationRoutes from './routes/localization.js';
import knowledgeRoutes from './routes/knowledge.js';
import { seedKnowledge } from './database/seedKnowledge.js';
import persistenceRoutes from './routes/persistence.js';
import financeRoutes from './routes/finance.js';
import { auditMiddleware } from './database/auditLog.js';
import { startSnapshotScheduler } from './database/snapshotScheduler.js';
import { getStorageInfo } from './database/storageInfo.js';
import rateLimit from 'express-rate-limit';
import { APP_URL, REDIRECT_HOSTS } from './config/urls.js';

const app = express();
const PORT = process.env.PORT || 3000;
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Trust the Railway proxy so req.protocol + req.hostname reflect the
// real client request, not the internal load balancer.
app.set('trust proxy', 1);

// ── Apex domain redirect ──
// Catches the www subdomain (and any host registered in REDIRECT_HOSTS)
// and 301s to the canonical apex. Prevents DNS_PROBE_FINISHED_NXDOMAIN
// style failures when users hit an unregistered subdomain.
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  if (REDIRECT_HOSTS.has(host)) {
    return res.redirect(301, `${APP_URL}${req.originalUrl}`);
  }
  next();
});

// ── Request logging middleware ──
app.use(requestLoggerMiddleware);

// ── Persistence audit (records every mutation to persistence_audit) ──
app.use(auditMiddleware);

// ── Standalone health check (Railway uses this) ──
// MUST return 200 with no DB, provider, or any other side-effects.
// Railway polls this URL during deploy to mark the container healthy;
// any throw, slow query, or 503 fails the deployment.
// The richer "deep" health endpoint lives at /api/health and exercises
// the DB + provider once startup is complete.
const bootState = { ready: false, phase: 'starting', error: null, started_at: new Date().toISOString() };
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    ready: bootState.ready,
    phase: bootState.phase,
    version: pkg.version,
    timestamp: new Date().toISOString(),
  });
});

// ── Static file serving ──
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ── Public API (no auth) ──
app.use('/api/auth', authRoutes);
app.use('/api/management/auth', managementAuthRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/audit', apiLimiter, auditRoutes);
app.use('/api/client-scout', apiLimiter, scoutRoutes);
app.use('/api/mail/accounts', apiLimiter, mailAccountRoutes);
app.use('/api/mail', apiLimiter, mailRoutes);
app.use('/api/activity-logs', apiLimiter, activityLogRoutes);
app.use('/api/marketing', apiLimiter, marketingRoutes);
app.use('/api/admin/data', apiLimiter, adminDataRoutes);
app.use('/api/portal', apiLimiter, portalRoutes);
app.use('/api/portal-admin', apiLimiter, portalAdminRoutes);
app.use('/api/operations', apiLimiter, operationsRoutes);
app.use('/api/legal', apiLimiter, legalRoutes);
app.use('/api/service-desk', apiLimiter, serviceDeskRoutes);
app.use('/api/localization', apiLimiter, localizationRoutes);
app.use('/api/knowledge', apiLimiter, knowledgeRoutes);
app.use('/api/persistence', apiLimiter, persistenceRoutes);
app.use('/api/finance', apiLimiter, financeRoutes);

// ── Public inquiry endpoint: stricter rate limit to deter abuse ──
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many submissions from this address. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/public/inquiry', inquiryLimiter, publicInquiryRoutes);

app.use('/api/health', healthRoutes);

// ── Admin API (auth required for config changes) ──
app.use('/api/config', configRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/test', testRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/schemas', schemaRoutes);

// ── SPA fallback ──
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <html><body style="background:#0B0B0D;color:#F5F5F7;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
        <div style="text-align:center">
          <h1 style="font-size:24px;margin-bottom:8px">Cloz Digital</h1>
          <p style="color:#A1A1AA;font-size:14px">Run <code style="background:#18181C;padding:2px 6px;border-radius:4px">npm run build</code> to build the frontend.</p>
          <p style="color:#52525B;font-size:12px;margin-top:16px">Or use <code style="background:#18181C;padding:2px 6px;border-radius:4px">npm run dev:client</code> for development.</p>
        </div>
      </body></html>
    `);
  }
});

// ── Error logging middleware ──
app.use(errorLoggerMiddleware);

// ── Error handler ──
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Process-level error handling ──
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled rejection:', reason);
});

// ── Persistence guard: WARN (do not exit) when running in production
//    without a recognised persistent volume. Previously this called
//    process.exit(1), which crashed Railway containers before they
//    could respond to /health on the first deploy of a project that
//    hadn't yet been configured with DATA_DIR=/data + a mounted Volume.
//    The Persistence Center UI surfaces the same state for the
//    operator, so a noisy log + non-blocking startup is the right
//    trade-off.
//
//    Hard-fail can be re-enabled by setting REQUIRE_PERSISTENT_STORAGE=1.
function checkPersistence() {
  const info = getStorageInfo();
  if (!info.isProduction || !info.isRailway || info.persistent) return { ok: true };

  console.error('');
  console.error('  ⚠️  PERSISTENCE WARNING — ephemeral storage detected');
  console.error('     The database file is being written to:');
  console.error(`       ${info.dbPath}`);
  console.error('     This path will be wiped on the next Railway redeploy.');
  console.error('     To fix:');
  console.error('       1) Railway → Settings → Volumes → add a Volume mounted at /data');
  console.error('       2) Railway → Variables → set DATA_DIR=/data');
  console.error('       3) Redeploy.');
  console.error('');

  if (process.env.REQUIRE_PERSISTENT_STORAGE === '1') {
    console.error('  ✗ REQUIRE_PERSISTENT_STORAGE=1 set — exiting.');
    console.error('');
    process.exit(1);
  }
  return { ok: false, warning: 'ephemeral' };
}

// Wrap a phase so a single failure doesn't kill the whole boot.
// Logs explicitly; updates bootState so /health surfaces the phase.
function phase(name, fn) {
  bootState.phase = name;
  const started = Date.now();
  try {
    const result = fn();
    console.log(`  ✓ ${name.padEnd(28)} ${Date.now() - started}ms`);
    return { ok: true, result };
  } catch (err) {
    console.error(`  ✗ ${name.padEnd(28)} FAILED — ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    return { ok: false, error: err };
  }
}

// ── Boot ──
// CRITICAL ORDER: bind the port FIRST so Railway's /health probe gets
// 200 immediately. Then run database init + seeders + workers in the
// background. Until the background init completes, /health reports
// status: ok + ready: false + phase: <current phase> so an operator
// can tell whether the server is healthy at the network level vs. at
// the application level.
//
// If init crashes, /health still returns 200 (the process keeps
// running) — actual route handlers will return their own errors when
// hit. Better than the container dying and Railway looping into
// failed-deploy hell.
(async () => {
  process.env.BOOT_TIME = new Date().toISOString();

  // 1. Bind the port FIRST. /health is registered above this in the
  //    request pipeline, so it will respond as soon as Express is
  //    listening — irrespective of DB init progress.
  app.listen(PORT, () => {
    console.log(`\n  Cloz Digital v${pkg.version}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Port:       ${PORT}  (listening — /health is live)`);
    console.log(`  Env:        ${process.env.NODE_ENV || 'development'}`);
    console.log(`  ─────────────────────────────────────`);
  });

  // 2. Soft persistence check — warn, don't crash.
  checkPersistence();

  // 3. Database init.
  let db;
  try {
    bootState.phase = 'initDatabase';
    const started = Date.now();
    db = await initDatabase();
    console.log(`  ✓ initDatabase                ${Date.now() - started}ms`);
    console.log(`  Database:   ${getDbPath()}`);
  } catch (err) {
    console.error('  ✗ initDatabase                FAILED —', err.message);
    console.error(err.stack);
    bootState.error = err.message;
    bootState.phase = 'failed:initDatabase';
    return; // server stays up; /health still returns ok+ready:false
  }

  // 4. Seeders + table ensures — each isolated so one failure can't
  //    block the rest. Order matters only for activity_logs (logger
  //    middleware writes to it), which we do first.
  phase('ensureActivityLogsTable', () => ensureActivityLogsTable(db));
  phase('seedDefaults',            () => seedDefaults(db));
  phase('seedMailAccounts',        () => seedMailAccounts(db));
  phase('seedOps',                 () => seedOps(db));
  phase('seedKnowledge',           () => seedKnowledge(db));

  // 5. One-off cleanup (pre-canonical-URL magic links).
  phase('expirePreFixMagicLinks',  () => {
    const cutoff = '2026-05-16T00:00:00';
    const result = db.prepare(`UPDATE portal_magic_links SET consumed_at = datetime('now') WHERE consumed_at = '' AND created_at < ?`).run(cutoff);
    if (result.changes > 0) {
      console.log(`     · invalidated ${result.changes} pre-fix portal magic link(s)`);
    }
  });

  // 6. Background workers. Failures here are non-fatal — the API
  //    continues serving without IMAP sync / outbound mail / snapshots.
  phase('startSyncWorker',          () => startSyncWorker());
  phase('startSendQueueProcessor',  () => startSendQueueProcessor());
  phase('startSnapshotScheduler',   () => startSnapshotScheduler());

  // 7. Provider warm-up — for the startup banner only. Not required
  //    for /health; provider lazy-initialises on first /api request.
  let providerInfo = '(not initialised)';
  try {
    const provider = getActiveProvider();
    const defaultModel = resolveModel('generate');
    providerInfo = `cerebras · ${defaultModel} · ${provider.getMaskedKey()}`;
  } catch (e) {
    console.error('  ⚠ provider warm-up skipped —', e.message);
  }

  bootState.ready = true;
  bootState.phase = 'ready';
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Provider:   ${providerInfo}`);
  console.log(`  Boot:       ${Math.round((Date.now() - new Date(bootState.started_at).getTime()) / 1000)}s`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  → App:      http://localhost:${PORT}/`);
  console.log(`  → Admin:    http://localhost:${PORT}/admin`);
  console.log(`  → Health:   http://localhost:${PORT}/health`);
  console.log(`  → API:      http://localhost:${PORT}/api/health`);
  try { logStorageInfo() } catch {}
  console.log('');
})().catch(err => {
  // Outer-level safety net — should never fire now that each phase
  // is wrapped, but keeps us alive even if the IIFE itself throws.
  console.error('[Fatal] Boot IIFE threw —', err);
  bootState.error = err.message;
  bootState.phase = 'failed:boot';
});
