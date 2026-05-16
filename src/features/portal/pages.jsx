import { useState, useEffect, useRef } from 'react'
import { Link, useOutletContext, useNavigate, useParams } from 'react-router-dom'
import {
  Loader2, Plus, AlertCircle, CheckCircle2, ExternalLink, X, ArrowRight,
  Mail, Phone, Globe, Shield, Calendar, Clock, FileText, Inbox, Send,
  MessageSquare, FolderOpen, Trash2, Folder, Image as ImageIcon, FileSignature,
  Sparkles, Star, ArrowLeft, BookOpen, Palette, ExternalLink as ExtLink,
} from 'lucide-react'
import { portal } from '@/lib/portalApi'

// ══════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ══════════════════════════════════════════════════════════════

// Always returns a safe object — never throws on destructure
function useClient() {
  const ctx = useOutletContext() || {}
  const fallback = {
    id: '',
    business_name: 'Client',
    contact_name: '',
    email: '',
    phone: '',
    industry: '',
    website: '',
    logo_url: '',
    brand_colors: {},
    brand_fonts: {},
    voice_guidelines: '',
    package: '',
    hosting_provider: '',
    domain_registrar: '',
    domain_expiry: '',
    ssl_expiry: '',
    status: 'active',
  }
  return { client: { ...fallback, ...(ctx.client || {}) }, setClient: ctx.setClient || (() => {}) }
}

// Safe first-name extraction
function firstNameOf(client) {
  const n = client?.contact_name || client?.business_name || 'there'
  return String(n).split(' ')[0]
}

function Header({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">{title}</h1>
        {subtitle && <p className="text-[12px] text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Empty({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="bg-surface border border-border rounded-xl py-16 px-6 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-elevated flex items-center justify-center mb-4">
        <Icon size={22} className="text-text-tertiary" />
      </div>
      <h3 className="font-display font-semibold text-[15px] mb-2">{title}</h3>
      {description && <p className="text-[12px] text-text-tertiary max-w-[420px] mx-auto leading-relaxed mb-5">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction}
          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-semibold">
          <Plus size={12} />{actionLabel}
        </button>
      )}
    </div>
  )
}

function ErrorBox({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="bg-error/5 border border-error/20 rounded-md px-3 py-2 text-[12px] text-error flex items-center gap-2 mb-3">
      <AlertCircle size={13} /><span className="flex-1">{message}</span>
      {onDismiss && <button onClick={onDismiss}><X size={13} /></button>}
    </div>
  )
}

