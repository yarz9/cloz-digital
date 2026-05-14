// routes/scout.js — Client Scout API
// Production lead-generation engine for Cloz Digital

import { Router } from 'express';
import { getActiveProvider } from '../providers/index.js';
import { getDb } from '../database/init.js';
import { addLog } from './logs.js';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ═══════════════════════════════════════════════
// REGION DATA
// ═══════════════════════════════════════════════
const COUNTRIES = {
  bosnia:          { name: 'Bosnia and Herzegovina', code: 'BA', phone: '387', cities: ['Sarajevo','Mostar','Banja Luka','Tuzla','Zenica','Bijeljina','Trebinje','Brčko','Livno','Cazin'] },
  serbia:          { name: 'Serbia',                 code: 'RS', phone: '381', cities: ['Belgrade','Novi Sad','Niš','Kragujevac','Subotica','Čačak','Novi Pazar'] },
  croatia:         { name: 'Croatia',                code: 'HR', phone: '385', cities: ['Zagreb','Split','Rijeka','Osijek','Zadar','Dubrovnik','Pula'] },
  montenegro:      { name: 'Montenegro',             code: 'ME', phone: '382', cities: ['Podgorica','Nikšić','Budva','Bar','Herceg Novi','Kotor'] },
  north_macedonia: { name: 'North Macedonia',        code: 'MK', phone: '389', cities: ['Skopje','Bitola','Kumanovo','Ohrid','Tetovo'] },
  slovenia:        { name: 'Slovenia',               code: 'SI', phone: '386', cities: ['Ljubljana','Maribor','Celje','Kranj','Koper'] },
  kosovo:          { name: 'Kosovo',                 code: 'XK', phone: '383', cities: ['Pristina','Prizren','Peja','Mitrovica','Gjilan'] },
  albania:         { name: 'Albania',                code: 'AL', phone: '355', cities: ['Tirana','Durrës','Vlorë','Shkodër','Elbasan','Korçë'] },
};

const CATEGORIES = [
  'restaurant','cafe','dental clinic','doctor','law firm','real estate agency',
  'beauty salon','auto service','hotel','apartment rental','gym','school',
  'retail store','construction company','local service','photography studio',
  'accounting firm','veterinarian','pharmacy','bakery',
];

const VALID_STATUSES = [
  'new','reviewed','shortlisted','contacted','interested',
  'meeting_scheduled','proposal_sent','won','lost','archived',
];

// ═══════════════════════════════════════════════
// BACKGROUND SCAN ENGINE STATE
// ═══════════════════════════════════════════════
const scanState = {
  running: false,
  paused: false,
  mode: 'auto',
  country: null,
  city: null,
  category: null,
  progress: { scanned: 0, created: 0, duplicates: 0, errors: 0, currentTask: '' },
  startedAt: null,
  queue: [],           // remaining {country, city, category} combos
  _abortCtrl: null,
};

