// database/seedOps.js — Seeds the SOP library and legal templates on boot
// Idempotent: only inserts if the slug doesn't already exist.

import { v4 as uuid } from 'uuid';

// ══════════════════════════════════════════════════════════════
//  CORE SOP LIBRARY
// ══════════════════════════════════════════════════════════════

const SOPS = [
  {
    slug: 'website-design-launch-care',
    title: 'Website Design & Development (Launch Care)',
    category: 'service-delivery',
    description: 'End-to-end delivery of a Launch Care website from kickoff to handover.',
    default_owner: 'anes',
    estimated_duration: '2-3 weeks',
    tags: ['design', 'development', 'launch-care'],
    steps: [
      { title: 'Discovery call', description: 'Understand business, audience, goals, scope.', owner: 'denis', due_offset_days: 0,
        checklist: ['Schedule kickoff call', 'Discuss goals + audience', 'Confirm package + scope', 'Send recap email'] },
      { title: 'Asset collection', description: 'Gather logo, photos, copy, brand colors, content.', owner: 'denis', due_offset_days: 3,
        checklist: ['Share asset checklist', 'Set up shared folder', 'Collect logo + brand', 'Collect content drafts'] },
      { title: 'Wireframes', description: 'Low-fidelity layout for all pages.', owner: 'anes', due_offset_days: 5,
        checklist: ['Sketch homepage', 'Sketch inner pages', 'Map content hierarchy', 'Internal review'] },
      { title: 'Design mockups', description: 'High-fidelity visual designs.', owner: 'anes', due_offset_days: 8,
        checklist: ['Homepage mockup', 'Inner page mockups', 'Mobile mockups', 'Send to client for approval'] },
      { title: 'Client design approval', description: 'Capture client sign-off before development.', owner: 'denis', due_offset_days: 10,
        checklist: ['Upload to portal approvals', 'Client review meeting', 'Incorporate revisions', 'Final approval'] },
      { title: 'Development', description: 'Build the site to spec.', owner: 'anes', due_offset_days: 14,
        checklist: ['Set up repo', 'Build components', 'Build pages', 'Wire forms + integrations', 'Mobile + tablet check'] },
      { title: 'QA + accessibility audit', description: 'Cross-browser, performance, accessibility checks.', owner: 'anes', due_offset_days: 15,
        checklist: ['Cross-browser test', 'Lighthouse audit', 'Forms tested', 'Broken-link check', 'Screen-reader pass'] },
      { title: 'Hosting + DNS + SSL', description: 'Production deployment and DNS configuration.', owner: 'anes', due_offset_days: 16,
        checklist: ['Set up hosting', 'Configure DNS', 'Issue SSL cert', 'Set up redirects', 'Final smoke test'] },
      { title: 'Launch + training', description: 'Go live and train client on the CMS.', owner: 'denis', due_offset_days: 17,
        checklist: ['Final go-live', 'Submit sitemap to Google', 'Record training video', 'Send launch announcement'] },
      { title: 'Maintenance activation', description: 'Hand over and optionally activate Presence Care.', owner: 'denis', due_offset_days: 20,
        checklist: ['Issue final invoice', 'Send handover doc', 'Offer Presence Care', 'Close project in CRM'] },
    ],
  },
  {
    slug: 'website-redesign',
    title: 'Website Redesign',
    category: 'service-delivery',
    description: 'Replatform or modernize an existing website.',
    default_owner: 'anes',
    estimated_duration: '4-6 weeks',
    tags: ['redesign', 'growth-care'],
    steps: [
      { title: 'Audit existing site', owner: 'denis', due_offset_days: 0,
        checklist: ['Tech audit', 'SEO audit', 'Content audit', 'Analytics review'] },
      { title: 'Redesign strategy', owner: 'anes', due_offset_days: 3,
        checklist: ['Conversion goals', 'Information architecture', 'Component inventory', 'Migration plan'] },
      { title: 'Design phase', owner: 'anes', due_offset_days: 14, checklist: ['Wireframes', 'Mockups', 'Client approval'] },
      { title: 'Build + content migration', owner: 'anes', due_offset_days: 28, checklist: ['Component build', 'Page build', 'Content migrated', '301 redirects mapped'] },
      { title: 'QA + SEO carry-over', owner: 'anes', due_offset_days: 30, checklist: ['Cross-browser', 'Mobile', 'Redirects tested', 'Meta tags transferred'] },
      { title: 'Launch + monitoring', owner: 'denis', due_offset_days: 32, checklist: ['Go-live', 'Monitor 404s', 'Submit updated sitemap', 'Track rankings'] },
    ],
  },
  {
    slug: 'seo-campaign',
    title: 'SEO Campaign Kickoff',
    category: 'marketing',
    description: 'Stand up an SEO program for a new or existing client.',
    default_owner: 'denis',
    estimated_duration: '2 weeks setup + ongoing',
    tags: ['seo', 'recurring'],
    steps: [
      { title: 'SEO audit', owner: 'denis', due_offset_days: 0,
        checklist: ['Technical crawl', 'On-page audit', 'Backlink snapshot', 'Competitor scan'] },
      { title: 'Keyword strategy', owner: 'denis', due_offset_days: 3,
        checklist: ['Seed keywords', 'Cluster keywords', 'Intent map', 'Priority list'] },
      { title: 'Quick wins', owner: 'denis', due_offset_days: 5,
        checklist: ['Title/meta fixes', 'Internal linking', 'Schema markup', 'Sitemap submit'] },
      { title: 'Content calendar (90 days)', owner: 'denis', due_offset_days: 7,
        checklist: ['Topic list', 'Briefs scheduled', 'Author assigned', 'Approval cadence set'] },
      { title: 'Monthly tracking', owner: 'denis', due_offset_days: 30,
        checklist: ['Rank tracking', 'GSC review', 'GA4 conversion review', 'Monthly report drafted'] },
    ],
  },
  {
    slug: 'local-seo-setup',
    title: 'Local SEO Setup',
    category: 'marketing',
    description: 'Optimize Google Business Profile and local citations.',
    default_owner: 'denis',
    estimated_duration: '1 week + monthly review',
    tags: ['seo', 'local', 'gbp'],
    steps: [
      { title: 'GBP audit + optimization', owner: 'denis', due_offset_days: 0,
        checklist: ['Claim/verify', 'Categories + services', 'Photos + posts', 'Hours + attributes'] },
      { title: 'Citation building', owner: 'denis', due_offset_days: 3,
        checklist: ['Top 10 local directories', 'NAP consistency check', 'Submit to industry directories'] },
      { title: 'Review acquisition setup', owner: 'denis', due_offset_days: 5,
        checklist: ['Review request template', 'Email + QR card', 'Response templates'] },
      { title: 'Monthly local review', owner: 'denis', due_offset_days: 30,
        checklist: ['GBP insights review', 'New reviews response', 'Posts published', 'Local rank tracker'] },
    ],
  },
  {
    slug: 'google-ads-launch',
    title: 'Google Ads Campaign Launch',
    category: 'marketing',
    description: 'Build, launch, and optimize a Google Ads search campaign.',
    default_owner: 'denis',
    estimated_duration: '1 week setup + ongoing',
    tags: ['ads', 'paid', 'google'],
    steps: [
      { title: 'Campaign brief', owner: 'denis', due_offset_days: 0, checklist: ['Goals', 'Budget', 'Geo', 'Audience'] },
      { title: 'Keyword + negative research', owner: 'denis', due_offset_days: 1, checklist: ['Seed terms', 'Match types', 'Negative list'] },
      { title: 'Ad copy + extensions', owner: 'denis', due_offset_days: 2, checklist: ['15 headlines', '4 descriptions', 'Sitelinks', 'Callouts'] },
      { title: 'Landing page review', owner: 'anes', due_offset_days: 3, checklist: ['Match intent', 'Speed check', 'CTA above fold', 'Conversion tracking'] },
      { title: 'Launch + conversion tracking', owner: 'denis', due_offset_days: 5, checklist: ['Pixel installed', 'Goals in GA4', 'Final budget check', 'Activate campaign'] },
      { title: 'Weekly optimization', owner: 'denis', due_offset_days: 12, checklist: ['Search terms review', 'Negative keyword additions', 'Bid adjustments', 'Ad copy A/B'] },
    ],
  },
  {
    slug: 'meta-ads-launch',
    title: 'Meta Ads Campaign Launch',
    category: 'marketing',
    description: 'Plan and launch a Facebook/Instagram ad campaign.',
    default_owner: 'denis',
    estimated_duration: '1 week setup + ongoing',
    tags: ['ads', 'paid', 'meta'],
    steps: [
      { title: 'Offer + audience plan', owner: 'denis', due_offset_days: 0, checklist: ['Offer defined', 'Core audience', 'Lookalike sources', 'Retargeting'] },
      { title: 'Creative production', owner: 'denis', due_offset_days: 2, checklist: ['3 ad variants', 'Static + reel versions', 'Brand-on-spec'] },
      { title: 'Pixel + conversion API', owner: 'anes', due_offset_days: 3, checklist: ['Pixel installed', 'CAPI configured', 'Test events fire'] },
      { title: 'Campaign build + launch', owner: 'denis', due_offset_days: 4, checklist: ['Audiences set', 'Placements selected', 'Budget allocated', 'Launch'] },
      { title: 'Weekly optimization', owner: 'denis', due_offset_days: 11, checklist: ['Frequency check', 'Creative refresh', 'Audience trim', 'Spend reallocation'] },
    ],
  },
  {
    slug: 'monthly-maintenance',
    title: 'Monthly Maintenance (Presence Care)',
    category: 'recurring',
    description: 'Recurring monthly maintenance for a Presence Care client.',
    default_owner: 'anes',
    estimated_duration: '1-2 hours',
    tags: ['maintenance', 'recurring', 'presence-care'],
    steps: [
      { title: 'Backup verification', owner: 'anes', due_offset_days: 0, checklist: ['Full backup created', 'Restore test', 'Off-site copy verified'] },
      { title: 'Updates + patches', owner: 'anes', due_offset_days: 0, checklist: ['Plugin/framework updates', 'Security patches', 'Post-update smoke test'] },
      { title: 'Performance check', owner: 'anes', due_offset_days: 0, checklist: ['Lighthouse run', 'Uptime review', 'Disk + bandwidth check'] },
      { title: 'Content updates (2/month)', owner: 'denis', due_offset_days: 0, checklist: ['Requested changes', 'Image optimization', 'Final review'] },
      { title: 'Monthly client report', owner: 'denis', due_offset_days: 0, checklist: ['Compile report', 'Add metrics', 'Publish to portal', 'Email summary'] },
    ],
  },
  {
    slug: 'client-onboarding',
    title: 'Client Onboarding (Proposal Accepted)',
    category: 'operations',
    description: 'Standard onboarding once a proposal is signed.',
    default_owner: 'denis',
    estimated_duration: '3 business days',
    tags: ['onboarding', 'operations'],
    steps: [
      { title: 'Welcome + portal access', owner: 'denis', due_offset_days: 0, checklist: ['Welcome email sent', 'Portal account created', 'Brand kit collected'] },
      { title: 'Kickoff call', owner: 'denis', due_offset_days: 1, checklist: ['Schedule', 'Confirm scope', 'Set milestones', 'Define comms cadence'] },
      { title: 'Project setup', owner: 'anes', due_offset_days: 2, checklist: ['Spin up workspace', 'Trigger service SOP', 'Notify both operators'] },
      { title: 'First invoice (if applicable)', owner: 'denis', due_offset_days: 3, checklist: ['Issue invoice', 'Confirm receipt', 'Track payment'] },
    ],
  },
  {
    slug: 'billing-collections',
    title: 'Billing & Collections',
    category: 'operations',
    description: 'Handling overdue invoices and recurring billing.',
    default_owner: 'denis',
    estimated_duration: 'Up to 30 days',
    tags: ['billing', 'finance'],
    steps: [
      { title: 'Day 3 — friendly reminder', owner: 'denis', due_offset_days: 3, checklist: ['Polite reminder email', 'Reattach invoice'] },
      { title: 'Day 7 — second reminder', owner: 'denis', due_offset_days: 7, checklist: ['Second email', 'Offer payment options'] },
      { title: 'Day 14 — call + service notice', owner: 'denis', due_offset_days: 14, checklist: ['Direct call', 'Document conversation', 'Send written notice'] },
      { title: 'Day 30 — escalate', owner: 'anes', due_offset_days: 30, checklist: ['Decide on suspension', 'Final demand letter', 'Update client status'] },
    ],
  },
  {
    slug: 'support-ticket',
    title: 'Support Ticket Handling',
    category: 'operations',
    description: 'Standard response flow for inbound support tickets.',
    default_owner: 'denis',
    estimated_duration: '24h response SLA',
    tags: ['support'],
    steps: [
      { title: 'Triage + acknowledge', owner: 'denis', due_offset_days: 0, checklist: ['Read ticket', 'Set priority', 'Send acknowledgement within 4h'] },
      { title: 'Investigate', owner: 'anes', due_offset_days: 0, checklist: ['Reproduce', 'Identify root cause', 'Estimate fix time'] },
      { title: 'Resolve + reply', owner: 'anes', due_offset_days: 1, checklist: ['Apply fix', 'Test', 'Reply to client with explanation'] },
      { title: 'Close + satisfaction', owner: 'denis', due_offset_days: 2, checklist: ['Confirm resolution with client', 'Mark resolved', 'Request feedback'] },
    ],
  },
  {
    slug: 'incident-response',
    title: 'Incident Response (Critical)',
    category: 'operations',
    description: 'Critical-priority incident response.',
    default_owner: 'anes',
    estimated_duration: 'Same day',
    tags: ['incident', 'critical'],
    steps: [
      { title: 'Acknowledge within 30 min', owner: 'anes', due_offset_days: 0, checklist: ['Page operator on-call', 'Notify affected client'] },
      { title: 'Stabilize', owner: 'anes', due_offset_days: 0, checklist: ['Identify blast radius', 'Apply hotfix or rollback', 'Confirm stabilized'] },
      { title: 'Root-cause analysis', owner: 'anes', due_offset_days: 1, checklist: ['Document timeline', 'Identify root cause', 'List corrective actions'] },
      { title: 'Postmortem + client report', owner: 'denis', due_offset_days: 2, checklist: ['Draft postmortem', 'Send report to client', 'File in audit log'] },
    ],
  },
  {
    slug: 'renewals',
    title: 'Domain & SSL Renewals',
    category: 'recurring',
    description: 'Triggered when a domain or SSL is approaching expiry.',
    default_owner: 'anes',
    estimated_duration: '1 hour',
    tags: ['hosting', 'recurring'],
    steps: [
      { title: 'Notify client 30 days out', owner: 'denis', due_offset_days: 0, checklist: ['Send renewal heads-up', 'Confirm decision'] },
      { title: 'Process renewal', owner: 'anes', due_offset_days: 7, checklist: ['Pay registrar', 'Confirm SSL renewed', 'Verify DNS still resolves'] },
      { title: 'Update records', owner: 'anes', due_offset_days: 8, checklist: ['Update client record', 'Issue invoice for reimbursement (if applicable)'] },
    ],
  },
  {
    slug: 'offboarding',
    title: 'Client Offboarding',
    category: 'operations',
    description: 'Graceful exit when a client ends the relationship.',
    default_owner: 'denis',
    estimated_duration: '1 week',
    tags: ['offboarding'],
    steps: [
      { title: 'Confirm offboarding scope', owner: 'denis', due_offset_days: 0, checklist: ['Confirm last service date', 'Identify retained services'] },
      { title: 'Handover package', owner: 'anes', due_offset_days: 3, checklist: ['Code/asset export', 'DNS handover', 'Credentials reset + transfer'] },
      { title: 'Final billing', owner: 'denis', due_offset_days: 5, checklist: ['Final invoice', 'Confirm payment'] },
      { title: 'Close in CRM', owner: 'denis', due_offset_days: 7, checklist: ['Archive client', 'Capture lessons learned', 'Send goodbye email'] },
    ],
  },
];

