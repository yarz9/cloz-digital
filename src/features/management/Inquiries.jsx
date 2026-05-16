import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Inbox, Mail, Globe, Phone, MessageSquare, Loader2, Sparkles,
  ChevronRight, RefreshCw, AlertCircle, Trash2, X, ExternalLink,
} from 'lucide-react'
import { inquiry as api } from '@/lib/api'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  INQUIRIES — Admin view of public contact-form submissions
// ══════════════════════════════════════════════════════════════

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost']

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal_sent: 'Proposal Sent', won: 'Won', lost: 'Lost',
}

const STATUS_COLORS = {
  new:           'bg-blue-500/10 text-blue-400',
  contacted:     'bg-warning/10 text-warning',
  qualified:     'bg-purple-500/10 text-purple-400',
  proposal_sent: 'bg-cyan-500/10 text-cyan-400',
  won:           'bg-success/10 text-success',
  lost:          'bg-error/10 text-error',
}

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([])
  const [byStatus, setByStatus] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const data = await api.list(params)
      setInquiries(data.inquiries || [])
      setByStatus(data.byStatus || {})
      setTotal(data.total || 0)
      // Keep selected in sync if it still exists
      if (selected) {
        const fresh = (data.inquiries || []).find(i => i.id === selected.id)
        if (fresh) setSelected(fresh)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const openInquiry = (inq) => {
    setSelected(inq)
    setNotesDraft(inq.notes || '')
  }

  const updateStatus = async (status) => {
    if (!selected) return
    try {
      await api.update(selected.id, { status })
      await load()
    } catch (e) { setError(e.message) }
  }

  const saveNotes = async () => {
    if (!selected) return
    try {
      await api.update(selected.id, { notes: notesDraft })
      await load()
    } catch (e) { setError(e.message) }
  }

  const removeInquiry = async () => {
    if (!selected) return
    if (!confirm('Delete this inquiry permanently? The CRM lead will remain.')) return
    try {
      await api.remove(selected.id)
      setSelected(null)
      await load()
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── List ── */}
      <div className={`${selected ? 'w-[440px]' : 'flex-1 max-w-[960px]'} flex flex-col border-r border-border bg-bg overflow-hidden transition-all`}>
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox size={16} className="text-accent" />
            <h1 className="font-display font-bold text-[16px]">Inquiries</h1>
            <span className="text-[10px] text-text-tertiary">{total} total</span>
          </div>
          <button onClick={load} className="p-1.5 hover:bg-elevated rounded-md text-text-tertiary">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Status filter chips */}
        <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1 shrink-0">
          {['', ...STATUSES].map(s => {
            const count = s ? (byStatus[s] || 0) : total
            return (
              <button key={s || 'all'} onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize transition-colors ${
                  filterStatus === s ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                }`}>
                {s ? STATUS_LABELS[s] : 'All'} ({count})
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mx-3 mt-2 px-3 py-2 bg-error/5 border border-error/20 rounded-md text-[11px] text-error flex items-center gap-2">
            <AlertCircle size={12} /><span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X size={12} /></button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && inquiries.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-text-tertiary" />
            </div>
          ) : inquiries.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No inquiries yet"
              description="Submissions from the public contact form land here. Each one is auto-analyzed by AI and creates a CRM lead in Client Scout."
              secondaryActionLabel="Open Contact Page"
              onSecondaryAction={() => window.open('/contact', '_blank')}
            />
          ) : (
            inquiries.map(inq => (
              <button key={inq.id} onClick={() => openInquiry(inq)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-surface/60 transition-colors ${selected?.id === inq.id ? 'bg-surface' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium truncate">{inq.business_name || inq.name}</span>
                      {inq.ai_score > 0 && (
                        <span className={`text-[11px] font-mono font-bold shrink-0 ${(inq.ai_score >= 80) ? 'text-success' : (inq.ai_score >= 60) ? 'text-warning' : 'text-text-tertiary'}`}>
                          {inq.ai_score}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5 truncate">{inq.email}</div>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize shrink-0 ${STATUS_COLORS[inq.status] || STATUS_COLORS.new}`}>
                    {STATUS_LABELS[inq.status] || inq.status}
                  </span>
                </div>
                <div className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">{inq.message}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-text-tertiary">
                  <span>{new Date(inq.created_at).toLocaleString()}</span>
                  {inq.ai_package && <><span>·</span><span className="text-accent">{inq.ai_package}</span></>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detail ── */}
      {selected && (
        <div className="flex-1 overflow-y-auto bg-bg p-6">
          <div className="max-w-[760px]">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-[20px] truncate">{selected.business_name || selected.name}</h2>
                <div className="text-[12px] text-text-secondary mt-1 flex items-center gap-3 flex-wrap">
                  <a href={`mailto:${selected.email}`} className="hover:text-accent flex items-center gap-1"><Mail size={11} />{selected.email}</a>
                  {selected.current_website && (
                    <a href={selected.current_website.startsWith('http') ? selected.current_website : `https://${selected.current_website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="hover:text-accent flex items-center gap-1">
                      <Globe size={11} />{selected.current_website}<ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-elevated rounded-md text-text-tertiary">
                <X size={16} />
              </button>
            </div>

            {/* Status pipeline */}
            <div className="flex items-center gap-1 mb-5 flex-wrap">
              <span className="text-[10px] text-text-tertiary mr-1">Status:</span>
              {STATUSES.map(s => (
                <button key={s} onClick={() => updateStatus(s)}
                  className={`text-[10px] font-medium px-2 py-1 rounded capitalize transition-colors ${
                    selected.status === s ? 'bg-accent text-white' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                  }`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            {/* AI Analysis card */}
            {selected.ai_score > 0 && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-accent" />
                  <h3 className="text-[12px] font-semibold text-accent">AI Analysis</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <Stat label="Score" value={`${selected.ai_score}/100`} color={selected.ai_score >= 80 ? 'text-success' : selected.ai_score >= 60 ? 'text-warning' : 'text-text-secondary'} />
                  <Stat label="Priority" value={selected.priority || '—'} />
                  <Stat label="Package" value={selected.ai_package || '—'} />
                  <Stat label="Est. Value" value={selected.ai_project_value ? `${selected.ai_project_value} EUR` : '—'} />
                </div>
                {selected.ai_followup && (
                  <div className="mt-2 text-[12px] text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Follow-up:</strong> {selected.ai_followup}
                  </div>
                )}
                {selected.ai_notes && (
                  <div className="mt-2 text-[12px] text-text-secondary leading-relaxed">
                    <strong className="text-text-primary">Sales notes:</strong> {selected.ai_notes}
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            <div className="bg-surface border border-border rounded-lg p-4 mb-5">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare size={11} />Message
              </div>
              <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              <Stat label="Service Requested" value={selected.service_needed || '—'} />
              <Stat label="Source" value={selected.source || '—'} />
              <Stat label="Submitted" value={new Date(selected.created_at).toLocaleString()} />
              {selected.created_lead_id && (
                <Stat label="CRM Lead" value={
                  <Link to={`/management/scout`} className="text-accent hover:text-accent-hover">View in Scout →</Link>
                } />
              )}
              <Stat label="Notification" value={selected.notification_sent ? <span className="text-success">Sent</span> : <span className="text-text-tertiary">Not sent</span>} />
              <Stat label="Auto-reply" value={selected.auto_reply_sent ? <span className="text-success">Sent</span> : <span className="text-text-tertiary">Not sent</span>} />
            </div>

            {/* Notes */}
            <div className="bg-surface border border-border rounded-lg p-4 mb-5">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Internal Notes</div>
              <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={3}
                placeholder="Add notes about this inquiry..."
                className="w-full bg-elevated border border-border rounded-md p-2 text-[12px] focus:outline-none focus:border-accent resize-none" />
              <div className="flex items-center justify-between mt-2">
                <button onClick={saveNotes}
                  className="text-[11px] text-accent hover:text-accent-hover font-medium">Save notes</button>
                <a href={`mailto:${selected.email}?subject=Re: Your inquiry to Cloz Digital`}
                  className="text-[11px] text-accent hover:text-accent-hover font-medium flex items-center gap-1">
                  <Mail size={11} />Reply by email
                </a>
              </div>
            </div>

            {/* Danger */}
            <button onClick={removeInquiry}
              className="text-[11px] text-error hover:text-error/80 font-medium flex items-center gap-1">
              <Trash2 size={11} />Delete inquiry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color = 'text-text-primary' }) {
  return (
    <div>
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-[12px] font-medium mt-0.5 ${color}`}>{value || '—'}</div>
    </div>
  )
}