function daysBetween(s) {
  if (!s) return null
  return Math.round((new Date(s) - new Date()) / 86400000)
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════

export function Dashboard() {
  const { client } = useClient()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    portal.dashboard().then(d => { setData(d); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={22} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {error && <ErrorBox message={error} onDismiss={() => setError('')} />}

      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-accent-muted via-surface to-surface border border-accent/20 rounded-xl p-6 mb-5">
        <div className="flex items-center gap-4">
          {client.logo_url ? (
            <img src={client.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[22px] font-display font-bold text-white shrink-0"
              style={{ background: client.brand_colors?.accent || '#5E8DB5' }}>
              {(client.business_name || 'C').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display font-bold text-[22px]">Welcome back, {firstNameOf(client)}.</h1>
            <p className="text-[12px] text-text-secondary mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={MessageSquare} label="Open Tickets" value={data?.summary?.open_tickets || 0} to="/portal/support" color={data?.summary?.open_tickets > 0 ? 'text-warning' : 'text-success'} />
        <StatCard icon={Receipt} label="Unpaid Invoices" value={data?.summary?.unpaid_invoices || 0} sub={data?.summary?.unpaid_total ? `${data.summary.unpaid_total} BAM` : ''} to="/portal/billing" color={data?.summary?.unpaid_invoices > 0 ? 'text-warning' : 'text-success'} />
        <StatCard icon={FileSignature} label="Pending Approvals" value={data?.summary?.pending_approvals || 0} to="/portal/approvals" color={data?.summary?.pending_approvals > 0 ? 'text-accent' : 'text-success'} />
        <StatCard icon={FolderOpen} label="Brand Assets" value={data?.summary?.assets || 0} to="/portal/assets" />
      </div>

      {/* Hosting status */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2"><Globe size={13} className="text-accent" />Website Status</h2>
          {client.website ? (
            <>
              <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer"
                className="text-[13px] text-accent hover:text-accent-hover flex items-center gap-1.5">
                {client.website}<ExternalLink size={11} />
              </a>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                <DaysLeft label="Domain expires" days={data?.summary?.domain_days_left} />
                <DaysLeft label="SSL expires" days={data?.summary?.ssl_days_left} />
              </div>
            </>
          ) : (
            <p className="text-[12px] text-text-tertiary">Website not yet configured.</p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2"><MessageSquare size={13} className="text-accent" />Recent Tickets</h2>
          {data?.recent_tickets?.length === 0 ? (
            <p className="text-[12px] text-text-tertiary py-4">No tickets yet. <Link to="/portal/support" className="text-accent">Open one →</Link></p>
          ) : (
            <div className="space-y-2">
              {data?.recent_tickets?.slice(0, 4).map(t => (
                <Link key={t.id} to={`/portal/support/${t.id}`}
                  className="block bg-elevated hover:bg-raised rounded-md px-3 py-2 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-medium truncate">{t.subject}</span>
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      t.status === 'open' ? 'bg-accent-muted text-accent' :
                      t.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                      t.status === 'resolved' ? 'bg-success/10 text-success' :
                      'bg-elevated text-text-tertiary'
                    }`}>{t.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity */}
      {data?.activity?.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3">Recent Activity</h2>
          <div className="space-y-2.5">
            {data.activity.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-secondary">{a.message}</p>
                  <span className="text-[10px] text-text-tertiary">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, to, color = 'text-text-primary' }) {
  const inner = (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className={`text-[22px] font-display font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-text-tertiary mt-1">{sub}</div>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function DaysLeft({ label, days }) {
  if (days == null) return <div><div className="text-[10px] text-text-tertiary">{label}</div><div className="text-[13px] text-text-tertiary">—</div></div>
  const color = days < 0 ? 'text-error' : days <= 14 ? 'text-error' : days <= 30 ? 'text-warning' : 'text-success'
  return (
    <div>
      <div className="text-[10px] text-text-tertiary">{label}</div>
      <div className={`text-[13px] font-medium ${color}`}>
        {days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SUPPORT — list + detail
// ══════════════════════════════════════════════════════════════

export function Support() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium', category: 'general' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    portal.tickets().then(({ tickets }) => { setTickets(tickets); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (form.subject.trim().length < 3) return setError('Subject must be at least 3 characters.')
    if (form.description.trim().length < 5) return setError('Please share at least 5 characters of detail.')
    setSubmitting(true)
    setError('')
    try {
      const { ticket } = await portal.createTicket(form)
      setShowForm(false)
      setForm({ subject: '', description: '', priority: 'medium', category: 'general' })
      navigate(`/portal/support/${ticket.id}`)
    } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Support Center" subtitle="Open tickets, track responses, and get help fast"
        action={!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md text-[12px] font-semibold">
            <Plus size={13} />New Ticket
          </button>
        )} />

      <ErrorBox message={error} onDismiss={() => setError('')} />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface border border-accent/20 rounded-xl p-5 mb-5 space-y-3">
          <h3 className="font-display font-semibold text-[14px] mb-1">New Support Ticket</h3>
          <div>
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Subject</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
                <option value="general">General</option><option value="bug">Bug</option>
                <option value="content">Content</option><option value="design">Design</option>
                <option value="billing">Billing</option><option value="technical">Technical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={5} required
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none resize-none" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Submit Ticket
            </button>
          </div>
        </form>
      )}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       tickets.length === 0 ? <Empty icon={Inbox} title="No tickets yet" description="When you open a support request, it appears here. We respond within 24 hours on care plans." actionLabel="Open Ticket" onAction={() => setShowForm(true)} /> : (
        <div className="space-y-2">
          {tickets.map(t => (
            <Link key={t.id} to={`/portal/support/${t.id}`}
              className="block bg-surface hover:bg-elevated border border-border rounded-lg p-4 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium truncate">{t.subject}</span>
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      t.priority === 'urgent' ? 'bg-error/15 text-error' :
                      t.priority === 'high' ? 'bg-warning/15 text-warning' :
                      'bg-elevated text-text-tertiary'
                    }`}>{t.priority}</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1 capitalize">{t.category} · Updated {new Date(t.updated_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded shrink-0 ${
                  t.status === 'open' ? 'bg-accent-muted text-accent' :
                  t.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                  t.status === 'resolved' ? 'bg-success/10 text-success' :
                  'bg-elevated text-text-tertiary'
                }`}>{t.status.replace('_', ' ')}</span>
              </div>
              {t.description && <p className="text-[12px] text-text-secondary line-clamp-2 mt-2">{t.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function SupportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    portal.ticket(id).then(({ ticket, messages }) => {
      setTicket(ticket); setMessages(messages); setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [id])

  const sendReply = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await portal.replyTicket(id, reply.trim())
      setReply('')
      load()
    } catch (e) { setError(e.message) } finally { setSending(false) }
  }

  const toggleStatus = async (action) => {
    try { await portal.updateTicket(id, { action }); load() }
    catch (e) { setError(e.message) }
  }

  const rate = async (rating) => {
    try { await portal.updateTicket(id, { action: 'rate', satisfaction_rating: rating }); load() }
    catch (e) { setError(e.message) }
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
  if (!ticket) return <div className="p-6"><Empty icon={Inbox} title="Ticket not found" /></div>

  return (
    <div className="p-6 max-w-[820px] mx-auto">
      <button onClick={() => navigate('/portal/support')}
        className="text-[11px] text-text-tertiary hover:text-text-primary mb-3 flex items-center gap-1">
        <ArrowLeft size={11} />Back to Support
      </button>

      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <h1 className="font-display font-bold text-[20px]">{ticket.subject}</h1>
          <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded ${
            ticket.status === 'open' ? 'bg-accent-muted text-accent' :
            ticket.status === 'in_progress' ? 'bg-warning/10 text-warning' :
            ticket.status === 'resolved' ? 'bg-success/10 text-success' :
            'bg-elevated text-text-tertiary'
          }`}>{ticket.status.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary capitalize">
          <span>{ticket.priority} priority</span><span>·</span>
          <span>{ticket.category}</span><span>·</span>
          <span>Created {new Date(ticket.created_at).toLocaleString()}</span>
        </div>
      </div>

      <ErrorBox message={error} onDismiss={() => setError('')} />

      {/* Conversation */}
      <div className="space-y-3 mb-5">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.author === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              m.author === 'client' ? 'bg-accent text-white' : 'bg-surface border border-border'
            }`}>
              <div className={`text-[10px] mb-1 ${m.author === 'client' ? 'text-white/80' : 'text-text-tertiary'}`}>
                {m.author_name || (m.author === 'cloz' ? 'Cloz Digital' : 'You')} · {new Date(m.created_at).toLocaleString()}
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply / actions */}
      {ticket.status !== 'closed' && (
        <form onSubmit={sendReply} className="bg-surface border border-border rounded-xl p-4 mb-4">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Type your reply…"
            className="w-full bg-elevated border border-border rounded-md p-3 text-[13px] focus:border-accent focus:outline-none resize-none mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ticket.status === 'closed' || ticket.status === 'resolved' ? (
                <button type="button" onClick={() => toggleStatus('reopen')}
                  className="text-[11px] text-text-tertiary hover:text-accent">Reopen ticket</button>
              ) : (
                <button type="button" onClick={() => toggleStatus('close')}
                  className="text-[11px] text-text-tertiary hover:text-text-primary">Close ticket</button>
              )}
            </div>
            <button type="submit" disabled={sending || !reply.trim()}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}Send
            </button>
          </div>
        </form>
      )}

      {/* Satisfaction rating */}
      {(ticket.status === 'closed' || ticket.status === 'resolved') && (
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-[12px] text-text-secondary mb-3">How was this support experience?</p>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => rate(n)}
                className={`p-1 transition-colors ${ticket.satisfaction_rating >= n ? 'text-warning' : 'text-text-tertiary hover:text-warning'}`}>
                <Star size={20} fill={ticket.satisfaction_rating >= n ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          {ticket.satisfaction_rating > 0 && <p className="text-[11px] text-text-tertiary mt-2">Thank you for the feedback.</p>}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  ASSETS
// ══════════════════════════════════════════════════════════════

export function Assets() {
  const [assets, setAssets] = useState([])
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'file', url: '', folder: '', description: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    portal.assets(folder).then(({ assets, folders }) => {
      setAssets(assets); setFolders(folders); setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [folder])

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await portal.createAsset(form)
      setForm({ name: '', type: 'file', url: '', folder: '', description: '' })
      setShowForm(false)
      load()
    } catch (e) { setError(e.message) }
  }

  const remove = async (id) => {
    if (!confirm('Remove this asset?')) return
    try { await portal.deleteAsset(id); load() }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Asset Library" subtitle="Logos, photos, brand guidelines, credentials, and more"
        action={!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md text-[12px] font-semibold">
            <Plus size={13} />Add Asset
          </button>
        )} />

      <ErrorBox message={error} onDismiss={() => setError('')} />

      <div className="bg-info/5 border border-info/20 rounded-md p-3 text-[11px] text-info mb-4 leading-relaxed">
        Direct file upload to private storage is coming in Phase 2. For now, paste a public URL (e.g. from your Drive, Dropbox, or any image host).
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-surface border border-accent/20 rounded-xl p-5 mb-5 space-y-3">
          <h3 className="font-display font-semibold text-[14px]">Add Asset</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Asset name" required
              className="bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
              <option value="logo">Logo</option><option value="photo">Photo</option>
              <option value="video">Video</option><option value="document">Document</option>
              <option value="font">Font</option><option value="brand-guideline">Brand Guideline</option>
              <option value="credential">Credential</option><option value="file">Other</option>
            </select>
          </div>
          <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="Public URL" type="url" required
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          <div className="grid md:grid-cols-2 gap-3">
            <input value={form.folder} onChange={e => setForm({ ...form, folder: e.target.value })} placeholder="Folder (optional)"
              className="bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)"
              className="bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Cancel</button>
            <button type="submit"
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-semibold">Save Asset</button>
          </div>
        </form>
      )}

      {/* Folder filter */}
      {folders.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button onClick={() => setFolder('')}
            className={`text-[11px] px-2 py-0.5 rounded ${!folder ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'}`}>
            All ({assets.length})
          </button>
          {folders.map(f => (
            <button key={f} onClick={() => setFolder(f)}
              className={`text-[11px] px-2 py-0.5 rounded flex items-center gap-1 ${folder === f ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'}`}>
              <Folder size={10} />{f}
            </button>
          ))}
        </div>
      )}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       assets.length === 0 ? <Empty icon={FolderOpen} title="No assets yet" description="Add your logos, brand photos, fonts, and guidelines so they're always within reach." actionLabel="Add First Asset" onAction={() => setShowForm(true)} /> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {assets.map(a => (
            <div key={a.id} className="bg-surface border border-border rounded-lg p-4 group">
              <div className="aspect-square bg-elevated rounded-md mb-3 flex items-center justify-center overflow-hidden">
                {a.type === 'logo' || a.type === 'photo' || a.mime_type?.startsWith('image') ? (
                  <img src={a.url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none' }} />
                ) : (
                  <ImageIcon size={32} className="text-text-tertiary" />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate">{a.name}</div>
                  <div className="text-[10px] text-text-tertiary capitalize">{a.type}{a.folder ? ` · ${a.folder}` : ''}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    className="p-1 text-text-tertiary hover:text-accent"><ExternalLink size={12} /></a>
                  <button onClick={() => remove(a.id)}
                    className="p-1 text-text-tertiary hover:text-error"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  BILLING
// ══════════════════════════════════════════════════════════════

export function Billing() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    portal.billing().then(d => { setData(d); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  const fmt = (n, c = 'BAM') => `${(n || 0).toLocaleString()} ${c}`

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Billing" subtitle="Invoices, payment history, and your current plan" />
      <ErrorBox message={error} onDismiss={() => setError('')} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Receipt} label="Unpaid Invoices" value={data?.summary?.unpaid || 0} color={data?.summary?.unpaid > 0 ? 'text-warning' : 'text-success'} />
        <StatCard icon={Receipt} label="Outstanding" value={fmt(data?.summary?.unpaid_total)} color={data?.summary?.unpaid_total > 0 ? 'text-warning' : 'text-success'} />
        <StatCard icon={Receipt} label="Paid This Year" value={fmt(data?.summary?.paid_total)} color="text-success" />
        <StatCard icon={Receipt} label="MRR" value={fmt(data?.summary?.mrr)} color="text-accent" />
      </div>

      {data?.package && (
        <div className="bg-surface border border-border rounded-lg p-5 mb-5">
          <h2 className="font-display font-semibold text-[14px] mb-2 flex items-center gap-2"><Receipt size={13} className="text-accent" />Current Plan</h2>
          <p className="text-[14px]">{data.package}</p>
        </div>
      )}

      {data?.invoices?.length === 0 ? (
        <Empty icon={Receipt} title="No invoices yet" description="When invoices are issued, they appear here for download and review." />
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                {['Invoice', 'Description', 'Issued', 'Due', 'Amount', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.invoices?.map(inv => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-elevated/50">
                  <td className="px-4 py-3 text-[12px] font-mono">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{inv.description || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-text-tertiary">{inv.issued || '—'}</td>
                  <td className="px-4 py-3 text-[11px] text-text-tertiary">{inv.due || '—'}</td>
                  <td className="px-4 py-3 text-[12px] font-medium">{fmt(inv.amount, inv.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                      inv.status === 'paid' ? 'bg-success/10 text-success' :
                      inv.status === 'overdue' ? 'bg-error/10 text-error' :
                      'bg-warning/10 text-warning'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1">
                        PDF<ExternalLink size={10} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  HOSTING
// ══════════════════════════════════════════════════════════════

export function Hosting() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { portal.hosting().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Hosting & Domain" subtitle="Your website infrastructure at a glance" />

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card title="Website">
          {data?.website ? (
            <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer"
              className="text-[14px] text-accent hover:text-accent-hover flex items-center gap-1.5">{data.website}<ExternalLink size={12} /></a>
          ) : <p className="text-[12px] text-text-tertiary">Not yet configured.</p>}
        </Card>

        <Card title="Domain Registrar">
          <p className="text-[14px]">{data?.domain_registrar || '—'}</p>
        </Card>

        <Card title="Hosting Provider">
          <p className="text-[14px]">{data?.hosting_provider || '—'}</p>
        </Card>

        <Card title="SSL Certificate">
          <ExpiryRow label="SSL expires" date={data?.ssl_expiry} days={data?.ssl_days_left} />
        </Card>
      </div>

      <Card title="Domain Expiry">
        <ExpiryRow label="Domain expires" date={data?.domain_expiry} days={data?.domain_days_left} />
      </Card>

      <div className="bg-info/5 border border-info/20 rounded-md p-3 text-[11px] text-info mt-4 leading-relaxed">
        {data?.note}
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  )
}

function ExpiryRow({ label, date, days }) {
  if (!date) return <p className="text-[12px] text-text-tertiary">Not configured.</p>
  const color = days < 0 ? 'text-error' : days <= 14 ? 'text-error' : days <= 30 ? 'text-warning' : 'text-success'
  return (
    <div>
      <p className="text-[14px] font-medium">{date}</p>
      <p className={`text-[11px] mt-1 ${color}`}>{days < 0 ? `Expired ${Math.abs(days)} days ago` : `${days} days remaining`}</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  MESSAGES (light direct line to Cloz team)
// ══════════════════════════════════════════════════════════════

export function Messages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const load = () => {
    portal.messages().then(({ messages }) => {
      setMessages(messages); setLoading(false)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }).catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const send = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      await portal.sendMessage(body.trim())
      setBody('')
      load()
    } catch (e) { setError(e.message) } finally { setSending(false) }
  }

  return (
    <div className="p-6 max-w-[820px] mx-auto flex flex-col h-full">
      <Header title="Messages" subtitle="Direct line to the Cloz Digital team" />
      <ErrorBox message={error} onDismiss={() => setError('')} />

      <div className="flex-1 bg-surface border border-border rounded-xl p-4 overflow-y-auto mb-3 min-h-[400px]">
        {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
         messages.length === 0 ? (
          <div className="text-center py-16 text-text-tertiary">
            <MessageSquare size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">Send a message to start a conversation with our team.</p>
          </div>
         ) : (
          <div className="space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.author === 'client' ? 'bg-accent text-white' : 'bg-elevated'}`}>
                  <div className={`text-[10px] mb-1 ${m.author === 'client' ? 'text-white/80' : 'text-text-tertiary'}`}>
                    {m.author_name || (m.author === 'cloz' ? 'Cloz Digital' : 'You')} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
         )}
      </div>

      <form onSubmit={send} className="flex items-end gap-2">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Type a message…"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
          className="flex-1 bg-surface border border-border rounded-md p-3 text-[13px] focus:border-accent focus:outline-none resize-none" />
        <button type="submit" disabled={sending || !body.trim()}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white p-3 rounded-md">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  APPROVALS
// ══════════════════════════════════════════════════════════════

export function Approvals() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decisionNotes, setDecisionNotes] = useState({})

  const load = () => {
    portal.approvals().then(({ approvals }) => { setApprovals(approvals); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const decide = async (id, decision) => {
    try {
      await portal.decideApproval(id, { decision, notes: decisionNotes[id] || '' })
      setDecisionNotes(n => ({ ...n, [id]: '' }))
      load()
    } catch (e) { setError(e.message) }
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Design Approvals" subtitle="Review and approve mockups, copy, and other deliverables" />
      <ErrorBox message={error} onDismiss={() => setError('')} />

      {approvals.length === 0 ? <Empty icon={FileCheck} title="Nothing to approve right now" description="When our team sends you a design or copy for review, it shows up here." /> : (
        <div className="space-y-4">
          {approvals.map(a => (
            <div key={a.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[15px]">{a.title}</h3>
                  <p className="text-[11px] text-text-tertiary capitalize mt-0.5">{a.kind} · {new Date(a.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${
                  a.status === 'pending' ? 'bg-accent-muted text-accent' :
                  a.status === 'approved' ? 'bg-success/10 text-success' :
                  a.status === 'revisions_requested' ? 'bg-warning/10 text-warning' :
                  'bg-error/10 text-error'
                }`}>{a.status.replace('_', ' ')}</span>
              </div>

              {a.preview_url && (
                <a href={a.preview_url} target="_blank" rel="noopener noreferrer"
                  className="block bg-elevated rounded-md overflow-hidden mb-3 hover:opacity-80">
                  <img src={a.preview_url} alt="" className="w-full max-h-[400px] object-contain"
                    onError={e => { e.target.parentElement.innerHTML = `<div class='p-8 text-center'><span class='text-[12px] text-accent'>Open preview ↗</span></div>` }} />
                </a>
              )}

              {a.notes && <p className="text-[12px] text-text-secondary leading-relaxed mb-3">{a.notes}</p>}

              {a.status === 'pending' && (
                <>
                  <textarea value={decisionNotes[a.id] || ''} onChange={e => setDecisionNotes(n => ({ ...n, [a.id]: e.target.value }))}
                    placeholder="Notes for our team (optional)" rows={2}
                    className="w-full bg-elevated border border-border rounded-md p-2 text-[12px] focus:border-accent focus:outline-none resize-none mb-3" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => decide(a.id, 'approved')}
                      className="flex items-center gap-1.5 bg-success/10 hover:bg-success/20 text-success px-3 py-1.5 rounded-md text-[11px] font-medium">
                      <CheckCircle2 size={12} />Approve
                    </button>
                    <button onClick={() => decide(a.id, 'revisions_requested')}
                      className="flex items-center gap-1.5 bg-warning/10 hover:bg-warning/20 text-warning px-3 py-1.5 rounded-md text-[11px] font-medium">
                      Request Revisions
                    </button>
                    <button onClick={() => decide(a.id, 'rejected')}
                      className="text-[11px] text-text-tertiary hover:text-error px-3 py-1.5">
                      Reject
                    </button>
                  </div>
                </>
              )}

              {a.decision_notes && a.status !== 'pending' && (
                <div className="mt-3 pt-3 border-t border-border text-[11px] text-text-tertiary">
                  <strong className="text-text-secondary">Your note:</strong> {a.decision_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  PROPOSALS
// ══════════════════════════════════════════════════════════════

export function Proposals() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { portal.proposals().then(({ proposals }) => { setProposals(proposals); setLoading(false) }).catch(() => setLoading(false)) }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Proposals & Contracts" subtitle="View and sign proposals from Cloz Digital" />

      {proposals.length === 0 ? <Empty icon={FileSignature} title="No proposals yet" description="When our team sends you a proposal, it appears here for review and signing." /> : (
        <div className="space-y-3">
          {proposals.map(p => (
            <Link key={p.id} to={`/portal/proposals/${p.id}`}
              className="block bg-surface hover:bg-elevated border border-border rounded-lg p-4 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-display font-semibold text-[14px]">{p.title}</h3>
                  <p className="text-[11px] text-text-tertiary mt-1">{(p.total || 0).toLocaleString()} {p.currency} · {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${
                  p.status === 'signed' ? 'bg-success/10 text-success' :
                  p.status === 'sent' ? 'bg-accent-muted text-accent' :
                  'bg-elevated text-text-tertiary'
                }`}>{p.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProposalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState(null)
  const [signature, setSignature] = useState('')
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    portal.proposal(id).then(({ proposal }) => setProposal(proposal)).catch(e => setError(e.message))
  }
  useEffect(() => { load() }, [id])

  const sign = async (e) => {
    e.preventDefault()
    if (signature.trim().length < 2) return setError('Please type your full name as your signature.')
    setSigning(true)
    try {
      await portal.signProposal(id, signature.trim())
      load()
    } catch (e) { setError(e.message) } finally { setSigning(false) }
  }

  if (!proposal) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[820px] mx-auto">
      <button onClick={() => navigate('/portal/proposals')}
        className="text-[11px] text-text-tertiary hover:text-text-primary mb-3 flex items-center gap-1">
        <ArrowLeft size={11} />Back to Proposals
      </button>

      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <h1 className="font-display font-bold text-[24px] mb-2">{proposal.title}</h1>
        <p className="text-[16px] font-medium text-accent">{(proposal.total || 0).toLocaleString()} {proposal.currency}</p>
        <p className="text-[11px] text-text-tertiary mt-1">Sent {new Date(proposal.created_at).toLocaleString()}</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{proposal.body || 'No detailed terms provided.'}</div>
      </div>

      <ErrorBox message={error} onDismiss={() => setError('')} />

      {proposal.signed_at ? (
        <div className="bg-success/5 border border-success/20 rounded-xl p-5 text-center">
          <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
          <h3 className="font-display font-semibold text-[15px] text-success">Signed</h3>
          <p className="text-[12px] text-text-secondary mt-1">Signed by <strong>{proposal.signature_name}</strong> on {new Date(proposal.signed_at).toLocaleString()}</p>
        </div>
      ) : (
        <form onSubmit={sign} className="bg-surface border border-accent/30 rounded-xl p-5">
          <h3 className="font-display font-semibold text-[14px] mb-2">Sign this Proposal</h3>
          <p className="text-[12px] text-text-secondary mb-4">By typing your full name below and clicking Sign, you accept the terms of this proposal.</p>
          <input value={signature} onChange={e => setSignature(e.target.value)} placeholder="Type your full name"
            className="w-full bg-elevated border border-border rounded-md px-3 py-3 text-[15px] focus:border-accent focus:outline-none mb-3"
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }} />
          <button type="submit" disabled={signing || !signature.trim()}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-md text-[13px] font-semibold">
            {signing ? <Loader2 size={14} className="animate-spin" /> : <FileSignature size={14} />}Sign Proposal
          </button>
          <p className="text-[10px] text-text-tertiary text-center mt-3">
            Legally-binding e-signatures (DocuSign-grade) are coming in Phase 2.
          </p>
        </form>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  MAINTENANCE REPORTS
// ══════════════════════════════════════════════════════════════

export function Maintenance() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { portal.maintenance().then(({ reports }) => { setReports(reports); setLoading(false) }).catch(() => setLoading(false)) }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Maintenance Reports" subtitle="Monthly summaries of work performed on your website" />

      {reports.length === 0 ? <Empty icon={Sparkles} title="No reports yet" description="Monthly maintenance reports will appear here as work is completed." /> : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-display font-semibold text-[15px]">{r.period || 'Maintenance Report'}</h3>
                  <p className="text-[11px] text-text-tertiary mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">{r.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  AI ASSISTANT
// ══════════════════════════════════════════════════════════════

export function Assistant() {
  const { client } = useClient()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${firstNameOf(client)} — I'm your AI assistant. I know your brand and can help you with content ideas, explain anything technical, or summarize updates. What's on your mind?` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const send = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError('')
    try {
      const res = await portal.aiAssistant(next)
      setMessages(m => [...m, { role: 'assistant', content: res.reply || '(no reply)' }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const suggestions = [
    'Suggest 5 Instagram post ideas for this month',
    'Explain what SSL is in simple terms',
    'What should I focus on to grow my business online?',
    'Write a customer follow-up email',
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-3 max-w-[820px] mx-auto w-full">
        <Header title="AI Assistant" subtitle={`Trained on ${client.business_name}'s brand, services, and voice`} />
      </div>

      <div className="flex-1 overflow-y-auto max-w-[820px] mx-auto w-full px-6 pb-3">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-accent text-white' : 'bg-surface border border-border'}`}>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl px-4 py-3">
                <Loader2 size={14} className="animate-spin text-accent" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length === 1 && (
          <div className="mt-5">
            <p className="text-[11px] text-text-tertiary mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-[11px] bg-elevated hover:bg-raised text-text-secondary px-3 py-1.5 rounded-full">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pt-3 max-w-[820px] mx-auto w-full">
        <ErrorBox message={error} onDismiss={() => setError('')} />
        <form onSubmit={send} className="flex items-end gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={2} placeholder="Ask anything…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            className="flex-1 bg-surface border border-border rounded-md p-3 text-[13px] focus:border-accent focus:outline-none resize-none" />
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white p-3 rounded-md">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  CONTENT STUDIO (brand-aware entry point)
// ══════════════════════════════════════════════════════════════

export function Studio() {
  const { client } = useClient()
  const brandSummary = [
    client.industry && `Industry: ${client.industry}`,
    client.brand_colors?.accent && `Accent color: ${client.brand_colors.accent}`,
    client.brand_fonts?.heading && `Heading font: ${client.brand_fonts.heading}`,
    client.voice_guidelines && `Voice: ${client.voice_guidelines.slice(0, 80)}…`,
  ].filter(Boolean)

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Brand Content Studio" subtitle="Generate Instagram, Facebook, LinkedIn graphics, ads, and more — automatically on-brand" />

      <div className="bg-gradient-to-br from-accent-muted via-surface to-surface border border-accent/20 rounded-xl p-6 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Palette size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="font-display font-bold text-[18px]">Powered by your brand kit</h2>
            <p className="text-[12px] text-text-secondary">Every asset automatically inherits {client.business_name}'s colors, fonts, and voice.</p>
          </div>
        </div>

        {brandSummary.length > 0 && (
          <div className="bg-bg/40 rounded-md p-3 mb-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Your brand kit</p>
            <ul className="space-y-1">
              {brandSummary.map((b, i) => <li key={i} className="text-[11px] text-text-secondary">{b}</li>)}
            </ul>
          </div>
        )}

        <a href="/admin/content" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-3 rounded-md text-[13px] font-semibold">
          Open Content Studio<ExtLink size={13} />
        </a>
        <p className="text-[10px] text-text-tertiary mt-3">
          The Studio opens in a new tab with all Cloz Digital design tools. Your brand kit is applied automatically.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Instagram Post',  desc: 'Square or portrait, brand-styled' },
          { label: 'Instagram Story', desc: 'Vertical 1080×1920 with safe areas' },
          { label: 'Carousel',        desc: 'Multi-slide branded sequence' },
          { label: 'Facebook Post',   desc: 'Landscape with on-brand layout' },
          { label: 'LinkedIn Post',   desc: 'Professional 1200×627 design' },
          { label: 'Blog Graphic',    desc: 'Hero banner for articles' },
          { label: 'Ad Creative',     desc: 'Performance-tested formats' },
          { label: 'Website Banner',  desc: 'Hero section visuals' },
          { label: 'Email Graphic',   desc: 'Newsletter-ready images' },
        ].map(f => (
          <div key={f.label} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[13px] font-semibold mb-1">{f.label}</div>
            <p className="text-[11px] text-text-tertiary leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════

export function Knowledge() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { portal.knowledge().then(({ articles }) => { setArticles(articles); setLoading(false) }).catch(() => setLoading(false)) }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  const grouped = articles.reduce((acc, a) => {
    acc[a.category] = acc[a.category] || []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Header title="Knowledge Base" subtitle="Guides, tutorials, and frequently asked questions" />

      <div className="space-y-5">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-[11px] text-text-tertiary uppercase tracking-[0.15em] font-semibold mb-2">{cat}</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map(a => (
                <div key={a.id} className="bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <BookOpen size={14} className="text-accent mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-[13px] font-medium">{a.title}</h3>
                      <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">{a.summary}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-info/5 border border-info/20 rounded-lg p-4 mt-6 text-[11px] text-info leading-relaxed">
        Looking for something we haven't documented yet? <Link to="/portal/messages" className="underline">Send us a message</Link> — we'll help and add it to the knowledge base.
      </div>
    </div>
  )
}
