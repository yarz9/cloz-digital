// database/seedKnowledge.js — Idempotent starter content for the Knowledge Center.

import { v4 as uuid } from 'uuid'

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

const ARTICLES = [
  {
    title: 'Welcome to the Cloz Digital Knowledge Center',
    category: 'general',
    tags: ['onboarding','welcome'],
    body: `# Welcome\n\nThis is the single source of truth for how Cloz Digital operates.\n\nUse the **Knowledge Base** for SOPs and articles, **Academy** for training courses, **Playbooks** for repeatable operational plays, **Prompts** for AI templates, and the **AI Copilot** to ask questions about anything stored here.\n\n## How to contribute\n\n1. Draft an article in the Knowledge Base.\n2. Set status to **Published** once reviewed.\n3. The Copilot will start citing it automatically.\n\n## Categories we maintain\n\n- Sales & Outreach\n- Client Onboarding\n- Web Development\n- Design Systems\n- SEO\n- Marketing\n- Support & Operations\n- Legal & Compliance\n- Financial Operations`,
  },
  {
    title: 'How we handle overdue invoices',
    category: 'financial-operations',
    tags: ['billing','collections'],
    body: `# Overdue Invoice Playbook\n\nWhen a client invoice goes overdue:\n\n## Day 1 past due\n- Send a friendly automated reminder from billing@cloz.digital.\n- Tone: gentle, "just a quick heads-up."\n\n## Day 7 past due\n- Personal email from the account manager.\n- Reference the invoice number, restate the work delivered, ask if anything needs clarifying.\n\n## Day 14 past due\n- Phone or Viber call. Most overdue invoices are simply forgotten.\n- Offer to split into two payments if cash flow is the issue.\n\n## Day 21 past due\n- Pause active work on care plans (give 48h written notice first).\n- Escalate to Anes for direct resolution.\n\n## Day 30 past due\n- Send final notice with collection escalation language.\n- Suspend hosting only as a last resort and with 7 days' notice — never silently.\n\n## Notes\n- Never publicly shame a client.\n- Always document each touch in the Service Desk thread.\n- If a client genuinely cannot pay, offer to convert to a smaller engagement.`,
  },
  {
    title: 'Website redesign sales script',
    category: 'sales',
    tags: ['sales','redesign','script'],
    body: `# Redesign Sales Script\n\nUse this when a prospect comes in with an old website.\n\n## Opening (90 seconds)\n"Thanks for sending the link. I had a quick look. Before I give you a price, can I ask three quick questions about your business?"\n\n1. What's the single most important action a visitor should take on your site?\n2. How are you getting traffic today?\n3. What does a 'great' result from a new website look like for you?\n\n## The pitch\n"We don't build websites that just look good. We build sites that move that one action you described. For your business, that probably means [restate their answer]."\n\n## Pricing handoff\n- Launch Care if scope ≤ 5 pages: 800 BAM.\n- Growth Care for 6-12 pages with SEO + analytics: 1,500 BAM.\n- Always frame Presence Care as the ongoing relationship — 200 BAM/month.\n\n## When to walk away\n- They want a 50-page WordPress install for 300 BAM.\n- They want copy-paste of a competitor.\n- They demand the source files but no contract.`,
  },
  {
    title: 'Deployment guide: Railway redeploy + persistence checklist',
    category: 'web-development',
    tags: ['deployment','railway','infrastructure'],
    body: `# Railway Deployment Checklist\n\n## Before pushing\n- Run \`npm run build\` locally.\n- Check that any new env vars are documented in DEPLOYMENT.md.\n\n## Push & monitor\n- Push to main → Railway auto-builds.\n- Watch the build log for "vite build" success.\n- Watch for the storage banner: \`Persistent: yes\`.\n\n## After deploy\n- Hit /health to confirm the app responded.\n- Hit /api/admin/data/storage to confirm the volume is mounted at /data.\n- If you added a new table, the migration runs on boot — verify with /api/admin/data/health row counts.\n\n## Common pitfalls\n- Forgetting to add a new dependency to dependencies vs devDependencies.\n- Writing to a path outside DATA_DIR.\n- Long-running synchronous code in /health → Railway marks unhealthy.`,
  },
  {
    title: 'Client onboarding kit — first 7 days',
    category: 'client-management',
    tags: ['onboarding','clients'],
    body: `# Onboarding the first 7 days\n\n## Day 0 — Contract signed\n- Create the portal client record in /management/portal-clients.\n- Trigger the welcome email (the form does this).\n- Add to CRM with priority + account manager.\n\n## Day 1 — Kickoff call (30 min)\n- Walk them through the portal: tickets, assets, billing, AI assistant.\n- Capture their goals, challenges, and brand voice in the Discovery Profile.\n\n## Day 2-3 — Asset collection\n- Email the asset checklist (logo, photos, fonts, copy, references).\n- Add anything received to portal_assets.\n\n## Day 4-5 — Design direction\n- Share 1-3 visual directions as portal_approvals.\n- Schedule a 30-min review.\n\n## Day 6-7 — Build phase begins\n- Move card on the Service Desk board to In Progress.\n- Send a "what to expect this week" message.`,
  },
  {
    title: 'SEO methodology — Local Bosnia edition',
    category: 'seo',
    tags: ['seo','local','bosnia'],
    body: `# Local SEO playbook\n\nMost of our clients serve a city or a region. This is what compounds.\n\n## Technical baseline\n- Clean URLs, fast TTFB, mobile-first, valid hreflang for bs/en.\n- Sitemap + robots.txt + structured data (LocalBusiness, Organization).\n\n## On-page\n- Title tags written for the city + service ("Stomatolog Sarajevo — implantati").\n- One H1 per page that matches search intent.\n- FAQPage schema for the homepage.\n\n## Local signals\n- Google Business Profile claimed, fully filled, weekly posts.\n- NAP consistency across all citations (Olx.ba, Posao.ba, Pikado.ba directories).\n- Reviews — ask every happy client. Reply to every review.\n\n## Content\n- One in-depth article per service.\n- Localized landing pages where geo matters (Tuzla, Banja Luka, Zenica).\n\n## Measurement\n- GSC + GA4 wired from day 1.\n- Monthly report: impressions, clicks, top queries, conversion events.`,
  },
  {
    title: 'Brand voice — premium, warm, direct',
    category: 'design-systems',
    tags: ['branding','voice'],
    body: `# Cloz Digital voice\n\n## What we sound like\n- **Direct** — we say the useful thing first.\n- **Warm** — we treat readers like adults, not leads.\n- **Premium** — confident, never showy.\n\n## What we avoid\n- "Game-changing", "revolutionary", "synergy" — meaningless.\n- "I hope this email finds you well" — empty calories.\n- Exclamation marks (except when something is actually exciting).\n- Long em-dashed sentences that pile on adjectives.\n\n## Useful structures\n- Lead with the problem we solve.\n- Follow with one specific proof.\n- End with the action we want them to take.\n\n## Example rewrite\nBefore: "We are very excited to revolutionize your online presence with cutting-edge solutions!"\nAfter: "Your site loads in 4 seconds. We can get it under 2. Want to talk?"`,
  },
  {
    title: 'Support response template — outage incident',
    category: 'support-operations',
    tags: ['incident','support','template'],
    body: `# Outage acknowledgement template\n\nSubject: [Cloz Digital] We're looking into an issue with your site\n\nHi {{ first_name }},\n\nWe've detected an issue with {{ site_url }} and our team is actively investigating.\n\n- What we know so far: {{ short_diagnosis }}\n- What we're doing right now: {{ action }}\n- Next update: in 30 minutes, or sooner if we resolve it.\n\nWe'll keep you posted. If you'd rather we call you, just reply with a number.\n\n— {{ author_name }}, Cloz Digital`,
  },
]

