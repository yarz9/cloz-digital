import { Router } from 'express';
import { testLimiter } from '../middleware/rateLimit.js';
import { getActiveProvider } from '../providers/index.js';
import { getDb } from '../database/init.js';
import { addLog } from './logs.js';

const router = Router();

function getTestConfig() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();
  const config = rows.reduce((o, r) => { o[r.key] = r.value; return o; }, {});
  return {
    temperature: parseFloat(config.temperature) || 0.7,
    maxTokens: parseInt(config.maxTokens) || 2048,
    timeout: parseInt(config.timeout) || 30000,
  };
}

// Test basic connection
router.post('/connection', testLimiter, async (req, res) => {
  try {
    const provider = getActiveProvider();
    const result = await provider.testConnection();
    addLog('info', `Connection test passed (${result.latencyMs}ms)`, JSON.stringify(result));
    res.json(result);
  } catch (e) {
    addLog('error', `Connection test failed: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Test basic prompt
router.post('/basic', testLimiter, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const provider = getActiveProvider();
    const opts = getTestConfig();
    const result = await provider.generate(prompt, opts);
    addLog('info', `Basic test completed (${result.latencyMs}ms, ${result.usage?.totalTokenCount || '?'} tokens)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Basic test failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Test structured output
router.post('/structured', testLimiter, async (req, res) => {
  const { prompt, schema } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const provider = getActiveProvider();
    const opts = getTestConfig();
    const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
    const result = await provider.generateStructured(prompt, parsedSchema, opts);
    const valid = result.data !== null;
    addLog('info', `Structured test completed (valid: ${valid}, ${result.latencyMs}ms)`);
    res.json({ ...result, schemaValid: valid });
  } catch (e) {
    addLog('error', `Structured test failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Test tool calling
router.post('/tools', testLimiter, async (req, res) => {
  const { prompt, toolIds } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const provider = getActiveProvider();
    const opts = getTestConfig();
    const db = getDb();

    let tools;
    if (toolIds && toolIds.length > 0) {
      tools = toolIds.map(id => db.prepare('SELECT * FROM tools WHERE id = ?').get(id)).filter(Boolean).map(t => ({ ...t, parameters: JSON.parse(t.parameters || '{}') }));
    } else {
      tools = db.prepare('SELECT * FROM tools WHERE enabled = 1').all().map(t => ({ ...t, parameters: JSON.parse(t.parameters || '{}') }));
    }

    if (tools.length === 0) return res.status(400).json({ error: 'No tools available. Enable tools first.' });

    const result = await provider.generateWithTools(prompt, tools, opts);
    addLog('info', `Tool test completed (${result.toolCalls?.length || 0} calls, ${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Tool test failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Demo: Lead Analysis
router.post('/demo/lead-analysis', testLimiter, async (req, res) => {
  const { businessName, location, niche, website, rating, reviewCount } = req.body;
  if (!businessName) return res.status(400).json({ error: 'businessName required' });

  try {
    const provider = getActiveProvider();
    const opts = { ...getTestConfig(), temperature: 0.3, task: 'lead-analysis' };
    const db = getDb();

    const template = db.prepare("SELECT * FROM prompts WHERE slug = 'lead-analysis'").get();
    let promptText = template?.body || 'Analyze this business as a potential web design client: {{businessName}}';

    promptText = promptText
      .replace('{{businessName}}', businessName || '')
      .replace('{{location}}', location || 'Unknown')
      .replace('{{niche}}', niche || 'General')
      .replace('{{website}}', website || 'None')
      .replace('{{rating}}', rating || 'N/A')
      .replace('{{reviewCount}}', reviewCount || '0');

    const schemaRow = db.prepare("SELECT schema FROM schemas WHERE category = 'scout' LIMIT 1").get();
    const schema = schemaRow ? JSON.parse(schemaRow.schema) : undefined;

    let result;
    if (schema) {
      result = await provider.generateStructured(promptText, schema, opts);
    } else {
      result = await provider.generate(promptText, opts);
    }

    addLog('info', `Lead analysis demo completed for "${businessName}" (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Lead analysis demo failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Demo: Proposal Draft
router.post('/demo/proposal', testLimiter, async (req, res) => {
  const { clientName, businessType, package: pkg, scope, budget } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });

  try {
    const provider = getActiveProvider();
    const opts = { ...getTestConfig(), temperature: 0.5, task: 'proposal-draft' };
    const db = getDb();

    const template = db.prepare("SELECT * FROM prompts WHERE slug = 'proposal-draft'").get();
    let promptText = template?.body || 'Draft a proposal for {{clientName}}';

    promptText = promptText
      .replace('{{clientName}}', clientName || '')
      .replace('{{businessType}}', businessType || 'General')
      .replace('{{package}}', pkg || 'Growth Care')
      .replace('{{scope}}', scope || 'Website design and development')
      .replace('{{budget}}', budget || 'To be discussed');

    const result = await provider.generate(promptText, opts);
    addLog('info', `Proposal draft demo completed for "${clientName}" (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Proposal draft demo failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Demo: Client Summary
router.post('/demo/client-summary', testLimiter, async (req, res) => {
  const { clientName, package: pkg, mrr, since, healthScore, notes } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });

  try {
    const provider = getActiveProvider();
    const opts = { ...getTestConfig(), temperature: 0.4, task: 'client-summary' };
    const db = getDb();

    const template = db.prepare("SELECT * FROM prompts WHERE slug = 'client-summary'").get();
    let promptText = template?.body || 'Summarize client relationship for {{clientName}}';

    promptText = promptText
      .replace('{{clientName}}', clientName || '')
      .replace('{{package}}', pkg || 'Presence Care')
      .replace('{{mrr}}', mrr || '200')
      .replace('{{since}}', since || '2025-01')
      .replace('{{healthScore}}', healthScore || '85')
      .replace('{{editsUsed}}', '2')
      .replace('{{editsTotal}}', '4')
      .replace('{{openInvoices}}', '0')
      .replace('{{notes}}', notes || 'No recent notes');

    const result = await provider.generate(promptText, opts);
    addLog('info', `Client summary demo completed for "${clientName}" (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Client summary demo failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

export default router;