// ══════════════════════════════════════════════════════════════
//  LEGAL TEMPLATES — Public pages + internal business agreements
//  These are TEMPLATES, not legal advice. See disclaimer below.
// ══════════════════════════════════════════════════════════════

const LEGAL_DISCLAIMER = `\n\n---\nLegal disclaimer: This document is a template intended to reduce risk and improve compliance. It is not a substitute for qualified legal advice. Review with a licensed attorney before relying on it for important matters.\n`;

const PRIVACY_POLICY = `# Privacy Policy

**Effective Date:** {{effective_date}}

This Privacy Policy explains how Cloz Digital ("we", "us", "our") collects, uses, and protects information you provide when visiting cloz.digital or engaging our services.

## 1. Information We Collect

- **Contact information** you provide when you submit a contact form, request a consultation, or sign a proposal (name, email, business name, phone, current website).
- **Usage information** collected automatically through cookies and analytics (pages visited, referrer, device type, approximate location based on IP address).
- **Client account information** if you become a client and use our portal (project assets, communications, invoices, support tickets).

## 2. How We Use Information

- To respond to inquiries and deliver services we have agreed to provide.
- To send invoices and project communications.
- To improve our website and services using aggregated analytics.
- To comply with legal obligations.

We do not sell your personal information.

## 3. Cookies

We use a minimal set of cookies. You can manage your preferences via the cookie banner. Categories:
- **Necessary** — required for the site to function.
- **Analytics** — anonymized usage analytics (only if you consent).
- **Marketing** — used to measure campaign effectiveness (only if you consent).

See our [Cookie Policy](/cookie-policy) for details.

## 4. Data Retention

We keep inquiry records for up to 24 months after our last contact. Client records are retained for the duration of the engagement and up to 6 years after for tax and contract obligations.

## 5. Your Rights

You may request access to, correction of, or deletion of your personal information at any time by emailing general@cloz.digital. We respond to requests within 30 days.

## 6. Third-Party Services

We use the following sub-processors:
- **Resend** for transactional email
- **Cerebras** for AI processing of business analysis (no client personal data is sent unless explicitly requested)
- **Railway** for application hosting
- **Hetzner / Vercel** for client website hosting (per project)

## 7. Contact

For privacy questions: general@cloz.digital
Sarajevo, Bosnia and Herzegovina${LEGAL_DISCLAIMER}`;

