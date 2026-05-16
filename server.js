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

// ── Standalone health check (Railway uses this) ──
app.get('/health', (_req, res) => {
  try {
    const provider = getActiveProvider();
    res.json({
      status: 'ok',
      provider: 'cerebras',
      model: resolveModel('generate'),
      version: pkg.version,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({
      status: 'error',
      error: e.message,
      version: pkg.version,
      timestamp: new Date().toISOString(),
    });
  }
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

// ── Boot ──
(async () => {
  try {
    const db = await initDatabase();
    ensureActivityLogsTable(db);
    seedDefaults(db);
    seedMailAccounts(db);
    seedOps(db);

    // Invalidate any portal magic links issued before the canonical-URL fix.
    // Those emails contained verify URLs on the unregistered subdomain and
    // fail DNS resolution. A fresh sign-in request will issue a new working link.
    try {
      const cutoff = '2026-05-16T00:00:00';
      const result = db.prepare(`UPDATE portal_magic_links SET consumed_at = datetime('now') WHERE consumed_at = '' AND created_at < ?`).run(cutoff);
      if (result.changes > 0) {
        console.log(`[boot] Invalidated ${result.changes} pre-fix portal magic link(s)`);
      }
    } catch {}

    // Start mail background workers
    startSyncWorker();
    startSendQueueProcessor();

    const provider = getActiveProvider();
    const defaultModel = resolveModel('generate');

    app.listen(PORT, () => {
      console.log(`\n  Cloz Digital v${pkg.version} — Production Ready`);
      console.log(`  ─────────────────────────────────────`);
      console.log(`  Port:       ${PORT}`);
      console.log(`  Env:        ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Database:   ${getDbPath()}`);
      console.log(`  Provider:   cerebras`);
      console.log(`  Model:      ${defaultModel}`);
      console.log(`  API Key:    ${provider.getMaskedKey()}`);
      console.log(`  ─────────────────────────────────────`);
      console.log(`  → App:      http://localhost:${PORT}/`);
      console.log(`  → Admin:    http://localhost:${PORT}/admin`);
      console.log(`  → Health:   http://localhost:${PORT}/health`);
      console.log(`  → API:      http://localhost:${PORT}/api/health`);
      logStorageInfo();
      console.log('');
    });
  } catch (err) {
    console.error('\n  ✗ Failed to start Cloz Digital:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