const PLAYBOOKS = [
  {
    title: 'Lead generation — Bosnia local businesses',
    category: 'sales',
    summary: 'Repeatable weekly play for filling the top of the pipeline with verified local prospects.',
    body: 'Run this on Monday mornings. Allocate 2 hours.',
    steps: [
      { title: 'Pick a niche', detail: 'One vertical per week (dentists, lawyers, restaurants…). Pick the next on the rotation list.' },
      { title: 'Pull verified leads', detail: 'Open /management/scout, choose city + niche, run OSM discovery (verified only).' },
      { title: 'Score & shortlist', detail: 'Auto-score, then manually keep the top 20.' },
      { title: 'Draft outreach', detail: 'Use the "First-touch cold email" prompt in the Prompt Library.' },
      { title: 'Send sequenced', detail: 'Stagger sends across 3 days. Track replies in Service Desk.' },
      { title: 'Follow-up', detail: '+3 day Viber message if no email reply. +7 day final value-add email.' },
    ],
    tags: ['lead-gen','outreach','weekly'],
  },
  {
    title: 'Client onboarding — 14 day delivery rhythm',
    category: 'client-management',
    summary: 'Operational rhythm for the first two weeks of any new engagement.',
    body: 'Use this for every new portal client. Adapt timelines for Growth Care to 30 days.',
    steps: [
      { title: 'Create portal record', detail: '/management/portal-clients → Onboard. Fill the Discovery Profile.' },
      { title: 'Welcome email + kickoff', detail: 'Automated email + book a 30-min call within 3 business days.' },
      { title: 'Asset checklist', detail: 'Send the asset request — logos, brand colors, copy, references.' },
      { title: 'Design direction', detail: 'Publish 1-3 directions as portal_approvals.' },
      { title: 'Build sprint 1', detail: 'Hero + critical pages. Daily status note in portal.' },
      { title: 'Build sprint 2', detail: 'Secondary pages + integrations.' },
      { title: 'QA + launch', detail: 'Full QA pass, performance check, SEO check, then deploy.' },
      { title: 'Care handoff', detail: 'Move to Presence Care if subscribed. Schedule the 30-day check-in.' },
    ],
    tags: ['onboarding','delivery','rhythm'],
  },
  {
    title: 'Incident response — site down',
    category: 'support-operations',
    summary: 'What to do in the first 30 minutes when a client site goes dark.',
    body: 'Time is the variable. Communicate early, investigate methodically.',
    steps: [
      { title: 'Acknowledge', detail: 'Send the outage acknowledgement template within 5 minutes.' },
      { title: 'Triage', detail: 'Check Railway, hosting provider status, DNS, SSL expiry.' },
      { title: 'Isolate', detail: 'Roll back the last deploy if the timing lines up.' },
      { title: 'Restore', detail: 'Bring service back even if degraded — then iterate.' },
      { title: 'Postmortem', detail: 'Write a postmortem article in the Knowledge Base within 24h.' },
    ],
    tags: ['incident','support','sla'],
  },
]

