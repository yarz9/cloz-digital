import { Router } from 'express';
import { getDb } from '../database/init.js';
import { log, logInfo, extractRequestContext } from '../services/logger.js';
import { getActiveProvider } from '../providers/index.js';

const router = Router();

// ══════════════════════════════════════════════════════════════
//  GET /api/activity-logs — List with search, filters, pagination
// ══════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const {
      level, category, event_type, search, entity_type, entity_id,
      from, to, success, limit = 100, offset = 0, sort = 'desc',
    } = req.query;

    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];

    if (level) { sql += ' AND level = ?'; params.push(level); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (event_type) { sql += ' AND event_type = ?'; params.push(event_type); }
    if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
    if (entity_id) { sql += ' AND entity_id = ?'; params.push(entity_id); }
    if (success === '0' || success === 'false') { sql += ' AND success = 0'; }
    if (success === '1' || success === 'true') { sql += ' AND success = 1'; }
    if (from) { sql += ' AND timestamp >= ?'; params.push(from); }
    if (to) { sql += ' AND timestamp <= ?'; params.push(to); }
    if (search) {
      sql += ' AND (message LIKE ? OR title LIKE ? OR details LIKE ? OR action LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    // Count total
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const total = db.prepare(countSql).get(...params)?.total || 0;

    // Sort + paginate
    sql += ` ORDER BY timestamp ${sort === 'asc' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(sql).all(...params);

    // Parse details JSON
    const parsed = logs.map(l => ({
      ...l,
      details: safeJsonParse(l.details),
    }));

    res.json({ logs: parsed, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  GET /api/activity-logs/:id — Single log detail
// ══════════════════════════════════════════════════════════════

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const entry = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Log entry not found' });
    res.json({ ...entry, details: safeJsonParse(entry.details) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/activity-logs/event — Client-side event logging
// ══════════════════════════════════════════════════════════════

router.post('/event', (req, res) => {
  try {
    const { level, category, event_type, action, title, message, details, entity_type, entity_id } = req.body;
    const context = extractRequestContext(req);

    log({
      level: level || 'info',
      category: category || 'ui',
      event_type: event_type || 'ui_event',
      action: action || '',
      title: title || '',
      message: message || action || 'UI event',
      details: details || {},
      entity_type: entity_type || '',
      entity_id: entity_id || '',
      ...context,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════���══════════
//  GET /api/activity-logs/stats — Dashboard statistics
// ══════════════════════════════════════════════════════════════

router.get('/overview/stats', (_req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const stats = {
      total: db.prepare('SELECT COUNT(*) as c FROM activity_logs').get()?.c || 0,
      today: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE timestamp LIKE ?").get(`${today}%`)?.c || 0,
      errors: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE level IN ('error','critical')").get()?.c || 0,
      errorsToday: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE level IN ('error','critical') AND timestamp LIKE ?").get(`${today}%`)?.c || 0,
      warnings: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE level = 'warning'").get()?.c || 0,
      security: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE level = 'security'").get()?.c || 0,
      aiOperations: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE category = 'ai'").get()?.c || 0,
      aiToday: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE category = 'ai' AND timestamp LIKE ?").get(`${today}%`)?.c || 0,
      mailActivity: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE category = 'mail'").get()?.c || 0,
      mailToday: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE category = 'mail' AND timestamp LIKE ?").get(`${today}%`)?.c || 0,
      apiRequests: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE event_type = 'api_request'").get()?.c || 0,
      apiToday: db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE event_type = 'api_request' AND timestamp LIKE ?").get(`${today}%`)?.c || 0,
    };

    // By level distribution
    const byLevel = db.prepare("SELECT level, COUNT(*) as count FROM activity_logs GROUP BY level").all();

    // By category distribution
    const byCategory = db.prepare("SELECT category, COUNT(*) as count FROM activity_logs GROUP BY category ORDER BY count DESC LIMIT 10").all();

    // Recent errors
    const recentErrors = db.prepare("SELECT id, timestamp, level, category, message, action FROM activity_logs WHERE level IN ('error','critical') ORDER BY timestamp DESC LIMIT 5").all();

    // Hourly activity (last 24h)
    const hourlyActivity = db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM activity_logs WHERE timestamp >= datetime('now', '-24 hours')
      GROUP BY hour ORDER BY hour
    `).all();

    res.json({ stats, byLevel, byCategory, recentErrors, hourlyActivity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  GET /api/activity-logs/export — Export logs as JSON
// ══════════════════════════════════════════════════════════════

router.get('/export/json', (req, res) => {
  try {
    const db = getDb();
    const { from, to, level, category, limit = 10000 } = req.query;

    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    if (from) { sql += ' AND timestamp >= ?'; params.push(from); }
    if (to) { sql += ' AND timestamp <= ?'; params.push(to); }
    if (level) { sql += ' AND level = ?'; params.push(level); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    const logs = db.prepare(sql).all(...params);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cloz-logs-${new Date().toISOString().slice(0,10)}.json"`);
    res.json({ exported_at: new Date().toISOString(), count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/activity-logs/prune — Delete old logs
// ══════════════════════════════════════════════════════════════

router.post('/prune', (req, res) => {
  try {
    const db = getDb();
    const { days = 90, level } = req.body;

    let sql = `DELETE FROM activity_logs WHERE timestamp < datetime('now', '-${parseInt(days)} days')`;
    if (level) sql += ` AND level = '${level}'`;

    db.prepare(sql).run();
    const remaining = db.prepare('SELECT COUNT(*) as c FROM activity_logs').get()?.c || 0;

    logInfo(`Logs pruned: removed entries older than ${days} days`, { category: 'system', action: 'logs_prune' });
    res.json({ pruned: true, days, remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/activity-logs/clear — Clear all logs
// ══════════════════════════════════════════════════════════════

router.post('/clear', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM activity_logs').run();
    db.prepare('DELETE FROM logs').run();
    res.json({ cleared: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/activity-logs/analyze — AI analysis of recent logs
// ══════════════════════════════════════════════════════════════

router.post('/analyze', async (req, res) => {
  try {
    const db = getDb();
    const { hours = 24 } = req.body;

    // Gather recent log summary
    const since = `datetime('now', '-${parseInt(hours)} hours')`;
    const totalCount = db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE timestamp >= ${since}`).get()?.c || 0;
    const errorCount = db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE level IN ('error','critical') AND timestamp >= ${since}`).get()?.c || 0;
    const warningCount = db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE level = 'warning' AND timestamp >= ${since}`).get()?.c || 0;
    const securityCount = db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE level = 'security' AND timestamp >= ${since}`).get()?.c || 0;
    const aiCount = db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE category = 'ai' AND timestamp >= ${since}`).get()?.c || 0;
    const mailCount = db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE category = 'mail' AND timestamp >= ${since}`).get()?.c || 0;

    const recentErrors = db.prepare(`SELECT message, action, timestamp FROM activity_logs WHERE level IN ('error','critical') AND timestamp >= ${since} ORDER BY timestamp DESC LIMIT 10`).all();
    const securityEvents = db.prepare(`SELECT message, action, ip_address, timestamp FROM activity_logs WHERE level = 'security' AND timestamp >= ${since} ORDER BY timestamp DESC LIMIT 10`).all();
    const categories = db.prepare(`SELECT category, COUNT(*) as count FROM activity_logs WHERE timestamp >= ${since} GROUP BY category ORDER BY count DESC`).all();

    const prompt = `You are an AI operations analyst for Cloz Digital, a web design agency platform.

Analyze these operational logs from the last ${hours} hours and provide an executive summary.

LOG SUMMARY:
- Total events: ${totalCount}
- Errors/Critical: ${errorCount}
- Warnings: ${warningCount}
- Security events: ${securityCount}
- AI operations: ${aiCount}
- Email activity: ${mailCount}

CATEGORY DISTRIBUTION:
${categories.map(c => `  ${c.category}: ${c.count}`).join('\n')}

RECENT ERRORS:
${recentErrors.map(e => `  [${e.timestamp}] ${e.message}`).join('\n') || '  None'}

SECURITY EVENTS:
${securityEvents.map(s => `  [${s.timestamp}] ${s.message} (IP: ${s.ip_address || 'unknown'})`).join('\n') || '  None'}

Provide a structured analysis with actionable insights.`;

    const schema = {
      type: 'object',
      properties: {
        executiveBrief: { type: 'string', description: '2-3 sentence executive summary' },
        healthScore: { type: 'number', description: 'Overall system health 0-100' },
        criticalIssues: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        aiUsage: { type: 'object', properties: { total: { type: 'number' }, note: { type: 'string' } } },
        emailPerformance: { type: 'object', properties: { total: { type: 'number' }, note: { type: 'string' } } },
        securityAlerts: { type: 'array', items: { type: 'string' } },
        recommendedActions: { type: 'array', items: { type: 'string' } },
        trendAnalysis: { type: 'string' },
      },
      required: ['executiveBrief', 'healthScore', 'criticalIssues', 'recommendedActions'],
    };

    const provider = getActiveProvider();
    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.3,
      maxTokens: 2048,
      task: 'summarize',
    });

    res.json({ analysis: result.data, model: result.model, period: `${hours}h` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function safeJsonParse(str) {
  try { return JSON.parse(str || '{}'); } catch { return str || {}; }
}

export default router;
