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

  // --- Mail template defaults ---
  const mtStmt = db.prepare('INSERT OR IGNORE INTO mail_templates (id, name, category, subject, body, default_account, variables) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const mailTemplates = [
    { name: 'Lead Outreach', category: 'outreach', subject: 'Website Opportunity for {{businessName}}', body: 'Hi {{contactName}},\n\nI noticed {{businessName}} could benefit from a stronger online presence. At Cloz Digital, we specialize in building websites that convert visitors into customers.\n\nWould you be open to a quick chat about how we could help?\n\n{{signature}}', defaultAccount: 'anes', variables: ['businessName', 'contactName'] },
    { name: 'Follow-Up', category: 'outreach', subject: 'Following up — {{businessName}}', body: 'Hi {{contactName}},\n\nJust wanted to follow up on my previous message. I understand you are busy — would a quick 10-minute call work better?\n\nHappy to work around your schedule.\n\n{{signature}}', defaultAccount: 'anes', variables: ['businessName', 'contactName'] },
    { name: 'Proposal Delivery', category: 'sales', subject: 'Your Website Proposal — {{businessName}}', body: 'Hi {{contactName}},\n\nThank you for taking the time to discuss your website needs. Please find the attached proposal outlining our recommended approach for {{businessName}}.\n\nI am available to walk you through the details at your convenience.\n\n{{signature}}', defaultAccount: 'anes', variables: ['businessName', 'contactName'] },
    { name: 'Welcome / Onboarding', category: 'client', subject: 'Welcome to Cloz Digital — Getting Started', body: 'Hi {{contactName}},\n\nWelcome aboard! We are excited to work with {{businessName}}.\n\nHere is what happens next:\n1. We will schedule a kickoff call\n2. You will receive access to your project dashboard\n3. We begin the design phase\n\nFeel free to reach out anytime.\n\n{{signature}}', defaultAccount: 'denis', variables: ['businessName', 'contactName'] },
    { name: 'Maintenance Update', category: 'client', subject: 'Monthly Maintenance Report — {{businessName}}', body: 'Hi {{contactName}},\n\nHere is your monthly maintenance summary for {{businessName}}:\n\n{{maintenanceDetails}}\n\nEverything is running smoothly. Let us know if you have any questions.\n\n{{signature}}', defaultAccount: 'denis', variables: ['businessName', 'contactName', 'maintenanceDetails'] },
    { name: 'Support Response', category: 'support', subject: 'Re: {{originalSubject}}', body: 'Hi {{contactName}},\n\nThank you for reaching out. We have looked into your request and here is what we found:\n\n{{responseDetails}}\n\nPlease let us know if you need anything else.\n\n{{signature}}', defaultAccount: 'general', variables: ['contactName', 'originalSubject', 'responseDetails'] },
    { name: 'Renewal Reminder', category: 'billing', subject: 'Upcoming Renewal — {{serviceName}}', body: 'Hi {{contactName}},\n\nThis is a friendly reminder that your {{serviceName}} subscription is coming up for renewal on {{renewalDate}}.\n\nCurrent plan: {{planName}}\nRenewal amount: EUR {{amount}}\n\nNo action is needed if you would like to continue. If you have any questions or wish to make changes, please let us know before the renewal date.\n\n{{signature}}', defaultAccount: 'billing', variables: ['contactName', 'serviceName', 'renewalDate', 'planName', 'amount'] },
    { name: 'Invoice Delivery', category: 'billing', subject: 'Invoice {{invoiceNumber}} — Cloz Digital', body: 'Hi {{contactName}},\n\nPlease find attached your invoice for services rendered.\n\nInvoice: {{invoiceNumber}}\nAmount: EUR {{amount}}\nDue Date: {{dueDate}}\n\nPayment can be made via bank transfer using the details on the invoice.\n\nThank you for your continued trust in Cloz Digital.\n\n{{signature}}', defaultAccount: 'billing', variables: ['contactName', 'invoiceNumber', 'amount', 'dueDate'] },
    { name: 'Payment Receipt', category: 'billing', subject: 'Payment Received — Thank You', body: 'Hi {{contactName}},\n\nWe have received your payment of EUR {{amount}} for invoice {{invoiceNumber}}.\n\nThank you for your prompt payment. Your account is up to date.\n\n{{signature}}', defaultAccount: 'billing', variables: ['contactName', 'amount', 'invoiceNumber'] },
    { name: 'Overdue Reminder', category: 'billing', subject: 'Payment Reminder — Invoice {{invoiceNumber}}', body: 'Hi {{contactName}},\n\nWe hope this message finds you well. We wanted to bring to your attention that invoice {{invoiceNumber}} for EUR {{amount}} is currently {{daysOverdue}} days past due.\n\nIf you have already made the payment, please disregard this message. Otherwise, we would appreciate your prompt attention to this matter.\n\n{{signature}}', defaultAccount: 'billing', variables: ['contactName', 'invoiceNumber', 'amount', 'daysOverdue'] },
    { name: 'Final Notice', category: 'billing', subject: 'Final Notice — Invoice {{invoiceNumber}}', body: 'Dear {{contactName}},\n\nDespite previous reminders, invoice {{invoiceNumber}} for EUR {{amount}} remains unpaid. This invoice is now {{daysOverdue}} days overdue.\n\nPlease arrange payment within 7 days to avoid service interruption. If you are experiencing difficulties, please contact us to discuss payment arrangements.\n\n{{signature}}', defaultAccount: 'billing', variables: ['contactName', 'invoiceNumber', 'amount', 'daysOverdue'] },
    { name: 'Refund Confirmation', category: 'billing', subject: 'Refund Processed — EUR {{amount}}', body: 'Hi {{contactName}},\n\nWe have processed a refund of EUR {{amount}} to your original payment method.\n\nReason: {{reason}}\nExpected processing time: 5-10 business days\n\nPlease contact us if you do not see the refund within this timeframe.\n\n{{signature}}', defaultAccount: 'billing', variables: ['contactName', 'amount', 'reason'] },
  ];
  for (const t of mailTemplates) {
    mtStmt.run(uuid(), t.name, t.category, t.subject, t.body, t.defaultAccount, JSON.stringify(t.variables));
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