const PROMPTS = [
  {
    title: 'First-touch cold email (warm + specific)',
    category: 'outreach',
    body: `You are writing a first cold email from Cloz Digital, a premium web design agency in Sarajevo. Write a 90-word email to {{contact_name}} at {{business_name}} ({{industry}}).\n\nObserved issues with their current website ({{website_url}}):\n{{issues}}\n\nRules:\n- Lead with one specific observation about their actual site.\n- Propose one tangible improvement.\n- Soft CTA: ask if they'd like a free 15-minute walkthrough.\n- No "I hope this email finds you well."\n- Sign as Cloz Digital.`,
    variables: ['contact_name','business_name','industry','website_url','issues'],
    tags: ['outreach','cold-email'],
  },
  {
    title: 'SEO content brief generator',
    category: 'seo',
    body: `Write a one-page SEO content brief for the article "{{article_title}}" targeting the keyword "{{target_keyword}}" in {{location}}.\n\nReturn sections:\n- Search intent (informational / commercial / transactional)\n- Target reader and the question they're answering\n- Suggested H1 + 3 H2s\n- 5 internal link targets\n- FAQ schema candidates\n- Word count target`,
    variables: ['article_title','target_keyword','location'],
    tags: ['seo','content'],
  },
  {
    title: 'Website audit — premium tone',
    category: 'audit',
    body: `You are auditing {{website_url}} on behalf of Cloz Digital. Produce a concise audit covering:\n\n1. First impression (90-second take)\n2. Mobile readiness\n3. Performance signals\n4. SEO foundations\n5. Conversion path\n6. Top 3 improvements ranked by ROI\n\nWrite for a non-technical business owner. Warm, direct, premium tone.`,
    variables: ['website_url'],
    tags: ['audit','sales'],
  },
  {
    title: 'Proposal draft — Growth Care',
    category: 'proposals',
    body: `Draft a Growth Care proposal for {{business_name}} ({{industry}}).\n\nClient goals: {{goals}}\nKnown challenges: {{challenges}}\nPreferred timeline: {{timeline}}\n\nInclude:\n- 2-sentence positioning paragraph\n- Scope (pages, integrations, SEO foundations, CMS)\n- Timeline broken into 4-6 milestones\n- Pricing: 1,500 BAM one-time + optional 200 BAM/mo Presence Care\n- What's NOT included (be honest)\n- Acceptance line`,
    variables: ['business_name','industry','goals','challenges','timeline'],
    tags: ['proposal','growth-care'],
  },
  {
    title: 'AI Copilot — knowledge gap follow-up',
    category: 'internal',
    body: `Given this failed internal search: "{{query}}"\n\nDraft a short outline for an article that would answer it. Include:\n- A proposed title\n- 3-5 H2 headings\n- A one-line summary of what each section should cover\n- Suggested category and 3 tags`,
    variables: ['query'],
    tags: ['knowledge','meta'],
  },
]

