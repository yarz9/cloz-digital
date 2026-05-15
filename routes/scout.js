// routes/scout.js — Client Scout: Lean AI-powered lead generation engine
// Find → Analyze → Outreach → Close

import { Router } from 'express';
import { getActiveProvider } from '../providers/index.js';
import { getDb } from '../database/init.js';
import { addLog } from './logs.js';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ══════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════════════════════════

const COUNTRIES = {
  bosnia:          { name: 'Bosnia and Herzegovina', code: 'BA', phone: '387', cities: ['Sarajevo','Mostar','Banja Luka','Tuzla','Zenica','Bijeljina','Trebinje','Brčko','Livno','Cazin','Prijedor','Doboj','Visoko','Goražde'] },
  croatia:         { name: 'Croatia',                code: 'HR', phone: '385', cities: ['Zagreb','Split','Rijeka','Osijek','Zadar','Dubrovnik','Pula','Šibenik','Karlovac','Varaždin'] },
  serbia:          { name: 'Serbia',                 code: 'RS', phone: '381', cities: ['Belgrade','Novi Sad','Niš','Kragujevac','Subotica','Čačak','Novi Pazar','Zrenjanin','Pančevo','Leskovac'] },
  montenegro:      { name: 'Montenegro',             code: 'ME', phone: '382', cities: ['Podgorica','Nikšić','Budva','Bar','Herceg Novi','Kotor','Tivat','Ulcinj'] },
  north_macedonia: { name: 'North Macedonia',        code: 'MK', phone: '389', cities: ['Skopje','Bitola','Kumanovo','Ohrid','Tetovo','Prilep','Strumica'] },
  slovenia:        { name: 'Slovenia',               code: 'SI', phone: '386', cities: ['Ljubljana','Maribor','Celje','Kranj','Koper','Novo Mesto'] },
  kosovo:          { name: 'Kosovo',                 code: 'XK', phone: '383', cities: ['Pristina','Prizren','Peja','Mitrovica','Gjilan','Ferizaj'] },
  albania:         { name: 'Albania',                code: 'AL', phone: '355', cities: ['Tirana','Durrës','Vlorë','Shkodër','Elbasan','Korçë','Fier'] },
};

const CATEGORIES = [
  'dental clinic','medical clinic','gym','beauty salon','restaurant',
  'hotel','apartment rental','real estate agency','construction company','law firm',
  'cafe','barber','auto repair','auto service','pharmacy',
  'veterinarian','accounting firm','spa','physiotherapy','cleaning service',
  'furniture store','photography studio','wedding venue','tourism agency',
  'bakery','florist','car dealership','insurance agency','tattoo studio',
  'nail salon','optician','pet shop','school','childcare',
];

// Priority industries — these convert best
const PRIORITY_CATEGORIES = [
  'dental clinic','medical clinic','gym','beauty salon','restaurant',
  'hotel','apartment rental','real estate agency','construction company','law firm',
];

const PIPELINE_STAGES = ['new','contacted','responded','proposal_sent','won','lost'];

const SCOUT_MODES = ['auto','no_website','bad_website','high_opportunity','premium_prospects','manual'];

const PACKAGES = {
  'Launch Care':   { projectValue: 800, monthlyValue: 0,   description: 'New website build from scratch' },
  'Growth Care':   { projectValue: 600, monthlyValue: 350, description: 'Website + ongoing optimization' },
  'Presence Care': { projectValue: 0,   monthlyValue: 200, description: 'Maintenance + hosting' },
};

// ══════════════════════════════════════════════════════════════════
//  GOOGLE PLACES INTEGRATION
// ══════════════════════════════════════════════════════════════════

function getGoogleApiKey() { return process.env.GOOGLE_MAPS_API_KEY || ''; }
function hasGoogleApi() { return getGoogleApiKey().length > 0; }