const TERMS_OF_SERVICE = `# Terms of Service

**Effective Date:** {{effective_date}}

These Terms govern your use of cloz.digital and any services provided by Cloz Digital.

## 1. Services

Cloz Digital provides website design, development, hosting, maintenance, SEO, and related services. Specific deliverables, timelines, and pricing are defined in individual proposals or service agreements.

## 2. Engagement

A binding engagement begins when you sign a proposal or service agreement. Until then, all communications are informational.

## 3. Payment

- Project fees are invoiced according to the milestones agreed in the proposal.
- Recurring fees (e.g. Presence Care, Growth Care retainers) are billed monthly in advance.
- Payment is due within the term stated on each invoice (typically 14 days).
- We reserve the right to suspend services after 30 days of non-payment.

## 4. Intellectual Property

- Once final payment is received, you own all final deliverables produced for you (designs, code, content).
- We retain the right to use anonymized work in our portfolio and case studies unless agreed otherwise in writing.
- Third-party software, fonts, and stock assets remain governed by their respective licenses.

## 5. Confidentiality

Both parties agree to keep confidential information shared during the engagement private and not to disclose it to third parties without consent.

## 6. Warranties

We deliver services with reasonable care and skill. We do not warrant uninterrupted or error-free operation of any website. Services are provided "as is" beyond what is expressly stated in writing.

## 7. Limitation of Liability

To the maximum extent permitted by law, our total liability for any claim arising from our services is limited to the fees paid for the specific service in the 12 months preceding the claim.

## 8. Termination

Either party may terminate ongoing services with 30 days' written notice. Project work in progress is billed up to the termination date.

## 9. Governing Law

These terms are governed by the laws of Bosnia and Herzegovina. Any disputes will be resolved in the courts of Sarajevo.

## 10. Contact

general@cloz.digital${LEGAL_DISCLAIMER}`;

