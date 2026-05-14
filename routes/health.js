import { Router } from 'express';
import { getDb } from '../database/init.js';
import { getActiveProvider, listProviders } from '../providers/index.js';
import { listModelConfig } from '../providers/models.js';

const router = Router();

router.get('/', (req, res) => {
  const checks = [];

  // API Key
  try {
    const p = getActiveProvider();
    checks.push({ name: 'API Key', status: p.hasApiKey() ? 'ok' : 'fail', detail: p.hasApiKey() ? `${p.getKeySource()} (${p.getMaskedKey()})` : 'Not configured' });
  } catch (e) { checks.push({ name: 'API Key', status: 'fail', detail: e.message }); }

  // Env vars
  const missing = ['ADMIN_PASSWORD'].filter(v => !process.env[v]);
  checks.push({ name: 'Environment', status: missing.length ? 'warning' : 'ok', detail: missing.length ? `Missing: ${missing.join(', ')}` : 'All set' });

  // Database
  try {
    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    const expected = ['config', 'prompts', 'features', 'tools', 'logs', 'schemas'];
    const m = expected.filter(t => !tables.includes(t));
    checks.push({ name: 'Database', status: m.length ? 'fail' : 'ok', detail: m.length ? `Missing: ${m.join(', ')}` : `${expected.length} tables OK` });
  } catch (e) { checks.push({ name: 'Database', status: 'fail', detail: e.message }); }

  // Providers
  try {
    const p = listProviders();
    checks.push({ name: 'Providers', status: 'ok', detail: `${p.length} loaded: ${p.map(x => x.key).join(', ')}` });
  } catch (e) { checks.push({ name: 'Providers', status: 'fail', detail: e.message }); }

  // Prompts
  try {
    const c = getDb().prepare('SELECT COUNT(*) as c FROM prompts').get().c;
    checks.push({ name: 'Prompts', status: c > 0 ? 'ok' : 'warning', detail: `${c} template(s)` });
  } catch (e) { checks.push({ name: 'Prompts', status: 'fail', detail: e.message }); }

  // Node
  checks.push({ name: 'Node.js', status: parseInt(process.version.slice(1)) >= 18 ? 'ok' : 'warning', detail: process.version });

  // Model routing
  const models = listModelConfig();
  const uniqueModels = [...new Set(Object.values(models))];
  checks.push({ name: 'Model Routing', status: 'ok', detail: `${Object.keys(models).length} groups, ${uniqueModels.length} model(s): ${uniqueModels.join(', ')}` });

  res.json({ ready: checks.every(c => c.status !== 'fail'), checks });
});

export default router;