async function googlePlacesSearch(query, options = {}) {
  const key = getGoogleApiKey();
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not configured');

  const radius = options.radius || parseInt(process.env.SCOUT_DEFAULT_RADIUS_METERS) || 5000;
  const maxResults = options.maxResults || parseInt(process.env.SCOUT_MAX_RESULTS_PER_QUERY) || 20;

  const params = new URLSearchParams({
    query, key,
    ...(options.location ? { location: options.location, radius: String(radius) } : {}),
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`, {
    signal: options.signal,
  });
  if (!res.ok) throw new Error(`Google Places API error: ${res.status}`);

  const data = await res.json();
  if (data.status === 'REQUEST_DENIED') throw new Error(`Google Places: ${data.error_message || 'Request denied'}`);
  if (data.status === 'OVER_QUERY_LIMIT') throw new Error('Google Places: Rate limit exceeded');

  return (data.results || []).slice(0, maxResults);
}

async function googlePlaceDetails(placeId) {
  const key = getGoogleApiKey();
  if (!key) return null;

  const fields = 'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,url,rating,user_ratings_total,types,business_status,geometry,address_components';
  const params = new URLSearchParams({ place_id: placeId, fields, key });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
  if (!res.ok) return null;
  return (await res.json()).result || null;
}

function parsePlaceResult(place, searchCategory, countryKey) {
  const countryData = COUNTRIES[countryKey] || {};
  const addr = place.formatted_address || place.vicinity || '';

  let city = '';
  if (place.address_components) {
    const cityComp = place.address_components.find(c => c.types.includes('locality'));
    city = cityComp?.long_name || '';
  }
  if (!city) {
    const parts = addr.split(',').map(s => s.trim());
    city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '';
  }

  const website = place.website || '';
  return {
    place_id: place.place_id,
    business_name: place.name || 'Unknown',
    category: searchCategory,
    country: countryData.name || '',
    country_code: countryData.code || '',
    city,
    address: addr,
    phone: place.international_phone_number || place.formatted_phone_number || '',
    email: '',
    website_url: website,
    google_maps_url: place.url || `https://maps.google.com/?cid=${place.place_id}`,
    rating: place.rating || 0,
    review_count: place.user_ratings_total || 0,
    has_website: website.length > 5 ? 1 : 0,
    lat: place.geometry?.location?.lat || 0,
    lng: place.geometry?.location?.lng || 0,
    business_status: place.business_status || '',
    types: JSON.stringify(place.types || []),
  };
}

// ══════════════════════════════════════════════════════════════════
//  BACKGROUND SCAN ENGINE
// ══════════════════════════════════════════════════════════════════

const scanState = {
  running: false, paused: false, mode: 'auto',
  progress: { scanned: 0, created: 0, duplicates: 0, errors: 0, currentTask: '', totalBatches: 0 },
  startedAt: null, queue: [], _abortCtrl: null,
};

function resetScanState() {
  scanState.running = false;
  scanState.paused = false;
  scanState.progress = { scanned: 0, created: 0, duplicates: 0, errors: 0, currentTask: '', totalBatches: 0 };
  scanState.startedAt = null;
  scanState.queue = [];
  scanState._abortCtrl = null;
}

function sourceHash(biz) {
  if (biz.place_id) return crypto.createHash('md5').update(biz.place_id).digest('hex');
  const raw = `${(biz.business_name || '').toLowerCase().trim()}|${(biz.city || '').toLowerCase().trim()}|${(biz.phone || '').replace(/\s/g, '')}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

function isDuplicate(db, biz) {
  if (biz.place_id && db.prepare('SELECT id FROM client_scout_leads WHERE place_id = ?').get(biz.place_id)) return true;
  if (db.prepare('SELECT id FROM client_scout_leads WHERE source_hash = ?').get(sourceHash(biz))) return true;
  return false;
}

function saveLead(db, lead, mode) {
  const id = uuid();
  const hash = sourceHash(lead);

  db.prepare(`INSERT INTO client_scout_leads (
    id, place_id, business_name, category, country, country_code, city, address,
    phone, email, website_url, google_maps_url, rating, review_count,
    has_website, lat, lng, business_status, types, source_hash, scouting_mode, status,
    created_at, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))`).run(
    id, lead.place_id || '', lead.business_name, lead.category,
    lead.country, lead.country_code, lead.city, lead.address || '',
    lead.phone || '', lead.email || '', lead.website_url || '',
    lead.google_maps_url || '', lead.rating || 0, lead.review_count || 0,
    lead.has_website || 0, lead.lat || 0, lead.lng || 0,
    lead.business_status || '', lead.types || '[]',
    hash, mode || 'manual', 'new'
  );

  return { id, ...lead };
}

// ── Core discovery: Google Places first, AI fallback ──
async function discoverBusinesses(countryKey, city, category, mode, signal) {
  const countryData = COUNTRIES[countryKey];
  if (!countryData) throw new Error(`Unknown country: ${countryKey}`);

  const db = getDb();
  const saved = [];
  let dupCount = 0;

  if (hasGoogleApi()) {
    const query = `${category} in ${city}, ${countryData.name}`;
    const places = await googlePlacesSearch(query, { signal });

    const concurrent = parseInt(process.env.SCOUT_CONCURRENT_REQUESTS) || 2;
    const chunks = [];
    for (let i = 0; i < places.length; i += concurrent) chunks.push(places.slice(i, i + concurrent));

    for (const chunk of chunks) {
      if (signal?.aborted) break;

      const detailed = await Promise.all(
        chunk.map(async (p) => {
          try { const d = await googlePlaceDetails(p.place_id); return d ? { ...p, ...d } : p; }
          catch { return p; }
        })
      );

      for (const place of detailed) {
        const lead = parsePlaceResult(place, category, countryKey);
        lead.city = lead.city || city;
        if (isDuplicate(db, lead)) { dupCount++; continue; }
        saved.push(saveLead(db, lead, mode));
      }

      if (chunks.indexOf(chunk) < chunks.length - 1) await new Promise(r => setTimeout(r, 300));
    }
  } else {
    // AI fallback
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        businesses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              businessName: { type: 'string' }, category: { type: 'string' },
              address: { type: 'string' }, phone: { type: 'string' },
              email: { type: 'string' }, websiteUrl: { type: 'string' },
              googleMapsUrl: { type: 'string' }, rating: { type: 'number' },
              reviewCount: { type: 'number' }, hasWebsite: { type: 'boolean' },
            },
            required: ['businessName', 'category', 'address', 'hasWebsite'],
          },
        },
      },
      required: ['businesses'],
    };

    const modeHint = getModeInstruction(mode);
    const prompt = `You are a business directory researcher for the Balkans. Search for real ${category} businesses in ${city}, ${countryData.name}.\n\n${modeHint}\n\nGenerate 8-12 realistic businesses. Use local names, real-format phone numbers (+${countryData.phone}), realistic ratings, local TLDs (.ba/.rs/.hr/.me/.mk/.si/.al). Include plausible Google Maps URLs.`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.8, maxTokens: 4096, timeout: 90000, task: 'scout-discovery',
    });

    if (result.data?.businesses) {
      for (const biz of result.data.businesses) {
        if (signal?.aborted) break;
        const lead = {
          place_id: '', business_name: biz.businessName, category: biz.category || category,
          country: countryData.name, country_code: countryData.code, city,
          address: biz.address || '', phone: biz.phone || '', email: biz.email || '',
          website_url: biz.websiteUrl || '', google_maps_url: biz.googleMapsUrl || '',
          rating: biz.rating || 0, review_count: biz.reviewCount || 0,
          has_website: biz.hasWebsite ? 1 : 0, lat: 0, lng: 0,
          business_status: '', types: '[]',
        };
        if (isDuplicate(db, lead)) { dupCount++; continue; }
        saved.push(saveLead(db, lead, mode));
      }
    }
  }

  return { saved, duplicates: dupCount, source: hasGoogleApi() ? 'google_places' : 'ai_generated' };
}

function getModeInstruction(mode) {
  const m = {
    no_website: 'Focus on businesses UNLIKELY to have a website. Set hasWebsite=false for most.',
    bad_website: 'Focus on businesses likely to have cheap, outdated, or broken websites.',
    high_opportunity: 'Focus on established businesses with good ratings but poor/no website.',
    premium_prospects: 'Focus on premium businesses (hotels, clinics, law firms) that would pay for quality websites.',
  };
  return m[mode] || 'Include a realistic mix of businesses.';
}

// ── Scan queue builder ──
function buildScanQueue(mode, country, city, category) {
  const queue = [];

  // Country selection
  let countries;
  if (country) {
    countries = [country];
  } else {
    const defaultCodes = (process.env.SCOUT_DEFAULT_COUNTRIES || 'BA,HR,RS').split(',');
    countries = Object.entries(COUNTRIES).filter(([_, v]) => defaultCodes.includes(v.code)).map(([k]) => k);
    if (countries.length === 0) countries = ['bosnia', 'croatia', 'serbia'];
  }

  // Category selection — priority industries first
  const cats = category ? [category] : PRIORITY_CATEGORIES;

  for (const c of countries) {
    const data = COUNTRIES[c];
    if (!data) continue;
    const cities = city ? [city] : data.cities.slice(0, 3);
    for (const ci of cities) {
      for (const cat of cats) {
        queue.push({ country: c, city: ci, category: cat });
      }
    }
  }
  return queue;
}

// ── Scan loop ──
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

    if (scanState.queue.length > 0 && scanState.running) {
      await new Promise(r => setTimeout(r, hasGoogleApi() ? 1000 : 2000));
    }
  }

  if (scanState.queue.length === 0) {
    scanState.running = false;
    scanState.progress.currentTask = 'Scan complete';
    addLog('info', `Scout scan complete: ${scanState.progress.scanned} batches, ${scanState.progress.created} leads, ${scanState.progress.duplicates} duplicates`);
  }
}

// ══════════════════════════════════════════════════════════════════
//  API — DISCOVERY
// ══════════════════════════════════════════════════════════════════

router.post('/search', async (req, res) => {
  const { country, city, category, mode, query } = req.body;
  if (!category && !query) return res.status(400).json({ error: 'category or query required' });

  const targetCountry = country || 'bosnia';
  const countryData = COUNTRIES[targetCountry];
  if (!countryData) return res.status(400).json({ error: `Unknown country: ${targetCountry}` });
  const targetCity = city || countryData.cities[0];

  try {
    const result = await discoverBusinesses(targetCountry, targetCity, category || query, mode || 'manual');
    addLog('info', `Scout search: ${result.saved.length} leads from ${result.source} — "${category || query}" in ${targetCity}`);
    res.json({ businesses: result.saved, total: result.saved.length, duplicates: result.duplicates, source: result.source });
  } catch (e) {
    addLog('error', `Scout search failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/discover', async (req, res) => {
  req.body.category = req.body.category || req.body.query;
  const handler = router.stack.find(r => r.route?.path === '/search');
  return handler ? handler.route.stack[0].handle(req, res) : res.status(500).json({ error: 'Internal routing error' });
});