const COOKIE_POLICY = `# Cookie Policy

**Effective Date:** {{effective_date}}

This Cookie Policy explains what cookies cloz.digital uses and how you can manage them.

## What Are Cookies?

Cookies are small text files stored on your device when you visit a website. They allow the site to remember your preferences and improve your experience.

## Categories We Use

### Necessary
Required for core functionality. Cannot be disabled.
- Session tokens
- CSRF protection
- Cookie preference itself

### Analytics (optional)
Help us understand site usage in aggregate.
- Page view tracking (anonymized)
- Referrer tracking
Set only with your consent.

### Marketing (optional)
Measure ad campaign effectiveness.
- Conversion tracking
- Retargeting identifiers
Set only with your consent.

## Managing Cookies

You can change your preferences at any time via the cookie banner shown on your first visit, or by clearing your browser data. Most browsers also let you block or delete cookies through their settings.

## Updates

We will update this policy when we add new cookie categories or change how we use them. The effective date above will be updated when changes occur.

## Contact

general@cloz.digital${LEGAL_DISCLAIMER}`;

const DISCLAIMER_PAGE = `# Disclaimer

**Effective Date:** {{effective_date}}

The information presented on cloz.digital is for general informational purposes only. While we strive for accuracy, we make no warranties regarding the completeness or reliability of the content.

## No Professional Advice

Content on this site does not constitute legal, financial, or technical advice. For your specific situation, consult a qualified professional.

## Third-Party Links

We may link to third-party websites for convenience. We are not responsible for their content, privacy practices, or availability.

## Service Limitations

While we apply industry best practices to every project, the digital environment changes constantly. We cannot guarantee specific business outcomes (revenue, traffic, rankings) from any service we provide.

## Trademarks

Cloz Digital and our logo are trademarks of Cloz Digital, Sarajevo, Bosnia and Herzegovina. All other trademarks belong to their respective owners.${LEGAL_DISCLAIMER}`;

