import { create } from 'zustand'

// ─── ID generator ───
let _id = 100
const nextId = () => ++_id

// ─── Timestamp helper ───
const now = () => new Date().toISOString().slice(0, 10)
const timeAgo = () => {
  const d = new Date()
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ─── The unified management store ───
export const useStore = create((set, get) => ({

  // ═══════════════════════════════════════════
  // ACTIVITY FEED
  // ═══════════════════════════════════════════
  activity: [
    { id: 1, time: '2h ago', text: 'Invoice INV-1048 paid by Zenith Consulting', type: 'success' },
    { id: 2, time: '4h ago', text: 'Maintenance completed for Mira Wellness', type: 'info' },
    { id: 3, time: '6h ago', text: 'New lead saved: Mostar Photography Studio', type: 'accent' },
    { id: 4, time: 'Yesterday', text: 'SSL renewed for harmonyyoga.ba', type: 'info' },
    { id: 5, time: 'Yesterday', text: 'Proposal sent to Alpine Outdoor Shop', type: 'accent' },
  ],
  addActivity: (text, type = 'info') => set(s => ({
    activity: [{ id: nextId(), time: 'Just now', text, type }, ...s.activity].slice(0, 50)
  })),

  // ═══════════════════════════════════════════
  // SCOUT SEARCHES
  // ═══════════════════════════════════════════
  searches: [
    { id: 1, name: 'Dental Clinics — Sarajevo', niche: 'Dental Clinics', location: 'Sarajevo', keywords: 'dentist, dental clinic', status: 'completed', results: 3, created: '2026-05-10' },
    { id: 2, name: 'Restaurants — Mostar', niche: 'Restaurants', location: 'Mostar', keywords: 'restaurant, grill, traditional food', status: 'completed', results: 5, created: '2026-05-08' },
  ],
  addSearch: (search) => {
    const id = nextId()
    const entry = { id, ...search, status: 'running', results: 0, created: now() }
    set(s => ({ searches: [entry, ...s.searches] }))
    get().addActivity(`New scout search created: ${search.name}`, 'accent')
    // Simulate completing after 2s
    setTimeout(() => {
      set(s => ({
        searches: s.searches.map(sr => sr.id === id ? { ...sr, status: 'completed', results: Math.floor(Math.random() * 8) + 1 } : sr)
      }))
    }, 2000)
    return id
  },

  // ═══════════════════════════════════════════
  // LEADS
  // ═══════════════════════════════════════════
  leads: [
    { id: 1, name: 'Sarajevo Dental Clinic', niche: 'Dental Clinics', location: 'Sarajevo', hasWebsite: false, score: 92, urgency: 'high', stage: 'new', googleRating: 4.8, reviewCount: 142, phone: '+387 33 123 456', reason: 'High-rated dental practice with no web presence.', serviceFit: 'Launch Care', contactChannel: 'Phone call', auditSummary: 'No website detected. Business relies entirely on Google Maps listing.' },
    { id: 2, name: 'Alpine Outdoor Shop', niche: 'Retail Shops', location: 'Mostar', hasWebsite: true, websiteUrl: 'alpineoutdoor.ba', score: 87, urgency: 'high', stage: 'researched', googleRating: 4.5, reviewCount: 89, phone: '+387 36 456 789', reason: 'Severely outdated website. No mobile responsiveness.', serviceFit: 'Growth Care', contactChannel: 'Email', auditSummary: 'Website exists but hurts more than helps. Design is 6+ years old.', mobileScore: 22, speedScore: 31 },
    { id: 3, name: 'Harmony Yoga Studio', niche: 'Yoga Studios', location: 'Sarajevo', hasWebsite: true, websiteUrl: 'harmonyyoga.wixsite.com/studio', score: 78, urgency: 'medium', stage: 'contacted', googleRating: 4.9, reviewCount: 67, phone: '+387 33 789 012', email: 'info@harmonyyoga.ba', reason: 'Using free Wix plan with ads and subdomain.', serviceFit: 'Launch Care', contactChannel: 'DM (Instagram)', auditSummary: 'Running on Wix free tier — visible ads, .wixsite.com subdomain.' },
    { id: 4, name: 'Mostar Photography Studio', niche: 'Photography', location: 'Mostar', hasWebsite: true, websiteUrl: 'mostarphoto.com', score: 81, urgency: 'medium', stage: 'new', googleRating: 4.7, reviewCount: 53, phone: '+387 36 111 222', reason: 'Portfolio site loads extremely slowly.', serviceFit: 'Growth Care', contactChannel: 'Email', auditSummary: 'Heavy portfolio site with unoptimized images.' },
    { id: 5, name: 'Zen Café', niche: 'Cafés', location: 'Tuzla', hasWebsite: false, score: 65, urgency: 'low', stage: 'new', googleRating: 4.3, reviewCount: 28, phone: '+387 35 333 444', reason: 'Small café without web presence.', serviceFit: 'Launch Care', contactChannel: 'In-person visit', auditSummary: 'No website. Google Maps listing is basic.' },
  ],
  addLead: (lead) => {
    const id = nextId()
    const score = lead.hasWebsite ? Math.floor(Math.random() * 30) + 55 : Math.floor(Math.random() * 25) + 70
    const entry = { id, ...lead, score, stage: 'new', urgency: score >= 80 ? 'high' : score >= 65 ? 'medium' : 'low', created: now() }
    set(s => ({ leads: [entry, ...s.leads] }))
    get().addActivity(`New lead added: ${lead.name} (score: ${score})`, 'accent')
    return id
  },
  updateLead: (id, updates) => set(s => ({
    leads: s.leads.map(l => l.id === id ? { ...l, ...updates } : l)
  })),

  // ═══════════════════════════════════════════
  // CLIENTS
  // ═══════════════════════════════════════════
  clients: [
    { id: 1, name: 'Brava Interiors', contact: 'Amina Hadžić', email: 'amina@bravainteriors.ba', phone: '+387 33 234 567', package: 'Presence Care', mrr: 250, website: 'bravainteriors.ba', hosting: 'Hetzner', domain: 'BH Telecom', healthScore: 94, status: 'active', since: '2024-08-15', domainExpiry: '2027-03-12', sslExpiry: '2026-09-15', editsUsed: 2, editsTotal: 4, lastMaintenance: '2026-05-08', notes: 'Excellent client. Always responsive.', invoicesPaid: 18, invoicesTotal: 18, totalRevenue: 4500 },
    { id: 2, name: 'Peak Athletics', contact: 'Dino Mujić', email: 'dino@peakathletics.com', phone: '+387 33 345 678', package: 'Growth Care', mrr: 350, website: 'peakathletics.com', hosting: 'Vercel', domain: 'Namecheap', healthScore: 72, status: 'at-risk', since: '2025-01-10', domainExpiry: '2026-06-28', sslExpiry: '2026-07-01', editsUsed: 4, editsTotal: 4, lastMaintenance: '2026-04-22', notes: 'Late on last 2 invoices.', invoicesPaid: 10, invoicesTotal: 12, totalRevenue: 4200 },
    { id: 3, name: 'Zenith Consulting', contact: 'Haris Begović', email: 'haris@zenithconsulting.ba', phone: '+387 33 456 789', package: 'Presence Care', mrr: 200, website: 'zenithconsulting.ba', hosting: 'Hetzner', domain: 'BH Telecom', healthScore: 88, status: 'active', since: '2025-03-20', domainExpiry: '2027-01-15', sslExpiry: '2026-11-20', editsUsed: 1, editsTotal: 4, lastMaintenance: '2026-05-10', notes: 'Professional and easy to work with.', invoicesPaid: 14, invoicesTotal: 14, totalRevenue: 2800 },
    { id: 4, name: 'Mira Wellness', contact: 'Lejla Kovačević', email: 'lejla@mirawellness.ba', phone: '+387 33 567 890', package: 'Launch Care', mrr: 0, website: 'mirawellness.ba', hosting: 'Netlify', domain: 'Namecheap', healthScore: 85, status: 'active', since: '2025-06-01', domainExpiry: '2026-12-01', sslExpiry: '2026-12-01', editsUsed: 0, editsTotal: 0, lastMaintenance: '2026-05-01', notes: 'Completed Launch Care. Follow up about Presence Care.', invoicesPaid: 3, invoicesTotal: 3, totalRevenue: 1200 },
    { id: 5, name: 'Harmony Yoga', contact: 'Sara Delić', email: 'sara@harmonyyoga.ba', phone: '+387 33 678 901', package: 'Growth Care', mrr: 300, website: 'harmonyyoga.ba', hosting: 'Hetzner', domain: 'BH Telecom', healthScore: 91, status: 'active', since: '2025-09-15', domainExpiry: '2027-09-15', sslExpiry: '2027-03-15', editsUsed: 3, editsTotal: 6, lastMaintenance: '2026-05-12', notes: 'Active client. Recent redesign completed.', invoicesPaid: 8, invoicesTotal: 8, totalRevenue: 3900 },
    { id: 6, name: 'Stari Grad Restaurant', contact: 'Emir Hodžić', email: 'emir@starigradrestaurant.ba', phone: '+387 33 789 012', package: 'Presence Care', mrr: 200, website: 'starigradrestaurant.ba', hosting: 'Hetzner', domain: 'BH Telecom', healthScore: 96, status: 'active', since: '2024-11-01', domainExpiry: '2027-11-01', sslExpiry: '2027-05-01', editsUsed: 1, editsTotal: 4, lastMaintenance: '2026-05-05', notes: 'Long-term client. Stable.', invoicesPaid: 17, invoicesTotal: 17, totalRevenue: 3700 },
  ],
  addClient: (client) => {
    const id = nextId()
    const entry = {
      id, ...client,
      healthScore: 100, status: 'active', since: now(),
      editsUsed: 0, editsTotal: client.package === 'Growth Care' ? 6 : client.package === 'Presence Care' ? 4 : 0,
      lastMaintenance: null, invoicesPaid: 0, invoicesTotal: 0, totalRevenue: 0,
      domainExpiry: '', sslExpiry: '',
    }
    set(s => ({ clients: [entry, ...s.clients] }))
    get().addActivity(`New client added: ${client.name} (${client.package})`, 'success')
    return id
  },
  updateClient: (id, updates) => set(s => ({
    clients: s.clients.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  // ═══════════════════════════════════════════
  // PROPOSALS
  // ═══════════════════════════════════════════
  proposals: [
    { id: 'PRP-024', client: 'Sarajevo Dental Clinic', package: 'Launch Care', value: 800, status: 'draft', created: '2026-05-12', validUntil: '2026-06-12', winProb: 78 },
    { id: 'PRP-023', client: 'Alpine Outdoor Shop', package: 'Growth Care', value: 1500, status: 'sent', created: '2026-05-10', sentDate: '2026-05-11', validUntil: '2026-06-10', winProb: 65 },
    { id: 'PRP-022', client: 'Mostar Photography', package: 'Growth Care', value: 1800, status: 'viewed', created: '2026-05-08', sentDate: '2026-05-09', viewedDate: '2026-05-10', validUntil: '2026-06-08', winProb: 72 },
    { id: 'PRP-021', client: 'Harmony Yoga', package: 'Launch Care', value: 900, status: 'won', created: '2026-04-20', sentDate: '2026-04-21', wonDate: '2026-05-01', winProb: 95 },
    { id: 'PRP-020', client: 'Tuzla Auto Repair', package: 'Launch Care', value: 800, status: 'lost', created: '2026-04-15', sentDate: '2026-04-16', lostReason: 'Price too high', winProb: 0 },
  ],
  addProposal: (proposal) => {
    const num = get().proposals.length + 20
    const id = `PRP-${String(num).padStart(3, '0')}`
    const entry = { id, ...proposal, status: 'draft', created: now(), validUntil: '', winProb: 50 }
    set(s => ({ proposals: [entry, ...s.proposals] }))
    get().addActivity(`New proposal ${id} created for ${proposal.client}`, 'accent')
    return id
  },
  updateProposal: (id, updates) => set(s => ({
    proposals: s.proposals.map(p => p.id === id ? { ...p, ...updates } : p)
  })),

  // ═══════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════
  tasks: [
    { id: 1, title: 'Follow up with Peak Athletics on overdue invoices', priority: 'high', status: 'todo', due: '2026-05-14', client: 'Peak Athletics', module: 'billing' },
    { id: 2, title: 'Send domain renewal reminder to Brava Interiors', priority: 'high', status: 'todo', due: '2026-05-14', client: 'Brava Interiors', module: 'hosting' },
    { id: 3, title: 'Prepare proposal for Sarajevo Dental Clinic', priority: 'medium', status: 'in-progress', due: '2026-05-15', client: 'Sarajevo Dental Clinic', module: 'proposals' },
    { id: 4, title: 'Monthly maintenance report for Harmony Yoga', priority: 'medium', status: 'todo', due: '2026-05-16', client: 'Harmony Yoga', module: 'maintenance' },
    { id: 5, title: 'Update SSL certificate for Stari Grad Restaurant', priority: 'low', status: 'done', due: '2026-05-12', client: 'Stari Grad Restaurant', module: 'hosting' },
    { id: 6, title: 'Content update request from Zenith Consulting', priority: 'medium', status: 'in-progress', due: '2026-05-15', client: 'Zenith Consulting', module: 'maintenance' },
    { id: 7, title: 'Create Instagram content for Launch Care promo', priority: 'low', status: 'todo', due: '2026-05-18', client: '', module: 'content' },
    { id: 8, title: 'Review Alpine Outdoor proposal response', priority: 'high', status: 'todo', due: '2026-05-13', client: 'Alpine Outdoor Shop', module: 'proposals' },
  ],
  addTask: (task) => {
    const id = nextId()
    set(s => ({ tasks: [{ id, ...task, status: 'todo', created: now() }, ...s.tasks] }))
    get().addActivity(`Task created: ${task.title}`, 'info')
    return id
  },
  updateTask: (id, updates) => set(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  // ═══════════════════════════════════════════
  // DEALS (Pipeline)
  // ═══════════════════════════════════════════
  deals: [
    { id: 1, name: 'Sarajevo Dental Clinic', value: 800, package: 'Launch Care', stage: 'qualified', score: 92, days: 3 },
    { id: 2, name: 'Alpine Outdoor Shop', value: 1500, package: 'Growth Care', stage: 'proposal', score: 87, days: 8 },
    { id: 3, name: 'Mostar Photography', value: 1800, package: 'Growth Care', stage: 'proposal', score: 81, days: 5 },
    { id: 4, name: 'Harmony Yoga Studio', value: 900, package: 'Launch Care', stage: 'won', score: 78, days: 0 },
    { id: 5, name: 'Zen Café', value: 800, package: 'Launch Care', stage: 'new', score: 65, days: 1 },
    { id: 6, name: 'Tuzla Fitness Center', value: 1500, package: 'Growth Care', stage: 'new', score: 74, days: 2 },
    { id: 7, name: 'Banja Luka Bakery', value: 800, package: 'Launch Care', stage: 'qualified', score: 70, days: 6 },
  ],
  addDeal: (deal) => {
    const id = nextId()
    set(s => ({ deals: [{ id, ...deal, stage: deal.stage || 'new', days: 0 }, ...s.deals] }))
    get().addActivity(`New deal added: ${deal.name} (${deal.value} BAM)`, 'accent')
    return id
  },
  updateDeal: (id, updates) => set(s => ({
    deals: s.deals.map(d => d.id === id ? { ...d, ...updates } : d)
  })),

  // ═══════════════════════════════════════════
  // OUTREACH SEQUENCES
  // ═══════════════════════════════════════════
  sequences: [
    { id: 1, name: 'Dental Clinics — No Website', niche: 'Dental', channel: 'Email', leads: 8, sent: 3, replied: 1, status: 'active', lastSent: '2026-05-12' },
    { id: 2, name: 'Restaurants — Outdated Sites', niche: 'Restaurant', channel: 'Email', leads: 12, sent: 7, replied: 2, status: 'active', lastSent: '2026-05-11' },
    { id: 3, name: 'Fitness Studios — Mostar', niche: 'Fitness', channel: 'DM', leads: 5, sent: 5, replied: 0, status: 'paused', lastSent: '2026-05-08' },
  ],
  addSequence: (seq) => {
    const id = nextId()
    set(s => ({ sequences: [{ id, ...seq, leads: 0, sent: 0, replied: 0, status: 'active', lastSent: null, created: now() }, ...s.sequences] }))
    get().addActivity(`New outreach sequence: ${seq.name}`, 'accent')
    return id
  },

  // ═══════════════════════════════════════════
  // KNOWLEDGE BASE
  // ═══════════════════════════════════════════
  knowledge: [
    { id: 1, title: 'Launch Care Package Scope', category: 'packages', tags: ['scope', 'pricing'], updated: '2026-05-10', excerpt: 'Up to 5 pages, mobile responsive, basic SEO, contact form, hosting setup, 30 days support. Starting from 800 BAM.' },
    { id: 2, title: 'Common Client Objections', category: 'sales', tags: ['objections', 'responses'], updated: '2026-05-08', excerpt: 'Price objections: emphasize ROI and total cost of ownership.' },
    { id: 3, title: 'Maintenance Checklist', category: 'operations', tags: ['maintenance', 'checklist'], updated: '2026-05-05', excerpt: 'Monthly: plugin updates, security scan, backup verification.' },
    { id: 4, title: 'DNS Configuration Guide', category: 'technical', tags: ['dns', 'hosting', 'setup'], updated: '2026-04-28', excerpt: 'A records, CNAME for www, MX for email, TXT for verification.' },
    { id: 5, title: 'Proposal Best Practices', category: 'sales', tags: ['proposals', 'best-practices'], updated: '2026-04-25', excerpt: 'Always include: executive summary, scope, deliverables, timeline.' },
    { id: 6, title: 'Client Onboarding Process', category: 'operations', tags: ['onboarding', 'process'], updated: '2026-04-20', excerpt: 'Step 1: Welcome email. Step 2: Access setup. Step 3: Discovery call.' },
  ],
  addKnowledge: (entry) => {
    const id = nextId()
    set(s => ({ knowledge: [{ id, ...entry, updated: now() }, ...s.knowledge] }))
    get().addActivity(`Knowledge entry added: ${entry.title}`, 'info')
    return id
  },

  // ═══════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════
  invoices: [
    { id: 'INV-1048', client: 'Zenith Consulting', amount: 350, status: 'paid', issued: '2026-05-01', due: '2026-05-15', paid: '2026-05-13', description: 'Presence Care — May 2026' },
    { id: 'INV-1047', client: 'Mira Wellness', amount: 325, status: 'paid', issued: '2026-04-28', due: '2026-05-12', paid: '2026-05-10', description: 'Maintenance update' },
    { id: 'INV-1042', client: 'Peak Athletics', amount: 450, status: 'overdue', issued: '2026-04-20', due: '2026-05-01', paid: null, description: 'Growth Care — April 2026' },
    { id: 'INV-1038', client: 'Zen Café', amount: 200, status: 'overdue', issued: '2026-04-15', due: '2026-04-28', paid: null, description: 'Launch Care deposit' },
    { id: 'INV-1044', client: 'Brava Interiors', amount: 250, status: 'paid', issued: '2026-04-25', due: '2026-05-10', paid: '2026-05-05', description: 'Presence Care — April 2026' },
    { id: 'INV-1040', client: 'Alpine Outdoor Shop', amount: 800, status: 'pending', issued: '2026-05-11', due: '2026-05-25', paid: null, description: 'Growth Care setup fee' },
  ],
  addInvoice: (inv) => {
    const num = 1049 + get().invoices.length
    const id = `INV-${num}`
    set(s => ({ invoices: [{ id, ...inv, status: 'pending', issued: now(), paid: null }, ...s.invoices] }))
    get().addActivity(`Invoice ${id} created for ${inv.client} (${inv.amount} BAM)`, 'info')
    return id
  },
  updateInvoice: (id, updates) => set(s => ({
    invoices: s.invoices.map(inv => inv.id === id ? { ...inv, ...updates } : inv)
  })),

  // ═══════════════════════════════════════════
  // SOCIAL POSTS
  // ═══════════════════════════════════════════
  socialPosts: [
    { id: 1, platform: 'Instagram', client: 'Harmony Yoga', type: 'Carousel', date: '2026-05-14', time: '10:00', status: 'scheduled', caption: 'Morning flow sessions starting next week...' },
    { id: 2, platform: 'Facebook', client: 'Stari Grad Restaurant', type: 'Single Image', date: '2026-05-14', time: '12:00', status: 'scheduled', caption: 'New summer menu now available...' },
    { id: 3, platform: 'Instagram', client: 'Brava Interiors', type: 'Reel', date: '2026-05-15', time: '18:00', status: 'draft', caption: 'Behind the scenes of our latest project...' },
    { id: 4, platform: 'Instagram', client: 'Peak Athletics', type: 'Story', date: '2026-05-15', time: '09:00', status: 'scheduled', caption: 'Workout of the day...' },
    { id: 5, platform: 'Facebook', client: 'Zenith Consulting', type: 'Article', date: '2026-05-16', time: '14:00', status: 'draft', caption: '5 strategies for business growth in 2026...' },
  ],
  addSocialPost: (post) => {
    const id = nextId()
    set(s => ({ socialPosts: [{ id, ...post, status: post.status || 'draft' }, ...s.socialPosts] }))
    get().addActivity(`Social post scheduled for ${post.client} on ${post.platform}`, 'info')
    return id
  },

  // ═══════════════════════════════════════════
  // COMPETITORS
  // ═══════════════════════════════════════════
  competitors: [
    { id: 1, name: 'WebPro Sarajevo', url: 'webpro.ba', focus: 'E-commerce & WordPress', pricing: '500-2000 BAM', strengths: ['E-commerce expertise', 'Large team', 'Established brand'], weaknesses: ['Generic templates', 'Slow turnaround', 'No ongoing care'], threat: 'high' },
    { id: 2, name: 'Digital Wave BH', url: 'digitalwave.ba', focus: 'Marketing & Web', pricing: '300-1500 BAM', strengths: ['Low prices', 'Social media bundles', 'Fast delivery'], weaknesses: ['Low quality', 'No maintenance', 'Template-based'], threat: 'medium' },
    { id: 3, name: 'CreativeHub Mostar', url: 'creativehub.ba', focus: 'Branding & Design', pricing: '800-3000 BAM', strengths: ['Strong design', 'Branding focus', 'Creative portfolio'], weaknesses: ['Slow delivery', 'Limited dev skills', 'Expensive'], threat: 'low' },
    { id: 4, name: 'Freelancers (Various)', url: '-', focus: 'Various', pricing: '200-800 BAM', strengths: ['Very low prices', 'Quick turnaround', 'Flexible'], weaknesses: ['Unreliable', 'No support', 'Quality varies'], threat: 'medium' },
  ],
  addCompetitor: (comp) => {
    const id = nextId()
    set(s => ({ competitors: [{ id, ...comp }, ...s.competitors] }))
    get().addActivity(`Competitor added: ${comp.name}`, 'info')
    return id
  },

  // ═══════════════════════════════════════════
  // CALENDAR EVENTS
  // ═══════════════════════════════════════════
  calendarEvents: [
    { id: 1, date: '2026-05-14', time: '09:00', title: 'Monthly maintenance — Harmony Yoga', type: 'maintenance', client: 'Harmony Yoga' },
    { id: 2, date: '2026-05-14', time: '11:00', title: 'Content delivery — Peak Athletics', type: 'delivery', client: 'Peak Athletics' },
    { id: 3, date: '2026-05-15', time: null, title: 'Domain renewal — bravainteriors.ba', type: 'deadline', client: 'Brava Interiors' },
    { id: 4, date: '2026-05-15', time: '15:00', title: 'Invoice follow-up — Zen Café', type: 'billing', client: 'Zen Café' },
    { id: 5, date: '2026-05-16', time: '10:00', title: 'Onboarding kickoff — Mostar Photography', type: 'meeting', client: 'Mostar Photography Studio' },
    { id: 6, date: '2026-05-18', time: null, title: 'Presence Care renewals due', type: 'deadline', client: null },
    { id: 7, date: '2026-05-20', time: null, title: 'Monthly report generation', type: 'task', client: null },
    { id: 8, date: '2026-05-27', time: null, title: 'Domain renewal — peakathletics.com', type: 'deadline', client: 'Peak Athletics' },
  ],
  addCalendarEvent: (event) => {
    const id = nextId()
    set(s => ({ calendarEvents: [{ id, ...event }, ...s.calendarEvents].sort((a, b) => a.date.localeCompare(b.date)) }))
    get().addActivity(`Event added: ${event.title}`, 'info')
    return id
  },

}))