// ── Background scan ──
router.post('/auto-scan', (req, res) => {
  if (scanState.running && !scanState.paused) return res.status(409).json({ error: 'Scan already running' });

  const { mode, country, city, category } = req.body;
  const queue = buildScanQueue(mode || 'auto', country, city, category);
  if (queue.length === 0) return res.status(400).json({ error: 'No scan targets' });

  if (scanState.paused) {
    scanState.paused = false;
    scanState.running = true;
    runScanLoop();
    return res.json({ status: 'resumed', remaining: scanState.queue.length });
  }

  resetScanState();
  scanState.running = true;
  scanState.mode = mode || 'auto';
  scanState.startedAt = new Date().toISOString();
  scanState.queue = queue;
  scanState.progress.totalBatches = queue.length;
  scanState._abortCtrl = new AbortController();

  addLog('info', `Scout scan started: ${queue.length} batches (mode: ${scanState.mode}, source: ${hasGoogleApi() ? 'google' : 'ai'})`);
  runScanLoop();

  res.json({ status: 'started', totalBatches: queue.length, mode: scanState.mode, source: hasGoogleApi() ? 'google_places' : 'ai_generated' });
});

router.post('/scan/start', (req, res) => {
  return router.handle({ ...req, url: '/auto-scan', method: 'POST' }, res, () => {});
});