const MSA_TEMPLATE = `# Master Service Agreement

**Effective Date:** {{effective_date}}
**Between:** Cloz Digital ("Provider") and {{client_name}} ("Client")

This Master Service Agreement ("Agreement") governs all services provided by Provider to Client. Specific scopes of work are defined in individual proposals or Statements of Work that incorporate these terms by reference.

## 1. Services
Provider will perform the services described in each accepted proposal with reasonable skill and care.

## 2. Fees and Payment
Fees and payment terms are stated in each proposal. Invoices are due within 14 days. Late payments may incur a service suspension after 30 days.

## 3. Intellectual Property
Upon full payment, Client owns final deliverables. Provider retains rights to portfolio display and underlying methodologies, tools, and frameworks.

## 4. Confidentiality
Each party will protect the other's confidential information for the duration of this Agreement and for 3 years after termination.

## 5. Warranties and Disclaimers
Services are provided "as is" except as expressly warranted in writing. Provider does not guarantee specific business outcomes.

## 6. Limitation of Liability
Provider's total liability for any claim is limited to fees paid in the 12 months prior to the claim. Neither party is liable for indirect or consequential damages.

## 7. Termination
Either party may terminate with 30 days' written notice. Work in progress is billed to the termination date.

## 8. Governing Law
Bosnia and Herzegovina. Disputes resolved in Sarajevo courts.

## 9. Signatures
Provider: ______________________  Date: __________
Client:   ______________________  Date: __________${LEGAL_DISCLAIMER}`;

