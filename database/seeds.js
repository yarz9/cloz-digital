import { v4 as uuid } from 'uuid';

export function seedDefaults(db) {
  // --- Config defaults ---
  const cfgStmt = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
  const cfgDefaults = [
    ['provider', 'cerebras'],
    ['model', 'qwen-3-235b-a22b-instruct-2507'],
    ['temperature', '0.7'],
    ['maxTokens', '2048'],
    ['timeout', '30000'],
    ['retries', '2'],
  ];
  for (const [k, v] of cfgDefaults) cfgStmt.run(k, v);

  // --- Feature defaults ---
  const ftStmt = db.prepare('INSERT OR IGNORE INTO features (key, enabled) VALUES (?, ?)');
  const ftDefaults = [
    ['lead_analysis', 1],
    ['proposal_drafting', 1],
    ['invoice_ai', 1],
    ['maintenance_summaries', 1],
    ['outreach_generator', 1],
    ['dashboard_assistant', 1],
    ['debug_mode', 0],
    ['structured_output', 1],
    ['function_calling', 0],
  ];
  for (const [k, v] of ftDefaults) ftStmt.run(k, v);

  // --- Prompt template defaults ---
  const ptStmt = db.prepare('INSERT OR IGNORE INTO prompts (id, title, slug, category, body, description) VALUES (?, ?, ?, ?, ?, ?)');
  const prompts = [
    {
      title: 'Lead Analysis', slug: 'lead-analysis', category: 'scout',
      body: `Analyze this business as a potential web design client.

Business: {{businessName}}
Location: {{location}}
Niche: {{niche}}
Website: {{website}}
Google Rating: {{rating}} ({{reviewCount}} reviews)

Provide a JSON object with:
- score (0-100)
- serviceFit ("Launch Care" | "Growth Care" | "Presence Care")
- urgency ("low" | "medium" | "high")
- reasons (array of 3 strings)
- outreachApproach (string)
- summary (1-2 sentence summary)`,
      description: 'Structured lead analysis for client scout',
    },
    {
      title: 'Proposal Draft', slug: 'proposal-draft', category: 'proposals',
      body: `Draft a professional web design proposal.

Client: {{clientName}}
Business Type: {{businessType}}
Package: {{package}}
Scope: {{scope}}
Budget Range: {{budget}}

Include: executive summary, scope of work, deliverables, timeline, investment breakdown.
Tone: professional, confident, concise.`,
      description: 'Generates proposal drafts for prospects',
    },
    {
      title: 'Client Summary', slug: 'client-summary', category: 'clients',
      body: `Summarize this client relationship for a quick review.

Client: {{clientName}}
Package: {{package}}
MRR: {{mrr}} BAM
Since: {{since}}
Health Score: {{healthScore}}
Edits Used: {{editsUsed}}/{{editsTotal}}
Open Invoices: {{openInvoices}}
Notes: {{notes}}

Provide: relationship summary, key risks, upsell opportunities, next actions, meeting prep points.`,
      description: 'Quick client relationship summary',
    },
    {
      title: 'Invoice Explanation', slug: 'invoice-explanation', category: 'billing',
      body: `Explain this invoice in plain language for the client.

Invoice: {{invoiceId}}
Client: {{clientName}}
Items: {{lineItems}}
Subtotal: {{subtotal}}
Total: {{total}}
Due: {{dueDate}}

Provide a clear, professional explanation of each charge.`,
      description: 'Client-friendly invoice breakdown',
    },
    {
      title: 'Maintenance Summary', slug: 'maintenance-summary', category: 'maintenance',
      body: `Summarize maintenance work performed.

Client: {{clientName}}
Site: {{website}}
Period: {{period}}
Work Items: {{workItems}}

Generate: client summary paragraph, technical notes, next month recommendations, concerns.`,
      description: 'Monthly maintenance report summary',
    },
    {
      title: 'Outreach Opener', slug: 'outreach-opener', category: 'scout',
      body: `Write an outreach message for this potential client.

Business: {{businessName}}
Niche: {{niche}}
Location: {{location}}
Has Website: {{hasWebsite}}
Website Issues: {{issues}}
Google Rating: {{rating}}
Style: {{style}}
Channel: {{channel}}

Write a short, professional, non-pushy opener. Be specific. Max 4-5 sentences.`,
      description: 'Personalized outreach message generator',
    },
    {
      title: 'Content Generate', slug: 'content-generate', category: 'content',
      body: `Generate Instagram content for a web design agency called Cloz Digital.

Content Type: {{contentType}}
Format: {{format}}
Template Style: {{template}}
Brief: {{brief}}

Respond with a JSON object containing:
- headline: bold text for the graphic (2-3 lines max, use \\n for line breaks)
- subline: short supporting text (pricing or benefit, under 10 words)
- body: main body copy for the graphic (1-2 sentences)
- cta: call-to-action text (1 short sentence)
- caption: full Instagram caption (2-3 paragraphs with emoji, bullet points using checkmarks)
- hashtags: 8-12 relevant hashtags as a single string

Brand context: Premium web design agency in Bosnia. Packages: Launch Care (from 800 BAM), Presence Care (from 200 BAM/mo), Growth Care (from 350 BAM/mo). Tone: confident, minimal, professional.`,
      description: 'Instagram content generator with structured output',
    },
    {
      title: 'Dashboard Briefing', slug: 'dashboard-briefing', category: 'dashboard',
      body: `Generate a daily briefing summary.

Date: {{date}}
Active Clients: {{activeClients}}
Overdue Invoices: {{overdueInvoices}}
Expiring Domains: {{expiringDomains}}
New Leads: {{newLeads}}
Pending Tasks: {{pendingTasks}}
Recent Activity: {{recentActivity}}

Provide: top 3 priorities, key risks, revenue status, quick wins, follow-up reminders.`,
      description: 'AI daily briefing for dashboard',
    },
  ];
  for (const p of prompts) {
    ptStmt.run(uuid(), p.title, p.slug, p.category, p.body, p.description);
  }

  // --- Tool defaults ---
  const tlStmt = db.prepare('INSERT OR IGNORE INTO tools (id, name, description, parameters) VALUES (?, ?, ?, ?)');
  const tools = [
    { name: 'saveLeadAnalysis', description: 'Save structured lead analysis result', parameters: { type: 'object', properties: { businessName: { type: 'string' }, score: { type: 'number' }, serviceFit: { type: 'string' }, urgency: { type: 'string' }, reasons: { type: 'array', items: { type: 'string' } } }, required: ['businessName', 'score'] } },
    { name: 'createProposalDraft', description: 'Create and save a proposal draft', parameters: { type: 'object', properties: { clientName: { type: 'string' }, packageType: { type: 'string' }, summary: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } }, investment: { type: 'number' } }, required: ['clientName', 'summary'] } },
    { name: 'generateInvoiceReminder', description: 'Generate a payment reminder', parameters: { type: 'object', properties: { clientName: { type: 'string' }, invoiceId: { type: 'string' }, amount: { type: 'number' }, daysOverdue: { type: 'number' }, tone: { type: 'string', enum: ['gentle', 'firm', 'final'] } }, required: ['clientName', 'invoiceId'] } },
    { name: 'summarizeClientNotes', description: 'Summarize client notes', parameters: { type: 'object', properties: { clientName: { type: 'string' }, notes: { type: 'array', items: { type: 'string' } } }, required: ['clientName', 'notes'] } },
  ];
  for (const t of tools) {
    tlStmt.run(uuid(), t.name, t.description, JSON.stringify(t.parameters));
  }

  // --- Schema defaults ---
  const scStmt = db.prepare('INSERT OR IGNORE INTO schemas (id, name, category, schema, description) VALUES (?, ?, ?, ?, ?)');
  const schemas = [
    {
      name: 'Lead Analysis Result', category: 'scout',
      schema: { type: 'object', properties: { score: { type: 'number' }, serviceFit: { type: 'string', enum: ['Launch Care', 'Growth Care', 'Presence Care'] }, urgency: { type: 'string', enum: ['low', 'medium', 'high'] }, reasons: { type: 'array', items: { type: 'string' } }, outreachApproach: { type: 'string' }, summary: { type: 'string' } }, required: ['score', 'serviceFit', 'urgency', 'reasons', 'summary'] },
      description: 'Schema for structured lead analysis output',
    },
    {
      name: 'Proposal Summary', category: 'proposals',
      schema: { type: 'object', properties: { executiveSummary: { type: 'string' }, scope: { type: 'array', items: { type: 'string' } }, deliverables: { type: 'array', items: { type: 'string' } }, timeline: { type: 'string' }, investment: { type: 'object', properties: { total: { type: 'number' }, breakdown: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, amount: { type: 'number' } } } } } } }, required: ['executiveSummary', 'scope', 'timeline', 'investment'] },
      description: 'Schema for structured proposal output',
    },
    {
      name: 'Invoice Explanation', category: 'billing',
      schema: { type: 'object', properties: { summary: { type: 'string' }, lineExplanations: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, explanation: { type: 'string' } } } }, paymentNote: { type: 'string' } }, required: ['summary', 'lineExplanations'] },
      description: 'Schema for invoice explanation output',
    },
  ];
  for (const s of schemas) {
    scStmt.run(uuid(), s.name, s.category, JSON.stringify(s.schema), s.description);
  }
}