function resetScanState() {
  scanState.running = false;
  scanState.paused = false;
  scanState.progress = { scanned: 0, created: 0, duplicates: 0, errors: 0, currentTask: '' };
  scanState.startedAt = null;
  scanState.queue = [];
  scanState._abortCtrl = null;
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function safeJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function sourceHash(biz) {
  const raw = `${(biz.businessName || '').toLowerCase().trim()}|${(biz.city || '').toLowerCase().trim()}|${(biz.phone || '').replace(/\s/g, '')}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

function isDuplicate(db, biz, city) {
  const hash = sourceHash({ ...biz, city });

  // Check sourceHash
  if (db.prepare('SELECT id FROM client_scout_leads WHERE source_hash = ?').get(hash)) return true;

  // Check phone (if non-empty)
  const phone = (biz.phone || '').replace(/\s/g, '');
  if (phone.length > 5 && db.prepare('SELECT id FROM client_scout_leads WHERE REPLACE(phone, " ", "") = ?').get(phone)) return true;

  // Check websiteUrl
  if (biz.websiteUrl && db.prepare('SELECT id FROM client_scout_leads WHERE website_url = ? AND website_url != ""').get(biz.websiteUrl)) return true;

  return false;
}

function getModeInstruction(mode) {
  const m = {
    no_website:      'Focus on businesses that are UNLIKELY to have a website. Prioritize smaller local businesses, family-run places, traditional establishments. Set hasWebsite=false for most.',
    worst_websites:  'Focus on businesses likely to have cheap, outdated, or broken websites — free builders, old WordPress, abandoned pages. Set hasWebsite=true for most with poor-quality URLs.',
    low_reviews:     'Focus on businesses with low review counts (under 20) or low ratings (under 4.0). Weak online presence overall.',
    high_opportunity:'Focus on clearly established businesses (good ratings, many reviews) but poor or no web presence. Highest-value leads.',
    nearby:          'Focus on businesses in the specific city center area. Include a mix of categories and web-presence quality.',
  };
  return m[mode] || 'Include a realistic mix of businesses — some with websites, some without. Vary quality and establishment level.';
}

// ═══════════════════════════════════════════════
// DISCOVER BUSINESSES (core function)
// ═══════════════════════════════════════════════
async function discoverBusinesses(country, city, category, mode, signal) {
  const countryData = COUNTRIES[country];
  if (!countryData) throw new Error(`Unknown country: ${country}`);

  const provider = getActiveProvider();

  const schema = {
    type: 'object',
    properties: {
      businesses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            businessName: { type: 'string' },
            category: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            websiteUrl: { type: 'string' },
            googleMapsUrl: { type: 'string' },
            rating: { type: 'number' },
            reviewCount: { type: 'number' },
            hasWebsite: { type: 'boolean' },
          },
          required: ['businessName', 'category', 'address', 'hasWebsite'],
        },
      },
    },
    required: ['businesses'],
  };

  const prompt = `You are a business directory researcher for the Balkans region.

Search for real-sounding ${category} businesses in ${city}, ${countryData.name}.

${getModeInstruction(mode)}

Generate 6-10 realistic businesses that would exist in this city. For each:
- Use locally appropriate business names (mix of local language and English)
- Use realistic local phone numbers (country code: +${countryData.phone})
- Vary website presence based on mode
- Use realistic Google ratings (3.0-5.0) and review counts (5-500)
- If they have a website, use realistic local TLD domains (.ba/.rs/.hr/.me/.mk/.si/.al) or .com
- Some should have email addresses, some not
- Include a plausible Google Maps URL (https://maps.google.com/?cid=XXXXXX format)
- Use realistic local street addresses

Be specific and diverse. These should feel like real businesses found through Google Maps.`;

  const result = await provider.generateStructured(prompt, schema, {
    temperature: 0.8,
    maxTokens: 4096,
    timeout: 90000,
    task: 'scout-discovery',
  });

  if (!result.data?.businesses) throw new Error('Failed to generate business data');

  // Save to DB with dedup
  const db = getDb();
  const saved = [];
  let dupCount = 0;

  for (const biz of result.data.businesses) {
    if (signal?.aborted) break;

    if (isDuplicate(db, biz, city)) { dupCount++; continue; }

    const id = uuid();
    const hash = sourceHash({ ...biz, city });

    db.prepare(`INSERT INTO client_scout_leads (
      id, business_name, category, country, country_code, city, address,
      phone, email, website_url, google_maps_url, rating, review_count,
      has_website, source_hash, scouting_mode, status,
      created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))`).run(
      id, biz.businessName, biz.category || category,
      countryData.name, countryData.code, city, biz.address || '',
      biz.phone || '', biz.email || '', biz.websiteUrl || '',
      biz.googleMapsUrl || '', biz.rating || 0, biz.reviewCount || 0,
      biz.hasWebsite ? 1 : 0, hash, mode || 'manual', 'new'
    );

    saved.push({ id, business_name: biz.businessName, category: biz.category || category, city, has_website: !!biz.hasWebsite });
  }

  return { saved, duplicates: dupCount, latencyMs: result.latencyMs };
}

// ═══════════════════════════════════════════════
// BACKGROUND SCAN RUNNER
// ═══════════════════════════════════════════════
async function runScanLoop() {
  while (scanState.queue.length > 0 && scanState.running && !scanState.paused) {
    const job = scanState.queue.shift();
    scanState.progress.currentTask = `${job.category} in ${job.city}, ${COUNTRIES[job.country]?.name || job.country}`;

    try {
      const result = await discoverBusinesses(job.country, job.city, job.category, scanState.mode, scanState._abortCtrl?.signal);
      scanState.progress.scanned++;
      scanState.progress.created += result.saved.length;
      scanState.progress.duplicates += result.duplicates;
    } catch (e) {
      scanState.progress.errors++;
      addLog('error', `Scan error: ${scanState.progress.currentTask} — ${e.message}`);
    }

    // Brief pause between batches to avoid rate limits
    if (scanState.queue.length > 0 && scanState.running) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (scanState.queue.length === 0) {
    scanState.running = false;
    scanState.progress.currentTask = 'Scan complete';
    addLog('info', `Scout scan complete: ${scanState.progress.scanned} batches, ${scanState.progress.created} leads created, ${scanState.progress.duplicates} duplicates skipped`);
  }
}

function buildScanQueue(mode, country, city, category) {
  const queue = [];

  const countries = country ? [country] : Object.keys(COUNTRIES);
  const cats = category ? [category] : CATEGORIES.slice(0, 5); // limit auto to top 5 categories

  for (const c of countries) {
    const data = COUNTRIES[c];
    if (!data) continue;
    const cities = city ? [city] : data.cities.slice(0, 3); // top 3 cities per country
    for (const ci of cities) {
      for (const cat of cats) {
        queue.push({ country: c, city: ci, category: cat });
      }
    }
  }

  return queue;
}

// ═══════════════════════════════════════════════
// POST /scan/start — Start background scan
// ═══════════════════════════════════════════════
router.post('/scan/start', (req, res) => {
  if (scanState.running && !scanState.paused) {
    return res.status(409).json({ error: 'Scan already running' });
  }

  const { mode, country, city, category } = req.body;
  const queue = buildScanQueue(mode || 'auto', country, city, category);

  if (queue.length === 0) {
    return res.status(400).json({ error: 'No scan targets. Provide country/category or use auto mode.' });
  }

  // If resuming paused scan
  if (scanState.paused) {
    scanState.paused = false;
    scanState.running = true;
    runScanLoop();
    addLog('info', 'Scout scan resumed');
    return res.json({ status: 'resumed', remaining: scanState.queue.length });
  }

  resetScanState();
  scanState.running = true;
  scanState.mode = mode || 'auto';
  scanState.country = country || null;
  scanState.city = city || null;
  scanState.category = category || null;
  scanState.startedAt = new Date().toISOString();
  scanState.queue = queue;
  scanState._abortCtrl = new AbortController();

  addLog('info', `Scout scan started: ${queue.length} batches (mode: ${scanState.mode})`);
  runScanLoop();

  res.json({ status: 'started', totalBatches: queue.length, mode: scanState.mode });
});

// ═══════════════════════════════════════════════
// POST /scan/stop — Stop or pause scan
// ═══════════════════════════════════════════════
router.post('/scan/stop', (req, res) => {
  const { pause } = req.body;

  if (!scanState.running) {
    return res.status(400).json({ error: 'No scan running' });
  }

  if (pause) {
    scanState.paused = true;
    addLog('info', 'Scout scan paused');
    res.json({ status: 'paused', remaining: scanState.queue.length, progress: scanState.progress });
  } else {
    scanState.running = false;
    scanState._abortCtrl?.abort();
    addLog('info', 'Scout scan stopped');
    res.json({ status: 'stopped', progress: scanState.progress });
  }
});

// ═══════════════════════════════════════════════
// GET /scan/status — Current scan status
// ═══════════════════════════════════════════════
router.get('/scan/status', (_req, res) => {
  res.json({
    running: scanState.running,
    paused: scanState.paused,
    mode: scanState.mode,
    startedAt: scanState.startedAt,
    remaining: scanState.queue.length,
    progress: scanState.progress,
  });
});

// ═══════════════════════════════════════════════
// POST /discover — Single discovery (manual)
// ═══════════════════════════════════════════════
router.post('/discover', async (req, res) => {
  const { country, city, category, mode } = req.body;
  if (!category) return res.status(400).json({ error: 'category is required' });

  const targetCountry = country || 'bosnia';
  const countryData = COUNTRIES[targetCountry];
  if (!countryData) return res.status(400).json({ error: `Unknown country: ${targetCountry}` });
  const targetCity = city || countryData.cities[0];

  try {
    const result = await discoverBusinesses(targetCountry, targetCity, category, mode || 'manual');
    addLog('info', `Scout discovered ${result.saved.length} businesses: ${category} in ${targetCity} (${result.latencyMs}ms)`);
    res.json({ businesses: result.saved, total: result.saved.length, duplicates: result.duplicates, latencyMs: result.latencyMs });
  } catch (e) {
    addLog('error', `Scout discovery failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════
// POST /leads/:id/analyze — AI analysis
// ═══════════════════════════════════════════════
router.post('/leads/:id/analyze', async (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const provider = getActiveProvider();

    const schema = {
      type: 'object',
      properties: {
        website_score:     { type: 'number', description: '1-10 (0 if no website)' },
        seo_score:         { type: 'number', description: '1-10' },
        mobile_score:      { type: 'number', description: '1-10' },
        conversion_score:  { type: 'number', description: '1-10' },
        opportunity_score: { type: 'number', description: '1-100' },
        outreach_priority: { type: 'string', enum: ['critical','high','medium','low'] },
        website_issues:    { type: 'array', items: { type: 'string' } },
        reasoning:         { type: 'string' },
        suggested_package: { type: 'string', enum: ['Launch Care','Growth Care','Presence Care'] },
        pain_points:       { type: 'array', items: { type: 'string' } },
        what_to_sell:      { type: 'string' },
        contact_channels:  { type: 'array', items: { type: 'string' } },
      },
      required: ['website_score','opportunity_score','outreach_priority','reasoning','suggested_package'],
    };

    const prompt = `Analyze this business as a potential web design client for Cloz Digital (premium web design studio in Bosnia).

Business: ${lead.business_name}
Category: ${lead.category}
Location: ${lead.city}, ${lead.country}
Google Rating: ${lead.rating || 'Unknown'} (${lead.review_count || 0} reviews)
Has Website: ${lead.has_website ? 'Yes' : 'No'}
${lead.website_url ? `Website URL: ${lead.website_url}` : 'No website detected'}
Phone: ${lead.phone || 'Unknown'}
Email: ${lead.email || 'Unknown'}

SCORING:
- No website → opportunity 75-95 (higher if established with good reviews)
- Bad/outdated website → opportunity 60-85
- Decent website → opportunity 20-50
- website_score = 0 if no website
- Higher reviews + no/bad website = HIGHER opportunity
- conversion_score: how well the current site converts visitors (0 if no site)

PACKAGES:
- Launch Care: New website build (no website or complete redesign)
- Growth Care: Website + ongoing optimization + content
- Presence Care: Basic maintenance + hosting for decent existing sites

CONTACT CHANNELS: suggest best ways to reach them from: email, phone, viber, instagram, in-person

Be realistic, specific, and actionable.`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.3, maxTokens: 2048, timeout: 60000, task: 'scout-analysis',
    });

    if (!result.data) throw new Error('Failed to parse analysis');
    const a = result.data;

    db.prepare(`UPDATE client_scout_leads SET
      website_score=?, seo_score=?, mobile_score=?, conversion_score=?,
      opportunity_score=?, outreach_priority=?, website_issues=?,
      reasoning=?, suggested_package=?, pain_points=?, what_to_sell=?,
      contact_channels=?, status=CASE WHEN status='new' THEN 'reviewed' ELSE status END,
      updated_at=datetime('now')
      WHERE id=?`).run(
      a.website_score||0, a.seo_score||0, a.mobile_score||0, a.conversion_score||0,
      a.opportunity_score||0, a.outreach_priority||'medium',
      JSON.stringify(a.website_issues||[]), a.reasoning||'',
      a.suggested_package||'Launch Care', JSON.stringify(a.pain_points||[]),
      a.what_to_sell||'', JSON.stringify(a.contact_channels||[]),
      req.params.id,
    );

    addLog('info', `Scout analyzed: ${lead.business_name} — Score: ${a.opportunity_score} (${result.latencyMs}ms)`);
    res.json({ analysis: a, latencyMs: result.latencyMs });
  } catch (e) {
    addLog('error', `Scout analysis failed for ${lead.business_name}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════
// POST /leads/:id/generate-outreach
// ═══════════════════════════════════════════════
router.post('/leads/:id/generate-outreach', async (req, res) => {
  const { channel, style } = req.body;
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const provider = getActiveProvider();
    const ch = channel || 'email';
    const st = style || 'professional';

    const schema = {
      type: 'object',
      properties: {
        subject:  { type: 'string', description: 'Email subject line' },
        message:  { type: 'string', description: 'Main outreach message' },
        viber_message: { type: 'string', description: 'Short Viber version (3-4 sentences)' },
        followUp: { type: 'string', description: 'Follow-up if no reply after 5 days' },
      },
      required: ['message'],
    };

    const painPoints = safeJSON(lead.pain_points, []);

    const prompt = `Write outreach messages for Cloz Digital (premium web design studio in Bosnia) to this business:

Business: ${lead.business_name}
Category: ${lead.category}
Location: ${lead.city}, ${lead.country}
Has Website: ${lead.has_website ? 'Yes' : 'No'}
${lead.website_url ? `Current Website: ${lead.website_url}` : ''}
${lead.reasoning ? `Our Analysis: ${lead.reasoning}` : ''}
${lead.suggested_package ? `Recommended Package: ${lead.suggested_package}` : ''}
${painPoints.length ? `Pain Points: ${painPoints.join(', ')}` : ''}

Generate ALL of these:
1. Email with subject line (${st} tone, 5-8 sentences)
2. Viber message (casual-professional, 3-4 sentences max)
3. Follow-up message for 5 days later

RULES:
- Be specific about THEIR business — never generic
- ${lead.has_website ? 'Mention website issues tactfully' : 'Mention lack of website and business impact'}
- Sound local and credible (we are based in Bosnia)
- Not pushy — offer value first
- Clear but soft call to action
- Language: English
- Sign off: Cloz Digital Team`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.6, maxTokens: 2048, timeout: 60000, task: 'scout-outreach',
    });

    if (!result.data) throw new Error('Failed to generate outreach');

    db.prepare(`UPDATE client_scout_leads SET
      outreach_email=?, outreach_viber=?, outreach_channel=?, outreach_style=?,
      updated_at=datetime('now')
      WHERE id=?`).run(
      JSON.stringify(result.data), result.data.viber_message || '',
      ch, st, req.params.id,
    );

    addLog('info', `Outreach generated for ${lead.business_name} (${ch}/${st}, ${result.latencyMs}ms)`);
    res.json({ outreach: result.data, latencyMs: result.latencyMs });
  } catch (e) {
    addLog('error', `Outreach failed for ${lead.business_name}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════
// GET /leads — List leads with filters
// ═══════════════════════════════════════════════
router.get('/leads', (req, res) => {
  const { country, city, category, status, minScore, hasWebsite, hasContact, limit, offset, sort } = req.query;
  const db = getDb();

  let sql = 'SELECT * FROM client_scout_leads WHERE 1=1';
  const params = [];

  if (country)   { sql += ' AND country_code = ?'; params.push(country); }
  if (city)      { sql += ' AND city = ?'; params.push(city); }
  if (category)  { sql += ' AND category LIKE ?'; params.push(`%${category}%`); }
  if (status)    { sql += ' AND status = ?'; params.push(status); }
  if (minScore)  { sql += ' AND opportunity_score >= ?'; params.push(parseInt(minScore)); }
  if (hasWebsite === 'false') sql += ' AND has_website = 0';
  if (hasWebsite === 'true')  sql += ' AND has_website = 1';
  if (hasContact === 'true')  sql += " AND (email != '' OR phone != '')";

  const orderMap = {
    score: 'opportunity_score DESC',
    newest: 'created_at DESC',
    rating: 'rating DESC',
    name: 'business_name ASC',
  };
  sql += ` ORDER BY ${orderMap[sort] || 'opportunity_score DESC, created_at DESC'}`;
  sql += ` LIMIT ${Math.min(parseInt(limit) || 100, 500)} OFFSET ${parseInt(offset) || 0}`;

  const leads = db.prepare(sql).all(...params);
  const parsed = leads.map(parseLead);

  res.json({ leads: parsed });
});

// ═══════════════════════════════════════════════
// GET /leads/:id
// ═══════════════════════════════════════════════
router.get('/leads/:id', (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(parseLead(lead));
});

// ═══════════════════════════════════════════════
// PATCH /leads/:id/status
// ═══════════════════════════════════════════════
router.patch('/leads/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const db = getDb();

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
  }

  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE client_scout_leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════
// DELETE /leads/:id
// ═══════════════════════════════════════════════
router.delete('/leads/:id', (req, res) => {
  getDb().prepare('DELETE FROM client_scout_leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════
// GET /stats — Aggregated statistics
// ═══════════════════════════════════════════════
router.get('/stats', (_req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as c FROM client_scout_leads').get()?.c || 0;
  const newLeads = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status = 'new'").get()?.c || 0;
  const highPriority = db.prepare('SELECT COUNT(*) as c FROM client_scout_leads WHERE opportunity_score >= 75').get()?.c || 0;
  const contacted = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status IN ('contacted','interested','meeting_scheduled','proposal_sent')").get()?.c || 0;
  const won = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status = 'won'").get()?.c || 0;
  const noWebsite = db.prepare('SELECT COUNT(*) as c FROM client_scout_leads WHERE has_website = 0').get()?.c || 0;
  const avgScore = db.prepare('SELECT AVG(opportunity_score) as v FROM client_scout_leads WHERE opportunity_score > 0').get()?.v || 0;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM client_scout_leads GROUP BY status').all();
  const byCountry = db.prepare('SELECT country_code, COUNT(*) as count FROM client_scout_leads GROUP BY country_code').all();
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;

  res.json({
    total, newLeads, highPriority, contacted, won, noWebsite,
    avgScore: Math.round(avgScore),
    conversionRate,
    countriesCovered: byCountry.length,
    byStatus: byStatus.reduce((o, r) => { o[r.status] = r.count; return o; }, {}),
    byCountry: byCountry.reduce((o, r) => { o[r.country_code] = r.count; return o; }, {}),
  });
});

// ═══════════════════════════════════════════════
// GET /meta — Countries + categories
// ═══════════════════════════════════════════════
router.get('/meta', (_req, res) => {
  res.json({
    countries: Object.entries(COUNTRIES).map(([key, v]) => ({ key, name: v.name, code: v.code, cities: v.cities })),
    categories: CATEGORIES,
    statuses: VALID_STATUSES,
  });
});

// ═══════════════════════════════════════════════
// PARSE LEAD (DB row → API response)
// ═══════════════════════════════════════════════
function parseLead(l) {
  return {
    ...l,
    has_website: !!l.has_website,
    website_issues: safeJSON(l.website_issues, []),
    pain_points: safeJSON(l.pain_points, []),
    contact_channels: safeJSON(l.contact_channels, []),
    outreach_email: safeJSON(l.outreach_email, null),
  };
}

export default router;