const COURSE = {
  title: 'Cloz Digital Operating System — Onboarding Course',
  category: 'onboarding',
  description: 'Everything a new team member needs in their first week. Modules cover values, tooling, client work, and where to find things.',
  level: 'beginner',
  est_minutes: 90,
  cover_emoji: '🚀',
  lessons: [
    {
      title: 'Welcome to Cloz Digital',
      body: `# Welcome\n\nCloz Digital is a premium web design agency based in Sarajevo. We design, build, host, and maintain websites for businesses that take their online presence seriously.\n\n## What you'll learn in this course\n- How we sell, scope, and price work\n- How we onboard and support clients\n- The tools we use day to day\n- Where everything lives\n\n## Our values\n- Direct over diplomatic.\n- Premium over generic.\n- Long-term over transactional.`,
      est_minutes: 10,
      quizzes: [
        {
          question: 'What is the agency primarily focused on?',
          options: ['Cheap WordPress installs', 'Premium web design with ongoing care', 'Mobile app development', 'AI chatbots only'],
          answer_index: 1,
          explanation: 'Cloz Digital positions on premium design + ongoing care, not low-cost builds.',
        },
      ],
    },
    {
      title: 'The packages we sell',
      body: `# Our three packages\n\n## Launch Care — 800 BAM one-time\n- Up to 5 pages\n- 30 days post-launch support\n- Ideal for first websites\n\n## Growth Care — 1,500 BAM one-time + optional retainer\n- Up to 12 pages\n- 3 months of maintenance included\n- SEO foundation + analytics\n- Ideal for serious growth\n\n## Presence Care — 200 BAM/month\n- Hosting + SSL + backups\n- Security monitoring\n- 2 content updates/month\n- Same-day email support`,
      est_minutes: 10,
      quizzes: [
        {
          question: 'Which package is the recurring monthly care plan?',
          options: ['Launch Care', 'Growth Care', 'Presence Care', 'None of the above'],
          answer_index: 2,
          explanation: 'Presence Care is the 200 BAM/month ongoing-management plan.',
        },
      ],
    },
    {
      title: 'How we use the Service Desk',
      body: `# Service Desk\n\nEverything a client does in the portal flows into /management/service-desk:\n- Tickets (support, revisions, content, billing)\n- Direct messages\n- Approvals (designs, copy)\n- Asset uploads\n\n## Triage daily\n- Inbox tab: anything new and unassigned.\n- Mine tab: your queue.\n- Urgent tab: SLA breaches and escalations.\n\n## Reply standards\n- Acknowledge within 4h on care plans.\n- Resolve or set "Awaiting Client" within 24h.\n- Use the AI "Suggest reply" if you're stuck.`,
      est_minutes: 12,
    },
    {
      title: 'Tools and where things live',
      body: `# The map\n\n- **Management** = internal command center (you're in it now).\n- **Client Portal** = each client's private workspace.\n- **Public site** = cloz.digital, bilingual EN/BCS.\n- **Mail** = IMAP-synced inboxes inside Management → Mail.\n- **Knowledge Center** = this place.\n\n## Where to look first\n- "How do we…" → search the Knowledge Base.\n- "What does this client want?" → open their Portal Client profile.\n- "What's the next step in onboarding a client?" → Playbooks → Client onboarding 14-day.`,
      est_minutes: 8,
    },
  ],
}

