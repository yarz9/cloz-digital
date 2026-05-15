import { Router } from 'express';
import { getActiveProvider } from '../providers/index.js';
import { getDb } from '../database/init.js';
import { addLog } from './logs.js';

const router = Router();

// ── Helpers ──

function getConfig() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();
  const c = rows.reduce((o, r) => { o[r.key] = r.value; return o; }, {});
  return {
    temperature: parseFloat(c.temperature) || 0.7,
    maxTokens: parseInt(c.maxTokens) || 2048,
    timeout: parseInt(c.timeout) || 30000,
  };
}

function fillTemplate(body, vars) {
  let text = body;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || '');
  }
  return text;
}

function getTemplate(slug) {
  return getDb().prepare('SELECT * FROM prompts WHERE slug = ?').get(slug);
}

// ═══════════════════════════════════════════════════════
// 1. DASHBOARD BRIEFING — Model Group: FAST
// ═══════════════════════════════════════════════════════
router.post('/dashboard-briefing', async (req, res) => {
  const { date, activeClients, overdueInvoices, expiringDomains, newLeads, pendingTasks, recentActivity } = req.body;
  try {
    const provider = getActiveProvider();
    const template = getTemplate('dashboard-briefing');
    let prompt = template?.body || 'Generate a daily briefing summary for a web design agency.';
    prompt = fillTemplate(prompt, { date, activeClients, overdueInvoices, expiringDomains, newLeads, pendingTasks, recentActivity });

    const schema = {
      type: 'object',
      properties: {
        priorities: { type: 'array', items: { type: 'string' }, description: 'Top 3-5 priorities for today' },
        risks: { type: 'array', items: { type: 'string' }, description: 'Key risks or issues needing attention' },
        revenue_status: { type: 'string', description: 'Brief revenue health assessment' },
        quick_wins: { type: 'array', items: { type: 'string' }, description: '2-3 quick actions to take today' },
        follow_ups: { type: 'array', items: { type: 'string' }, description: 'Follow-up reminders' },
        summary: { type: 'string', description: '2-3 sentence executive summary of the day' },
      },
      required: ['priorities', 'risks', 'summary'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.4, task: 'dashboard-briefing',
    });
    addLog('info', `Dashboard briefing generated [${result.modelGroup}/${result.model}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Dashboard briefing failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 2. LEAD ANALYSIS — Model Group: PREMIUM
// ═══════════════════════════════════════════════════════
router.post('/lead-analysis', async (req, res) => {
  const { businessName, location, niche, website, rating, reviewCount } = req.body;
  if (!businessName) return res.status(400).json({ error: 'businessName required' });
  try {
    const provider = getActiveProvider();
    const template = getTemplate('lead-analysis');
    let prompt = template?.body || 'Analyze this business as a potential web design client: {{businessName}}';
    prompt = fillTemplate(prompt, { businessName, location: location || 'Unknown', niche: niche || 'General', website: website || 'None', rating: rating || 'N/A', reviewCount: reviewCount || '0' });

    const schema = {
      type: 'object',
      properties: {
        score: { type: 'number', description: 'Opportunity score 0-100' },
        serviceFit: { type: 'string', enum: ['Launch Care', 'Growth Care', 'Presence Care'] },
        urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
        reasons: { type: 'array', items: { type: 'string' } },
        outreachApproach: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['score', 'serviceFit', 'urgency', 'reasons', 'summary'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.3, task: 'lead-analysis',
    });
    addLog('info', `Lead analysis: "${businessName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Lead analysis failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 3. OUTREACH GENERATION — Model Group: WRITING
// ═══════════════════════════════════════════════════════
router.post('/outreach', async (req, res) => {
  const { businessName, niche, location, hasWebsite, issues, rating, style, channel } = req.body;
  if (!businessName) return res.status(400).json({ error: 'businessName required' });
  try {
    const provider = getActiveProvider();
    const template = getTemplate('outreach-opener');
    let prompt = template?.body || 'Write an outreach message for {{businessName}}.';
    prompt = fillTemplate(prompt, {
      businessName, niche: niche || '', location: location || '',
      hasWebsite: hasWebsite ? 'Yes' : 'No', issues: issues || 'None noted',
      rating: rating || 'N/A', style: style || 'professional', channel: channel || 'email',
    });

    const result = await provider.generate(prompt, {
      ...getConfig(), temperature: 0.6, task: 'outreach',
    });
    addLog('info', `Outreach generated for "${businessName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Outreach failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 4. CONTENT GENERATION — Model Group: CONTENT
// ═══════════════════════════════════════════════════════
router.post('/content-generate', async (req, res) => {
  const { contentType, format, brief, template: tmpl } = req.body;
  try {
    const provider = getActiveProvider();
    const tpl = getTemplate('content-generate');
    let prompt = tpl?.body || `Generate Instagram content for a web design agency.
Content Type: {{contentType}}
Format: {{format}}
Template Style: {{template}}
Brief: {{brief}}

Respond with a JSON object containing: headline, subline, body, cta, caption, hashtags`;

    prompt = fillTemplate(prompt, {
      contentType: contentType || 'Package Promo',
      format: format || 'post (1080x1080)',
      template: tmpl || 'Minimal Dark',
      brief: brief || 'Promote web design services',
    });

    const schema = {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subline: { type: 'string' },
        body: { type: 'string' },
        cta: { type: 'string' },
        caption: { type: 'string' },
        hashtags: { type: 'string' },
      },
      required: ['headline', 'subline', 'body', 'cta', 'caption', 'hashtags'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.7, task: 'content-generate',
    });
    addLog('info', `Content generated: ${contentType} [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Content generation failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 5. INVOICE EXPLANATION — Model Group: FAST
// ═══════════════════════════════════════════════════════
router.post('/invoice-explanation', async (req, res) => {
  const { invoiceId, clientName, lineItems, subtotal, total, dueDate } = req.body;
  try {
    const provider = getActiveProvider();
    const template = getTemplate('invoice-explanation');
    let prompt = template?.body || 'Explain this invoice for {{clientName}}.';
    prompt = fillTemplate(prompt, {
      invoiceId: invoiceId || '', clientName: clientName || '',
      lineItems: lineItems || '', subtotal: subtotal || '',
      total: total || '', dueDate: dueDate || '',
    });

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One-paragraph plain-language explanation' },
        lineExplanations: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, explanation: { type: 'string' } } } },
        paymentNote: { type: 'string', description: 'Friendly payment reminder' },
      },
      required: ['summary', 'lineExplanations'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.3, task: 'invoice-explanation',
    });
    addLog('info', `Invoice explanation: ${invoiceId} [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Invoice explanation failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 6. CLIENT SUMMARY — Model Group: FAST
// ═══════════════════════════════════════════════════════
router.post('/client-summary', async (req, res) => {
  const { clientName, package: pkg, mrr, since, healthScore, editsUsed, editsTotal, openInvoices, notes } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });
  try {
    const provider = getActiveProvider();
    const template = getTemplate('client-summary');
    let prompt = template?.body || 'Summarize client relationship for {{clientName}}.';
    prompt = fillTemplate(prompt, {
      clientName, package: pkg || 'Presence Care', mrr: mrr || '200',
      since: since || '2025-01', healthScore: healthScore || '85',
      editsUsed: editsUsed || '0', editsTotal: editsTotal || '4',
      openInvoices: openInvoices || '0', notes: notes || 'No recent notes',
    });

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Relationship health summary (2-3 sentences)' },
        risks: { type: 'array', items: { type: 'string' }, description: 'Client-specific risks' },
        upsellOpportunities: { type: 'array', items: { type: 'string' } },
        nextActions: { type: 'array', items: { type: 'string' }, description: 'Recommended next steps' },
        meetingNotes: { type: 'string', description: 'Quick prep notes if meeting this client' },
        renewalOutlook: { type: 'string', description: 'Likelihood and timing of renewal' },
      },
      required: ['summary', 'risks', 'nextActions'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.4, task: 'client-summary',
    });
    addLog('info', `Client summary: "${clientName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Client summary failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 7. PROPOSAL DRAFT — Model Group: WRITING
// ═══════════════════════════════════════════════════════
router.post('/proposal-draft', async (req, res) => {
  const { clientName, businessType, package: pkg, scope, budget, timeline, notes } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });
  try {
    const provider = getActiveProvider();
    const template = getTemplate('proposal-draft');
    let prompt = template?.body || 'Draft a professional web design proposal for {{clientName}}.';
    prompt = fillTemplate(prompt, {
      clientName, businessType: businessType || 'Local Business',
      package: pkg || 'Growth Care', scope: scope || 'Website design and development',
      budget: budget || 'Standard package pricing',
    });

    if (timeline) prompt += `\nTimeline: ${timeline}`;
    if (notes) prompt += `\nAdditional notes: ${notes}`;

    const schema = {
      type: 'object',
      properties: {
        executiveSummary: { type: 'string', description: 'Professional opening paragraph' },
        problemStatement: { type: 'string', description: 'What the client needs and why' },
        scope: { type: 'array', items: { type: 'string' }, description: 'Scope items' },
        deliverables: { type: 'array', items: { type: 'string' }, description: 'What they receive' },
        timeline: { type: 'string', description: 'Project timeline' },
        investment: { type: 'object', properties: { total: { type: 'string' }, breakdown: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, amount: { type: 'string' } } } } } },
        whyUs: { type: 'string', description: 'Why Cloz Digital is the right choice' },
        nextSteps: { type: 'array', items: { type: 'string' } },
      },
      required: ['executiveSummary', 'scope', 'deliverables', 'timeline', 'investment'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.5, maxTokens: 4096, task: 'proposal-draft',
    });
    addLog('info', `Proposal draft: "${clientName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Proposal draft failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 8. MAINTENANCE SUMMARY — Model Group: FAST
// ═══════════════════════════════════════════════════════
router.post('/maintenance-summary', async (req, res) => {
  const { clientName, website, period, workItems, hoursUsed, hoursTotal } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });
  try {
    const provider = getActiveProvider();
    const template = getTemplate('maintenance-summary');
    let prompt = template?.body || `Summarize maintenance work performed.
Client: {{clientName}}
Site: {{website}}
Period: {{period}}
Work Items: {{workItems}}`;
    prompt = fillTemplate(prompt, {
      clientName, website: website || 'N/A',
      period: period || 'This month', workItems: workItems || 'General maintenance',
    });

    if (hoursUsed) prompt += `\nHours used: ${hoursUsed}/${hoursTotal || '∞'}`;

    const schema = {
      type: 'object',
      properties: {
        clientSummary: { type: 'string', description: 'Client-friendly summary paragraph' },
        technicalNotes: { type: 'string', description: 'Internal technical notes' },
        recommendations: { type: 'array', items: { type: 'string' }, description: 'Recommendations for next period' },
        concerns: { type: 'array', items: { type: 'string' }, description: 'Any issues or concerns noticed' },
        upsellOpportunity: { type: 'string', description: 'Potential upsell based on work done' },
      },
      required: ['clientSummary', 'technicalNotes', 'recommendations'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.4, task: 'maintenance-summary',
    });
    addLog('info', `Maintenance summary: "${clientName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Maintenance summary failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 9. REWRITE — Model Group: UTILITY
// ═══════════════════════════════════════════════════════
router.post('/rewrite', async (req, res) => {
  const { text, tone, purpose, language } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const provider = getActiveProvider();
    const prompt = `Rewrite the following text.

Tone: ${tone || 'professional'}
Purpose: ${purpose || 'general improvement'}
${language ? `Output language: ${language}` : ''}

Original text:
${text}

Provide the rewritten version. Keep the meaning intact while improving clarity, flow, and tone. If a specific language was requested, translate while rewriting.`;

    const result = await provider.generate(prompt, {
      ...getConfig(), temperature: 0.5, task: 'rewrite',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 10. SUMMARIZE — Model Group: UTILITY
// ═══════════════════════════════════════════════════════
router.post('/summarize', async (req, res) => {
  const { text, length, format } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const provider = getActiveProvider();
    const prompt = `Summarize the following content.

Target length: ${length || 'concise (2-3 sentences)'}
Format: ${format || 'paragraph'}

Content:
${text}

Provide a clear, accurate summary that captures the key points.`;

    const result = await provider.generate(prompt, {
      ...getConfig(), temperature: 0.3, task: 'summarize',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 11. TRANSLATE — Model Group: UTILITY
// ═══════════════════════════════════════════════════════
router.post('/translate', async (req, res) => {
  const { text, from, to, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!to) return res.status(400).json({ error: 'target language (to) required' });
  try {
    const provider = getActiveProvider();
    const prompt = `Translate the following text${from ? ` from ${from}` : ''} to ${to}.
${context ? `Context: ${context} (use appropriate terminology for this context)` : ''}

Text to translate:
${text}

Provide only the translated text with no additional commentary. Maintain the original tone and formatting.`;

    const result = await provider.generate(prompt, {
      ...getConfig(), temperature: 0.2, task: 'translate',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 12. PACKAGE SUGGESTION — Model Group: PREMIUM
// ═══════════════════════════════════════════════════════
router.post('/package-suggest', async (req, res) => {
  const { clientName, currentPackage, mrr, since, usage, painPoints, goals } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });
  try {
    const provider = getActiveProvider();

    const prompt = `Recommend a package change for this Cloz Digital client.

Client: ${clientName}
Current Package: ${currentPackage || 'None'}
Current MRR: ${mrr || '0'} BAM
Client Since: ${since || 'Unknown'}
Usage/Activity: ${usage || 'Standard usage'}
Pain Points: ${painPoints || 'None reported'}
Goals: ${goals || 'Not specified'}

CLOZ DIGITAL PACKAGES:
- Launch Care: One-time website builds from 800 BAM (for businesses needing a new or rebuilt site)
- Presence Care: Basic maintenance + hosting from 217 BAM/month (for sites that just need upkeep)
- Growth Care: Ongoing management + optimization from 325 BAM/month (for businesses wanting growth)
- Custom: Tailored packages for complex needs

Provide a recommendation with clear reasoning. Be honest — if they're on the right package, say so.`;

    const schema = {
      type: 'object',
      properties: {
        recommendation: { type: 'string', enum: ['Stay on current', 'Upgrade', 'Downgrade', 'Add service', 'Custom package'] },
        suggestedPackage: { type: 'string' },
        reasoning: { type: 'string' },
        approach: { type: 'string', description: 'How to present this to the client' },
        revenueImpact: { type: 'string', description: 'Expected MRR change' },
        timing: { type: 'string', description: 'When to bring this up' },
      },
      required: ['recommendation', 'suggestedPackage', 'reasoning'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.4, task: 'package-suggest',
    });
    addLog('info', `Package suggestion: "${clientName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Package suggestion failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 13. REVENUE INSIGHT — Model Group: FORECAST
// ═══════════════════════════════════════════════════════
router.post('/revenue-insight', async (req, res) => {
  const { totalMRR, clientCount, avgMRR, growthRate, churnedClients, newClients, topClients, pipeline } = req.body;
  try {
    const provider = getActiveProvider();

    const prompt = `Analyze revenue health for Cloz Digital (web design agency, Bosnia).

Metrics:
- Total MRR: ${totalMRR || '0'} BAM
- Active clients: ${clientCount || '0'}
- Average MRR per client: ${avgMRR || '0'} BAM
- Growth rate: ${growthRate || 'Unknown'}
- Churned this month: ${churnedClients || '0'}
- New this month: ${newClients || '0'}
- Top clients: ${topClients || 'Not specified'}
- Pipeline value: ${pipeline || 'Unknown'}

Provide actionable revenue insights. Focus on practical steps to grow recurring revenue.`;

    const schema = {
      type: 'object',
      properties: {
        healthScore: { type: 'number', description: 'Revenue health 0-100' },
        summary: { type: 'string', description: '2-3 sentence health assessment' },
        strengths: { type: 'array', items: { type: 'string' } },
        concerns: { type: 'array', items: { type: 'string' } },
        actions: { type: 'array', items: { type: 'string' }, description: 'Top 3-5 revenue actions to take this week' },
        forecast: { type: 'string', description: 'Brief outlook for next 30 days' },
        upsellTargets: { type: 'array', items: { type: 'string' }, description: 'Clients most likely to upgrade' },
      },
      required: ['healthScore', 'summary', 'actions'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.4, task: 'revenue-insight',
    });
    addLog('info', `Revenue insight generated [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Revenue insight failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 14. BLOG / CONTENT DRAFT — Model Group: WRITING
// ═══════════════════════════════════════════════════════
router.post('/blog-draft', async (req, res) => {
  const { topic, audience, tone, length, keywords, contentType } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  try {
    const provider = getActiveProvider();

    const prompt = `Write a ${contentType || 'blog post'} for Cloz Digital's website.

Topic: ${topic}
Target audience: ${audience || 'Local business owners in Bosnia'}
Tone: ${tone || 'professional, approachable, educational'}
Length: ${length || 'Medium (400-600 words)'}
${keywords ? `SEO keywords to include: ${keywords}` : ''}

Context: Cloz Digital is a premium web design agency in Bosnia offering Launch Care (new sites), Presence Care (maintenance), and Growth Care (ongoing optimization). We target local businesses that need professional web presence.

Write engaging, valuable content that positions Cloz Digital as an expert. Include a clear call-to-action at the end.`;

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        metaDescription: { type: 'string', description: 'SEO meta description (150-160 chars)' },
        body: { type: 'string', description: 'Full article content in markdown' },
        excerpt: { type: 'string', description: 'Short excerpt for previews (1-2 sentences)' },
        suggestedTags: { type: 'array', items: { type: 'string' } },
        cta: { type: 'string', description: 'Call-to-action text' },
      },
      required: ['title', 'body', 'excerpt'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.6, maxTokens: 4096, task: 'blog-draft',
    });
    addLog('info', `Blog draft: "${topic}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Blog draft failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 15. NEXT ACTIONS — Model Group: PREMIUM
// ═══════════════════════════════════════════════════════
router.post('/next-actions', async (req, res) => {
  const { clientName, package: pkg, lastContact, healthScore, recentWork, openIssues, renewalDate } = req.body;
  if (!clientName) return res.status(400).json({ error: 'clientName required' });
  try {
    const provider = getActiveProvider();

    const prompt = `Recommend next actions for this client relationship.

Client: ${clientName}
Package: ${pkg || 'Unknown'}
Last contact: ${lastContact || 'Unknown'}
Health score: ${healthScore || 'Unknown'}
Recent work: ${recentWork || 'None recorded'}
Open issues: ${openIssues || 'None'}
Renewal date: ${renewalDate || 'Unknown'}

Provide specific, actionable next steps. Consider: engagement timing, upsell potential, risk mitigation, relationship maintenance.`;

    const schema = {
      type: 'object',
      properties: {
        urgentActions: { type: 'array', items: { type: 'string' }, description: 'Do this week' },
        plannedActions: { type: 'array', items: { type: 'string' }, description: 'Schedule for next 2 weeks' },
        opportunities: { type: 'array', items: { type: 'string' }, description: 'Growth or upsell opportunities' },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        riskFactors: { type: 'array', items: { type: 'string' } },
        talkingPoints: { type: 'array', items: { type: 'string' }, description: 'Points to raise in next conversation' },
      },
      required: ['urgentActions', 'plannedActions', 'riskLevel'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.4, task: 'next-actions',
    });
    addLog('info', `Next actions: "${clientName}" [${result.modelGroup}] (${result.latencyMs}ms)`);
    res.json(result);
  } catch (e) {
    addLog('error', `Next actions failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 16. EMAIL DRAFT — Model Group: COMMUNICATION
// ═══════════════════════════════════════════════════════
router.post('/email-draft', async (req, res) => {
  const { to, purpose, context, tone, points, sender = 'general' } = req.body;
  if (!purpose) return res.status(400).json({ error: 'purpose required' });

  const SENDERS = {
    anes: { name: 'Anes D.', title: 'Founder & Web Developer', email: 'anes@cloz.digital', signoff: 'Warm regards,\nAnes D.\nFounder & Web Developer\nCloz Digital\nanes@cloz.digital\nwww.cloz.digital' },
    denis: { name: 'Denis G.', title: 'Client Success Manager', email: 'denis@cloz.digital', signoff: 'Warm regards,\nDenis G.\nClient Success Manager\nCloz Digital\ndenis@cloz.digital\nwww.cloz.digital' },
    general: { name: 'Cloz Digital Team', title: 'Website Design', email: 'general@cloz.digital', signoff: 'Best regards,\nCloz Digital Team\nWebsite Design • Hosting • Maintenance\ngeneral@cloz.digital\nwww.cloz.digital' },
    billing: { name: 'Cloz Digital Billing Department', title: 'Accounts & Billing', email: 'billing@cloz.digital', signoff: 'Best regards,\nCloz Digital Billing Department\nAccounts & Billing\nCloz Digital\nbilling@cloz.digital\nwww.cloz.digital' },
  };
  const profile = SENDERS[sender] || SENDERS.general;

  try {
    const provider = getActiveProvider();

    const prompt = `You are ${profile.name}, ${profile.title} at Cloz Digital (${profile.email}).
Draft a professional email.

Recipient: ${to || 'Client'}
Purpose: ${purpose}
Context: ${context || 'Standard business communication'}
Tone: ${tone || 'professional, friendly'}
${points ? `Key points to include: ${points}` : ''}

Write a concise, effective email. End with this exact signature:
${profile.signoff}

Never use placeholder text like [Your Name]. Keep it under 200 words unless the topic requires more detail.`;

    const schema = {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
        notes: { type: 'string', description: 'Internal notes about timing or follow-up' },
      },
      required: ['subject', 'body'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.5, task: 'email-draft',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 17. VIBER MESSAGE DRAFT — Model Group: COMMUNICATION
// ═══════════════════════════════════════════════════════
router.post('/viber-draft', async (req, res) => {
  const { to, purpose, context, tone } = req.body;
  if (!purpose) return res.status(400).json({ error: 'purpose required' });
  try {
    const provider = getActiveProvider();

    const prompt = `Draft a short Viber message for Cloz Digital.

Recipient: ${to || 'Client'}
Purpose: ${purpose}
Context: ${context || ''}
Tone: ${tone || 'casual-professional'}

Viber messages should be short (2-4 sentences), friendly, and to the point. Use a conversational but professional tone appropriate for the Balkans business culture. No formal sign-offs — just the message.`;

    const result = await provider.generate(prompt, {
      ...getConfig(), temperature: 0.6, maxTokens: 512, task: 'viber-draft',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// 18. QUICK GENERATE (freeform) — Model Group: DEFAULT
// ═══════════════════════════════════════════════════════
router.post('/generate', async (req, res) => {
  const { prompt, temperature, systemInstruction, maxTokens } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const provider = getActiveProvider();
    const result = await provider.generate(prompt, {
      ...getConfig(),
      temperature: temperature || 0.7,
      systemInstruction: systemInstruction || undefined,
      maxTokens: maxTokens || undefined,
      task: 'generate',
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