router.post('/scan/stop', (req, res) => {
  const { pause } = req.body;
  if (!scanState.running) return res.status(400).json({ error: 'No scan running' });

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

router.post('/pause', (_req, res) => {
  if (!scanState.running) return res.status(400).json({ error: 'No scan running' });
  scanState.paused = true;
  res.json({ status: 'paused', remaining: scanState.queue.length });
});

router.post('/resume', (_req, res) => {
  if (!scanState.paused) return res.status(400).json({ error: 'Scan not paused' });
  scanState.paused = false;
  scanState.running = true;
  runScanLoop();
  res.json({ status: 'resumed', remaining: scanState.queue.length });
});

router.get('/scan/status', (_req, res) => {
  res.json({
    running: scanState.running, paused: scanState.paused, mode: scanState.mode,
    startedAt: scanState.startedAt, remaining: scanState.queue.length,
    progress: scanState.progress, source: hasGoogleApi() ? 'google_places' : 'ai_generated',
  });
});

// ══════════════════════════════════════════════════════════════════
//  API — OPPORTUNITY ANALYSIS
// ══════════════════════════════════════════════════════════════════

router.post('/analyze', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  return analyzeLeadById(id, res);
});

router.post('/leads/:id/analyze', async (req, res) => {
  return analyzeLeadById(req.params.id, res);
});

async function analyzeLeadById(id, res) {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const provider = getActiveProvider();

    const schema = {
      type: 'object',
      properties: {
        opportunity_score: { type: 'number', description: 'Overall opportunity 0-100' },
        suggested_package: { type: 'string', enum: ['Launch Care', 'Growth Care', 'Presence Care'] },
        project_value: { type: 'number', description: 'Estimated project value in EUR' },
        monthly_retainer: { type: 'number', description: 'Estimated monthly retainer in EUR' },
        close_probability: { type: 'number', description: '0.0-1.0 chance of closing' },
        pain_points: { type: 'array', items: { type: 'string' }, description: '3-5 key pain points' },
        best_sales_angle: { type: 'string', description: 'The single best conversation opener' },
        recommended_channel: { type: 'string', enum: ['email', 'phone', 'viber', 'whatsapp', 'linkedin', 'in-person'] },
        outreach_priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        executive_summary: { type: 'string', description: '2-3 sentence summary of the opportunity' },
        website_status: { type: 'string', enum: ['no_website', 'poor_website', 'decent_website', 'good_website'] },
        // Phase 2 scores — generated together for efficiency
        website_score: { type: 'number', description: '0-100' },
        seo_score: { type: 'number', description: '0-100' },
        mobile_score: { type: 'number', description: '0-100' },
        conversion_score: { type: 'number', description: '0-100' },
        trust_score: { type: 'number', description: 'How established/trustworthy 0-100' },
        urgency_score: { type: 'number', description: 'How urgently they need help 0-100' },
        website_issues: { type: 'array', items: { type: 'string' } },
        what_to_sell: { type: 'string' },
        objection_prediction: { type: 'string' },
        risk_factors: { type: 'array', items: { type: 'string' } },
      },
      required: ['opportunity_score', 'suggested_package', 'project_value', 'monthly_retainer',
                  'pain_points', 'best_sales_angle', 'recommended_channel', 'outreach_priority', 'executive_summary'],
    };

    const isPriority = PRIORITY_CATEGORIES.includes(lead.category?.toLowerCase());
    const prompt = `You are a sales strategist for Cloz Digital, a premium web design agency in Bosnia serving Balkan businesses.

Analyze this business as a potential client:

Business: ${lead.business_name}
Category: ${lead.category}${isPriority ? ' (PRIORITY INDUSTRY)' : ''}
Location: ${lead.city}, ${lead.country}
Google Rating: ${lead.rating || 'Unknown'} (${lead.review_count || 0} reviews)
Has Website: ${lead.has_website ? 'Yes' : 'No'}
${lead.website_url ? `Website: ${lead.website_url}` : 'No website detected'}
Phone: ${lead.phone || 'Unknown'}
Source: ${lead.place_id ? 'Google Places (verified)' : 'AI-generated'}

OPPORTUNITY SCORING RULES (0-100):
- No website: +40 base points
- Poor/outdated website: +25 base points
- High review count + good reputation: +20 points
- Priority industry (dental, medical, gym, beauty, restaurant, hotel, real estate, construction, law): +15 points
- Visual/trust-driven business: +10 points

PACKAGES:
- Launch Care: ~800 EUR project, 0 monthly — new website from scratch
- Growth Care: ~600 EUR project + 350/mo — website + ongoing optimization
- Presence Care: 0 project + 200/mo — maintenance and hosting only
- Lifetime value = project + (monthly × 24 months)

Be specific, actionable, and realistic. No generic advice.`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.3, maxTokens: 3072, timeout: 60000, task: 'scout-analysis',
    });

    if (!result.data) throw new Error('Analysis returned empty');
    const a = result.data;

    // Build revenue_potential object
    const revenue_potential = {
      project_value: a.project_value || 0,
      monthly_value: a.monthly_retainer || 0,
      lifetime_value: (a.project_value || 0) + ((a.monthly_retainer || 0) * 24),
      close_probability: a.close_probability || 0.3,
    };

    db.prepare(`UPDATE client_scout_leads SET
      opportunity_score=?, outreach_priority=?, suggested_package=?,
      best_sales_angle=?, pain_points=?, what_to_sell=?,
      website_score=?, seo_score=?, mobile_score=?, conversion_score=?,
      trust_score=?, urgency_score=?, website_issues=?,
      contact_channels=?, objection_prediction=?, revenue_potential=?,
      risk_factors=?, reasoning=?,
      status=CASE WHEN status='new' THEN 'new' ELSE status END,
      updated_at=datetime('now')
      WHERE id=?`).run(
      a.opportunity_score || 0, a.outreach_priority || 'medium',
      a.suggested_package || 'Launch Care', a.best_sales_angle || '',
      JSON.stringify(a.pain_points || []), a.what_to_sell || '',
      a.website_score || 0, a.seo_score || 0, a.mobile_score || 0, a.conversion_score || 0,
      a.trust_score || 0, a.urgency_score || 0, JSON.stringify(a.website_issues || []),
      JSON.stringify([a.recommended_channel || 'email']),
      a.objection_prediction || '', JSON.stringify(revenue_potential),
      JSON.stringify(a.risk_factors || []),
      a.executive_summary || '',
      id,
    );

    addLog('info', `Scout analyzed: ${lead.business_name} — Score: ${a.opportunity_score} [${result.modelGroup}/${result.model}] (${result.latencyMs}ms)`);
    res.json({ analysis: { ...a, revenue_potential }, latencyMs: result.latencyMs });
  } catch (e) {
    addLog('error', `Analysis failed for ${lead.business_name}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
}

// ── Bulk analyze ──
router.post('/bulk-analyze', async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'ids array required' });

  const results = [];
  for (const id of ids.slice(0, 10)) {
    try {
      const db = getDb();
      const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(id);
      if (!lead) continue;
      results.push({ id, status: 'queued' });
    } catch {}
  }
  res.json({ queued: results.length, message: 'Use /leads/:id/analyze for individual analysis' });
});

// ══════════════════════════════════════════════════════════════════
//  API — OUTREACH GENERATION
// ══════════════════════════════════════════════════════════════════

router.post('/generate-outreach', async (req, res) => {
  const { id, channel, style, sender } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  return generateOutreachForLead(id, { channel, style, sender }, res);
});

router.post('/leads/:id/generate-outreach', async (req, res) => {
  return generateOutreachForLead(req.params.id, req.body, res);
});

async function generateOutreachForLead(id, options, res) {
  const { style, sender } = options;
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const SENDERS = {
    anes: { name: 'Anes D.', title: 'Founder & Web Developer', email: 'anes@cloz.digital', signoff: 'Warm regards,\nAnes D.\nFounder & Web Developer\nCloz Digital\nanes@cloz.digital\nwww.cloz.digital' },
    denis: { name: 'Denis G.', title: 'Client Success Manager', email: 'denis@cloz.digital', signoff: 'Warm regards,\nDenis G.\nClient Success Manager\nCloz Digital\ndenis@cloz.digital\nwww.cloz.digital' },
    general: { name: 'Cloz Digital Team', title: 'Website Design', email: 'general@cloz.digital', signoff: 'Best regards,\nCloz Digital Team\ngeneral@cloz.digital\nwww.cloz.digital' },
  };
  const senderProfile = SENDERS[sender] || SENDERS.anes;

  try {
    const provider = getActiveProvider();
    const painPoints = safeJSON(lead.pain_points, []);
    const st = style || 'professional';

    const schema = {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Email subject line' },
        email: { type: 'string', description: 'Full email body' },
        viber: { type: 'string', description: 'Viber message (3-4 sentences)' },
        followup: { type: 'string', description: 'Follow-up message for 5 days later' },
      },
      required: ['subject', 'email', 'viber', 'followup'],
    };

    const prompt = `You are ${senderProfile.name}, ${senderProfile.title} at Cloz Digital (premium web design agency).

Write outreach messages for this business:
Business: ${lead.business_name}
Category: ${lead.category}
Location: ${lead.city}, ${lead.country}
Has Website: ${lead.has_website ? 'Yes' : 'No'}
${lead.website_url ? `Current Website: ${lead.website_url}` : ''}
${lead.reasoning ? `Opportunity: ${lead.reasoning}` : ''}
${lead.suggested_package ? `Package Fit: ${lead.suggested_package}` : ''}
${painPoints.length ? `Pain Points: ${painPoints.join(', ')}` : ''}
${lead.best_sales_angle ? `Sales Angle: ${lead.best_sales_angle}` : ''}

Generate ALL of these:
1. Email (${st} tone, 5-8 sentences) ending with:\n${senderProfile.signoff}
2. Viber message (3-4 sentences, casual-professional)
3. Follow-up message (5 days later, different angle, shorter)

RULES:
- Be specific about THEIR business — never generic
- Not pushy — offer value and expertise
- Professional but warm
- Ready to copy-paste and send`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.6, maxTokens: 3072, timeout: 60000, task: 'scout-outreach',
    });

    if (!result.data) throw new Error('Failed to generate outreach');
    const o = result.data;

    // Store in DB
    const outreachData = { subject: o.subject, message: o.email, viber_message: o.viber, followUp1: o.followup };

    db.prepare(`UPDATE client_scout_leads SET
      outreach_email=?, outreach_viber=?, outreach_channel=?, outreach_style=?,
      followup_1=?,
      updated_at=datetime('now') WHERE id=?`).run(
      JSON.stringify(outreachData), o.viber || '',
      'email', st, o.followup || '',
      id,
    );

    addLog('info', `Outreach generated for ${lead.business_name} [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json({ outreach: outreachData, latencyMs: result.latencyMs, sender: senderProfile });
  } catch (e) {
    addLog('error', `Outreach failed for ${lead.business_name}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════
//  API — WEBSITE REVIEW (Phase 2)
// ══════════════════════════════════════════════════════════════════

router.post('/leads/:id/website-review', async (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (!lead.website_url) return res.status(400).json({ error: 'Lead has no website to review' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        overall_score: { type: 'number' },
        design_score: { type: 'number' }, mobile_score: { type: 'number' },
        seo_score: { type: 'number' }, conversion_score: { type: 'number' },
        trust_score: { type: 'number' },
        executive_summary: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        quick_wins: { type: 'array', items: { type: 'string' } },
        suggested_package: { type: 'string' },
        estimated_project_value: { type: 'number' },
        estimated_monthly_retainer: { type: 'number' },
        sales_talking_points: { type: 'array', items: { type: 'string' } },
      },
      required: ['overall_score', 'executive_summary', 'weaknesses', 'sales_talking_points'],
    };

    const prompt = `You are a senior web analyst at Cloz Digital. Perform a website review.

Business: ${lead.business_name}
Category: ${lead.category}
Location: ${lead.city}, ${lead.country}
Website: ${lead.website_url}
Google Rating: ${lead.rating} (${lead.review_count} reviews)

Score 0-100: design, mobile, SEO, conversion, trust, and overall.
Provide executive summary, strengths, weaknesses, quick wins.
Estimate project value (EUR) and monthly retainer.
List 3-5 sales talking points for the outreach call.
Be specific and realistic.`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.3, maxTokens: 3072, timeout: 90000, task: 'audit-review',
    });

    if (result.data) {
      db.prepare(`UPDATE client_scout_leads SET website_review=?, updated_at=datetime('now') WHERE id=?`).run(
        JSON.stringify(result.data), req.params.id,
      );
    }

    addLog('info', `Website review: ${lead.business_name} — Score: ${result.data?.overall_score}/100 (${result.latencyMs}ms)`);
    res.json({ review: result.data, latencyMs: result.latencyMs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  API — REBUILD PROMPT (Phase 3)
// ══════════════════════════════════════════════════════════════════

router.post('/leads/:id/rebuild-prompt', async (req, res) => {
  const { variant = 'full' } = req.body;
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const review = safeJSON(lead.website_review, null);

  try {
    const provider = getActiveProvider();

    const variants = {
      short: 'Generate a SHORT rebuild prompt (5-8 sentences). Just the essentials.',
      detailed: 'Generate a DETAILED rebuild prompt with page structure, design direction, and key sections.',
      full: `Generate a FULL website rebuild prompt including: business overview, services, target audience, sitemap (5-8 pages), page structure with sections, copy direction, design direction (colors, typography, style), conversion strategy, SEO requirements, mobile-first requirements.`,
    };

    const prompt = `You are a senior web architect. Generate an implementation-ready Claude Code prompt to rebuild a website.

Business: ${lead.business_name}
Category: ${lead.category}
Location: ${lead.city}, ${lead.country}
Current Website: ${lead.website_url || 'None'}
${review ? `Review Summary: ${review.executive_summary || ''}` : ''}
${review?.weaknesses ? `Key Issues: ${review.weaknesses.join(', ')}` : ''}

${variants[variant] || variants.full}

The prompt must be ready to paste into Claude Code and produce a complete, modern, professional website.
Output the prompt text directly — no explanations, no markdown wrapping.`;

    const result = await provider.generate(prompt, {
      temperature: 0.5, maxTokens: 6144, timeout: 90000, task: 'audit-review',
    });

    addLog('info', `Rebuild prompt (${variant}) generated for ${lead.business_name} (${result.latencyMs}ms)`);
    res.json({ prompt: result.text, variant, latencyMs: result.latencyMs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  API — PIPELINE MANAGEMENT
// ══════════════════════════════════════════════════════════════════

router.post('/change-stage', (req, res) => {
  const { id, status, notes } = req.body;
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });
  if (!PIPELINE_STAGES.includes(status)) return res.status(400).json({ error: `Invalid status. Allowed: ${PIPELINE_STAGES.join(', ')}` });

  const db = getDb();
  const updates = ['status = ?', "updated_at = datetime('now')"];
  const params = [status];
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  params.push(id);

  db.prepare(`UPDATE client_scout_leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  addLog('info', `Lead ${id} moved to stage: ${status}`);
  res.json({ ok: true, status });
});

// ══════════════════════════════════════════════════════════════════
//  API — LEADS CRUD
// ══════════════════════════════════════════════════════════════════

router.get('/leads', (req, res) => {
  const { country, city, category, status, minScore, hasWebsite, hasContact, pipeline, limit, offset, sort, search } = req.query;
  const db = getDb();

  let sql = 'SELECT * FROM client_scout_leads WHERE 1=1';
  const params = [];

  if (country) { sql += ' AND country_code = ?'; params.push(country); }
  if (city) { sql += ' AND city = ?'; params.push(city); }
  if (category) { sql += ' AND category LIKE ?'; params.push(`%${category}%`); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (minScore) { sql += ' AND opportunity_score >= ?'; params.push(parseInt(minScore)); }
  if (hasWebsite === 'false') sql += ' AND has_website = 0';
  if (hasWebsite === 'true') sql += ' AND has_website = 1';
  if (hasContact === 'true') sql += " AND (email != '' OR phone != '')";
  if (search) {
    sql += ' AND (business_name LIKE ? OR category LIKE ? OR city LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (pipeline) {
    const stages = pipeline.split(',');
    sql += ` AND status IN (${stages.map(() => '?').join(',')})`;
    params.push(...stages);
  }

  const orderMap = {
    score: 'opportunity_score DESC',
    newest: 'created_at DESC',
    rating: 'rating DESC',
    reviews: 'review_count DESC',
    name: 'business_name ASC',
    urgency: 'urgency_score DESC',
    revenue: "CAST(json_extract(revenue_potential, '$.project_value') AS REAL) DESC",
  };
  sql += ` ORDER BY ${orderMap[sort] || 'opportunity_score DESC, created_at DESC'}`;
  sql += ` LIMIT ${Math.min(parseInt(limit) || 100, 500)} OFFSET ${parseInt(offset) || 0}`;

  const leads = db.prepare(sql).all(...params);

  // Count total
  const countSql = sql.split(' ORDER BY')[0].replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params.slice(0, params.length))?.total || leads.length;

  res.json({ leads: leads.map(parseLead), total });
});

router.get('/leads/:id', (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM client_scout_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(parseLead(lead));
});

router.patch('/leads/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const db = getDb();
  if (status && !PIPELINE_STAGES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

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

router.delete('/leads/:id', (req, res) => {
  getDb().prepare('DELETE FROM client_scout_leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════
//  API — STATS & DASHBOARD
// ══════════════════════════════════════════════════════════════════

router.get('/stats', (_req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as c FROM client_scout_leads').get()?.c || 0;
  const newLeads = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status = 'new'").get()?.c || 0;
  const noWebsite = db.prepare('SELECT COUNT(*) as c FROM client_scout_leads WHERE has_website = 0').get()?.c || 0;
  const highOpp = db.prepare('SELECT COUNT(*) as c FROM client_scout_leads WHERE opportunity_score >= 70').get()?.c || 0;
  const contacted = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status IN ('contacted','responded','proposal_sent')").get()?.c || 0;
  const won = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status = 'won'").get()?.c || 0;
  const lost = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE status = 'lost'").get()?.c || 0;
  const avgScore = db.prepare('SELECT AVG(opportunity_score) as v FROM client_scout_leads WHERE opportunity_score > 0').get()?.v || 0;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM client_scout_leads GROUP BY status').all();
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM client_scout_leads GROUP BY category ORDER BY count DESC LIMIT 10').all();
  const byCountry = db.prepare('SELECT country_code, COUNT(*) as count FROM client_scout_leads GROUP BY country_code').all();
  const googleSourced = db.prepare("SELECT COUNT(*) as c FROM client_scout_leads WHERE place_id != '' AND place_id IS NOT NULL").get()?.c || 0;

  // Revenue: won deals
  const wonLeads = db.prepare("SELECT revenue_potential FROM client_scout_leads WHERE status = 'won' AND revenue_potential != ''").all();
  let wonRevenue = 0, wonMRR = 0;
  wonLeads.forEach(l => { const rp = safeJSON(l.revenue_potential, {}); wonRevenue += rp.project_value || 0; wonMRR += rp.monthly_value || 0; });

  // Pipeline value (weighted by probability)
  const pipelineLeads = db.prepare("SELECT revenue_potential FROM client_scout_leads WHERE status IN ('contacted','responded','proposal_sent') AND revenue_potential != ''").all();
  let pipelineValue = 0, expectedMRR = 0;
  pipelineLeads.forEach(l => {
    const rp = safeJSON(l.revenue_potential, {});
    const prob = rp.close_probability || 0.3;
    pipelineValue += (rp.project_value || 0) * prob;
    expectedMRR += (rp.monthly_value || 0) * prob;
  });

  // Best leads today
  const today = new Date().toISOString().slice(0, 10);
  const bestToday = db.prepare(`SELECT id, business_name, category, city, opportunity_score, has_website, suggested_package, revenue_potential
    FROM client_scout_leads WHERE created_at LIKE ? AND opportunity_score > 0
    ORDER BY opportunity_score DESC LIMIT 5`).all(`${today}%`).map(parseLead);

  // Follow-ups due (contacted more than 5 days ago)
  const followUpsDue = db.prepare(`SELECT id, business_name, category, city, status, updated_at
    FROM client_scout_leads WHERE status = 'contacted' AND updated_at < datetime('now', '-5 days')
    ORDER BY updated_at ASC LIMIT 10`).all();

  res.json({
    total, newLeads, noWebsite, highOpp, contacted, won, lost,
    avgScore: Math.round(avgScore), googleSourced,
    wonRevenue: Math.round(wonRevenue), wonMRR: Math.round(wonMRR),
    pipelineValue: Math.round(pipelineValue), expectedMRR: Math.round(expectedMRR),
    byStatus: byStatus.reduce((o, r) => { o[r.status] = r.count; return o; }, {}),
    byCategory: byCategory.reduce((o, r) => { o[r.category] = r.count; return o; }, {}),
    byCountry: byCountry.reduce((o, r) => { o[r.country_code] = r.count; return o; }, {}),
    bestToday, followUpsDue,
    googlePlacesConfigured: hasGoogleApi(),
  });
});

// ── META ──
router.get('/meta', (_req, res) => {
  res.json({
    countries: Object.entries(COUNTRIES).map(([key, v]) => ({ key, name: v.name, code: v.code, cities: v.cities })),
    categories: CATEGORIES,
    priorityCategories: PRIORITY_CATEGORIES,
    statuses: PIPELINE_STAGES,
    modes: SCOUT_MODES,
    packages: PACKAGES,
    googlePlacesConfigured: hasGoogleApi(),
  });
});

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function safeJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function parseLead(l) {
  return {
    ...l,
    has_website: !!l.has_website,
    website_issues: safeJSON(l.website_issues, []),
    pain_points: safeJSON(l.pain_points, []),
    contact_channels: safeJSON(l.contact_channels, []),
    outreach_email: safeJSON(l.outreach_email, null),
    revenue_potential: safeJSON(l.revenue_potential, {}),
    risk_factors: safeJSON(l.risk_factors, []),
    website_review: safeJSON(l.website_review, null),
    types: safeJSON(l.types, []),
  };
}

export default router;