export function seedKnowledge(db) {
  // Articles
  for (const a of ARTICLES) {
    const slug = slugify(a.title)
    if (db.prepare(`SELECT id FROM kb_articles WHERE slug = ?`).get(slug)) continue
    const id = uuid()
    const exc = (a.body || '').replace(/[#*`>_\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
    db.prepare(`INSERT INTO kb_articles (id, slug, title, category, body, excerpt, tags, status, author, published_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, slug, a.title, a.category, a.body, exc, JSON.stringify(a.tags || []),
      'published', 'Cloz Digital', new Date().toISOString()
    )
    db.prepare(`INSERT INTO kb_article_versions (id, article_id, version, title, body, author, change_note) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), id, 1, a.title, a.body, 'Seeder', 'Initial seed')
    // Index chunks
    indexChunksFor(db, 'article', id, a.title, a.body)
  }

  // Playbooks
  for (const p of PLAYBOOKS) {
    const slug = slugify(p.title)
    if (db.prepare(`SELECT id FROM kb_playbooks WHERE slug = ?`).get(slug)) continue
    const id = uuid()
    db.prepare(`INSERT INTO kb_playbooks (id, slug, title, category, summary, body, steps, tags, author)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      id, slug, p.title, p.category, p.summary, p.body || '',
      JSON.stringify(p.steps || []), JSON.stringify(p.tags || []), 'Cloz Digital'
    )
    const stepsTxt = (p.steps || []).map((s, i) => `Step ${i+1}: ${s.title} ${s.detail}`).join('\n')
    indexChunksFor(db, 'playbook', id, p.title, `${p.summary}\n\n${p.body}\n\n${stepsTxt}`)
  }

  // Prompts
  for (const pr of PROMPTS) {
    const slug = slugify(pr.title)
    if (db.prepare(`SELECT id FROM kb_prompts WHERE slug = ?`).get(slug)) continue
    db.prepare(`INSERT INTO kb_prompts (id, slug, title, category, body, variables, tags, author)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      uuid(), slug, pr.title, pr.category, pr.body,
      JSON.stringify(pr.variables || []), JSON.stringify(pr.tags || []), 'Cloz Digital'
    )
  }

  // Onboarding course
  const cslug = slugify(COURSE.title)
  let courseId = db.prepare(`SELECT id FROM kb_courses WHERE slug = ?`).get(cslug)?.id
  if (!courseId) {
    courseId = uuid()
    db.prepare(`INSERT INTO kb_courses (id, slug, title, category, description, level, est_minutes, cover_emoji, author)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      courseId, cslug, COURSE.title, COURSE.category, COURSE.description, COURSE.level,
      COURSE.est_minutes, COURSE.cover_emoji, 'Cloz Digital'
    )
    for (const [i, l] of COURSE.lessons.entries()) {
      const lid = uuid()
      db.prepare(`INSERT INTO kb_lessons (id, course_id, position, title, body, est_minutes) VALUES (?,?,?,?,?,?)`)
        .run(lid, courseId, i + 1, l.title, l.body, l.est_minutes || 5)
      indexChunksFor(db, 'lesson', lid, l.title, l.body)
      for (const [qi, q] of (l.quizzes || []).entries()) {
        db.prepare(`INSERT INTO kb_quizzes (id, lesson_id, position, question, options, answer_index, explanation) VALUES (?,?,?,?,?,?,?)`)
          .run(uuid(), lid, qi + 1, q.question, JSON.stringify(q.options), q.answer_index, q.explanation || '')
      }
    }
  }
}

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
}
function chunkText(text, maxLen = 900) {
  if (!text) return []
  const paragraphs = String(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const out = []
  let cur = '', idx = 0
  for (const p of paragraphs) {
    if ((cur + '\n\n' + p).length > maxLen && cur) { out.push({ index: idx++, text: cur.trim() }); cur = p }
    else cur = cur ? cur + '\n\n' + p : p
  }
  if (cur.trim()) out.push({ index: idx, text: cur.trim() })
  return out
}
function indexChunksFor(db, docType, docId, title, body) {
  for (const c of chunkText(body, 900)) {
    const tokensLower = Array.from(new Set(tokenize(c.text))).join(' ')
    db.prepare(`INSERT INTO kb_chunks (id, doc_type, doc_id, doc_title, chunk_index, content, tokens_lower) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), docType, docId, title, c.index, c.text, tokensLower)
  }
}