const NDA_TEMPLATE = `# Mutual Non-Disclosure Agreement

**Effective Date:** {{effective_date}}
**Between:** Cloz Digital and {{counterparty}}

## 1. Confidential Information
"Confidential Information" means any non-public information disclosed by one party to the other in connection with potential or actual business dealings.

## 2. Obligations
Each party will:
- Hold Confidential Information in strict confidence.
- Use it only for the purpose of evaluating or carrying out business between the parties.
- Not disclose it to third parties without prior written consent.

## 3. Exclusions
This Agreement does not apply to information that is publicly available, was already known, was independently developed, or is required to be disclosed by law.

## 4. Term
This Agreement remains in effect for 3 years from the Effective Date.

## 5. Return of Materials
Upon request, each party will return or destroy Confidential Information in its possession.

## 6. Governing Law
Bosnia and Herzegovina.

## Signatures
Cloz Digital:    ______________________  Date: __________
Counterparty: ______________________  Date: __________${LEGAL_DISCLAIMER}`;

const MAINTENANCE_AGREEMENT = `# Maintenance Agreement (Presence Care)

**Effective Date:** {{effective_date}}
**Between:** Cloz Digital and {{client_name}}

## 1. Scope
Provider will perform the following maintenance services on Client's website ({{website}}):
- Monthly software/plugin updates
- Weekly backups with off-site copy
- Security monitoring and patch application
- Up to 2 content updates per month (each up to 30 minutes)
- Uptime monitoring with email alerts
- Same-day email support during business hours

## 2. Out of Scope
- New design or feature work (billed separately)
- Content updates exceeding the included allowance
- Third-party plugin/license fees

## 3. Fees
{{monthly_fee}} BAM per month, billed in advance. Either party may cancel with 30 days' notice.

## 4. Response Times
- Critical issues: same business day
- Non-critical issues: within 2 business days

## 5. Backups
Provider will retain at least 4 weekly backups at any time. Client is responsible for maintaining their own redundant copy if desired.

## 6. Liability
Provider's liability is limited to fees paid in the prior 12 months. Provider does not guarantee 100% uptime.${LEGAL_DISCLAIMER}`;

