import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ══════════════════════════════════════════════════════════════
//  UNIFIED MANAGEMENT STORE — Real-data only
//  All collections start EMPTY. Data flows in via user actions
//  (e.g. add a client, send an invoice, log a lead).
//  Persisted to localStorage so user data survives reloads.
// ══════════════════════════════════════════════════════════════

let _id = Date.now()
const nextId = () => ++_id

const now = () => new Date().toISOString().slice(0, 10)

export const useStore = create(persist((set, get) => ({

  // ── Activity feed ──
  activity: [],
  addActivity: (text, type = 'info') => set(s => ({
    activity: [{ id: nextId(), time: 'Just now', text, type, at: new Date().toISOString() }, ...s.activity].slice(0, 100)
  })),

  // ── Scout searches ──
  searches: [],
  addSearch: (search) => {
    const id = nextId()
    const entry = { id, ...search, status: 'completed', results: 0, created: now() }
    set(s => ({ searches: [entry, ...s.searches] }))
    get().addActivity(`Scout search saved: ${search.name}`, 'accent')
    return id
  },

  // ── Leads ──
  leads: [],
  addLead: (lead) => {
    const id = nextId()
    const score = lead.score || (lead.hasWebsite ? 60 : 80)
    const entry = { id, ...lead, score, stage: lead.stage || 'new', urgency: score >= 80 ? 'high' : score >= 65 ? 'medium' : 'low', created: now() }
    set(s => ({ leads: [entry, ...s.leads] }))
    get().addActivity(`New lead: ${lead.name} (score: ${score})`, 'accent')
    return id
  },
  updateLead: (id, updates) => set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...updates } : l) })),
  removeLead: (id) => set(s => ({ leads: s.leads.filter(l => l.id !== id) })),

  // ── Clients ──
  clients: [],
  addClient: (client) => {
    const id = nextId()
    const entry = {
      id, ...client,
      healthScore: client.healthScore ?? 100,
      status: client.status || 'active',
      since: client.since || now(),
      editsUsed: 0,
      editsTotal: client.package === 'Growth Care' ? 6 : client.package === 'Presence Care' ? 4 : 0,
      lastMaintenance: null,
      invoicesPaid: 0, invoicesTotal: 0, totalRevenue: 0,
      domainExpiry: client.domainExpiry || '',
      sslExpiry: client.sslExpiry || '',
    }
    set(s => ({ clients: [entry, ...s.clients] }))
    get().addActivity(`New client: ${client.name} (${client.package || 'No package'})`, 'success')
    return id
  },
  updateClient: (id, updates) => set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...updates } : c) })),
  removeClient: (id) => set(s => ({ clients: s.clients.filter(c => c.id !== id) })),

  // ── Proposals ──
  proposals: [],
  addProposal: (proposal) => {
    const num = 1000 + get().proposals.length + 1
    const id = `PRP-${num}`
    const entry = { id, ...proposal, status: proposal.status || 'draft', created: now(), validUntil: proposal.validUntil || '', winProb: proposal.winProb ?? 50 }
    set(s => ({ proposals: [entry, ...s.proposals] }))
    get().addActivity(`Proposal ${id} created for ${proposal.client}`, 'accent')
    return id
  },
  updateProposal: (id, updates) => set(s => ({ proposals: s.proposals.map(p => p.id === id ? { ...p, ...updates } : p) })),
  removeProposal: (id) => set(s => ({ proposals: s.proposals.filter(p => p.id !== id) })),

  // ── Tasks ──
  tasks: [],
  addTask: (task) => {
    const id = nextId()
    set(s => ({ tasks: [{ id, ...task, status: task.status || 'todo', created: now() }, ...s.tasks] }))
    get().addActivity(`Task created: ${task.title}`, 'info')
    return id
  },
  updateTask: (id, updates) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) })),
  removeTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  // ── Pipeline deals ──
  deals: [],
  addDeal: (deal) => {
    const id = nextId()
    set(s => ({ deals: [{ id, ...deal, stage: deal.stage || 'new', days: 0, created: now() }, ...s.deals] }))
    get().addActivity(`Deal added: ${deal.name} (${deal.value || 0} BAM)`, 'accent')
    return id
  },
  updateDeal: (id, updates) => set(s => ({ deals: s.deals.map(d => d.id === id ? { ...d, ...updates } : d) })),
  removeDeal: (id) => set(s => ({ deals: s.deals.filter(d => d.id !== id) })),

  // ── Outreach sequences ──
  sequences: [],
  addSequence: (seq) => {
    const id = nextId()
    set(s => ({ sequences: [{ id, ...seq, leads: 0, sent: 0, replied: 0, status: 'active', lastSent: null, created: now() }, ...s.sequences] }))
    get().addActivity(`Outreach sequence created: ${seq.name}`, 'accent')
    return id
  },
  updateSequence: (id, updates) => set(s => ({ sequences: s.sequences.map(sq => sq.id === id ? { ...sq, ...updates } : sq) })),
  removeSequence: (id) => set(s => ({ sequences: s.sequences.filter(sq => sq.id !== id) })),

  // ── Knowledge base ──
  knowledge: [],
  addKnowledge: (entry) => {
    const id = nextId()
    set(s => ({ knowledge: [{ id, ...entry, updated: now() }, ...s.knowledge] }))
    get().addActivity(`Knowledge entry added: ${entry.title}`, 'info')
    return id
  },
  updateKnowledge: (id, updates) => set(s => ({ knowledge: s.knowledge.map(k => k.id === id ? { ...k, ...updates, updated: now() } : k) })),
  removeKnowledge: (id) => set(s => ({ knowledge: s.knowledge.filter(k => k.id !== id) })),

  // ── Invoices ──
  invoices: [],
  addInvoice: (inv) => {
    const num = 1000 + get().invoices.length + 1
    const id = `INV-${num}`
    set(s => ({ invoices: [{ id, ...inv, status: inv.status || 'pending', issued: now(), paid: null }, ...s.invoices] }))
    get().addActivity(`Invoice ${id} created for ${inv.client} (${inv.amount} BAM)`, 'info')
    return id
  },
  updateInvoice: (id, updates) => set(s => ({ invoices: s.invoices.map(inv => inv.id === id ? { ...inv, ...updates } : inv) })),
  removeInvoice: (id) => set(s => ({ invoices: s.invoices.filter(inv => inv.id !== id) })),

  // ── Social posts ──
  socialPosts: [],
  addSocialPost: (post) => {
    const id = nextId()
    set(s => ({ socialPosts: [{ id, ...post, status: post.status || 'draft', created: now() }, ...s.socialPosts] }))
    get().addActivity(`Social post added for ${post.client || 'unassigned'}`, 'info')
    return id
  },
  updateSocialPost: (id, updates) => set(s => ({ socialPosts: s.socialPosts.map(p => p.id === id ? { ...p, ...updates } : p) })),
  removeSocialPost: (id) => set(s => ({ socialPosts: s.socialPosts.filter(p => p.id !== id) })),

  // ── Competitors ──
  competitors: [],
  addCompetitor: (comp) => {
    const id = nextId()
    set(s => ({ competitors: [{ id, ...comp }, ...s.competitors] }))
    get().addActivity(`Competitor added: ${comp.name}`, 'info')
    return id
  },
  updateCompetitor: (id, updates) => set(s => ({ competitors: s.competitors.map(c => c.id === id ? { ...c, ...updates } : c) })),
  removeCompetitor: (id) => set(s => ({ competitors: s.competitors.filter(c => c.id !== id) })),

  // ── Calendar events ──
  calendarEvents: [],
  addCalendarEvent: (event) => {
    const id = nextId()
    set(s => ({ calendarEvents: [{ id, ...event }, ...s.calendarEvents].sort((a, b) => (a.date || '').localeCompare(b.date || '')) }))
    get().addActivity(`Event added: ${event.title}`, 'info')
    return id
  },
  removeCalendarEvent: (id) => set(s => ({ calendarEvents: s.calendarEvents.filter(e => e.id !== id) })),

  // ── Admin: reset everything to a clean slate ──
  resetAll: () => set({
    activity: [], searches: [], leads: [], clients: [], proposals: [],
    tasks: [], deals: [], sequences: [], knowledge: [], invoices: [],
    socialPosts: [], competitors: [], calendarEvents: [],
  }),

}), {
  name: 'cloz_management_v2',
  storage: createJSONStorage(() => localStorage),
  // Only persist data collections; not actions
  partialize: (state) => ({
    activity: state.activity,
    searches: state.searches,
    leads: state.leads,
    clients: state.clients,
    proposals: state.proposals,
    tasks: state.tasks,
    deals: state.deals,
    sequences: state.sequences,
    knowledge: state.knowledge,
    invoices: state.invoices,
    socialPosts: state.socialPosts,
    competitors: state.competitors,
    calendarEvents: state.calendarEvents,
  }),
}))