const SUPPORT_SLA = `# Support SLA

**Effective Date:** {{effective_date}}
**Applies to:** {{client_name}} on {{package}}

## Response Times
| Severity | Definition                                                         | Response  |
|----------|--------------------------------------------------------------------|-----------|
| Critical | Site down or fully broken                                          | 30 min    |
| High     | Major feature unavailable; checkout/forms broken                   | 4 hours   |
| Medium   | Visual or content issue; non-critical bug                          | 1 day     |
| Low      | Question, request for change, enhancement                          | 2 days    |

## Channels
- Email: general@cloz.digital
- Client portal: tickets section
- Emergency: phone (provided separately)

## Hours
Business hours: Mon-Fri, 09:00-18:00 (Sarajevo time). Critical issues outside hours: best effort.

## Exclusions
- Third-party platform outages (Vercel, Hetzner, etc.) outside our control
- Issues caused by client-managed changes outside our scope${LEGAL_DISCLAIMER}`;

const LEGAL_TEMPLATES = [
  // Public pages
  { slug: 'privacy-policy',    title: 'Privacy Policy',    category: 'public',   body: PRIVACY_POLICY },
  { slug: 'terms-of-service',  title: 'Terms of Service',  category: 'public',   body: TERMS_OF_SERVICE },
  { slug: 'cookie-policy',     title: 'Cookie Policy',     category: 'public',   body: COOKIE_POLICY },
  { slug: 'disclaimer',        title: 'Disclaimer',        category: 'public',   body: DISCLAIMER_PAGE },

  // Business templates (internal)
  { slug: 'master-service-agreement', title: 'Master Service Agreement', category: 'business', body: MSA_TEMPLATE },
  { slug: 'nda',                       title: 'Mutual NDA',               category: 'business', body: NDA_TEMPLATE },
  { slug: 'maintenance-agreement',     title: 'Maintenance Agreement',    category: 'business', body: MAINTENANCE_AGREEMENT },
  { slug: 'support-sla',               title: 'Support SLA',              category: 'business', body: SUPPORT_SLA },
];

// ══════════════════════════════════════════════════════════════
//  SEEDER
// ══════════════════════════════════════════════════════════════

export function seedOps(db) {
  const today = new Date().toISOString().slice(0, 10);

  // Seed SOPs
  for (const sop of SOPS) {
    const existing = db.prepare('SELECT id FROM sops WHERE slug = ?').get(sop.slug);
    if (existing) continue;

    const id = uuid();
    db.prepare(`INSERT INTO sops (id, title, slug, category, description, default_owner, estimated_duration, tags) VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, sop.title, sop.slug, sop.category, sop.description, sop.default_owner, sop.estimated_duration, JSON.stringify(sop.tags));

    sop.steps.forEach((step, idx) => {
      db.prepare(`INSERT INTO sop_steps (id, sop_id, position, title, description, owner, due_offset_days, checklist) VALUES (?,?,?,?,?,?,?,?)`)
        .run(uuid(), id, idx + 1, step.title, step.description || '', step.owner || sop.default_owner, step.due_offset_days || 0, JSON.stringify(step.checklist || []));
    });
  }

  // Seed legal templates
  for (const tpl of LEGAL_TEMPLATES) {
    const existing = db.prepare('SELECT id FROM legal_templates WHERE slug = ?').get(tpl.slug);
    if (existing) continue;
    db.prepare(`INSERT INTO legal_templates (id, slug, title, category, body, effective_date) VALUES (?,?,?,?,?,?)`)
      .run(uuid(), tpl.slug, tpl.title, tpl.category, tpl.body, today);
  }
}
