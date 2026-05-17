// Management → Service Desk
// Phase 2.1 Part 2: fully migrated to TanStack Query hooks.
// All server state goes through src/hooks/queries/serviceDesk.js +
// operations.js. Mutations are optimistic where the user feedback
// benefits (replies, notes, status/priority/assignee patches).

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Inbox, AlertCircle, Loader2, Search, RefreshCw, Send, Sparkles,
  CheckCircle2, ChevronRight, Clock, User, AlertTriangle, FileText,
  MessageSquare, Image as ImageIcon, FileCheck, Plus, ArrowLeft,
  ExternalLink, Wrench, Receipt, Mail, X, Brain, Flag, Edit3,
  Building2, Phone, Globe, Briefcase, Tag, Headphones, ListChecks,
  Activity, Target,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/components/ui/Toast'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import {
  useServiceDeskRequests, useServiceDeskMetrics, useServiceDeskRequest,
  useReplyToRequest, usePatchRequest, useAddRequestNote,
  useConvertRequest, useRequestAI,
} from '@/hooks/queries/serviceDesk'
import { useOperationsSops } from '@/hooks/queries/operations'

const TABS = [
  { key: 'inbox',       label: 'Inbox',           icon: Inbox },
  { key: 'open',        label: 'Open',            icon: MessageSquare },
  { key: 'awaiting',    label: 'Awaiting Client', icon: Clock },
  { key: 'in_progress', label: 'In Progress',     icon: Activity },
  { key: 'completed',   label: 'Completed',       icon: CheckCircle2 },
  { key: 'urgent',      label: 'Urgent',          icon: AlertTriangle },
  { key: 'mine',        label: 'Assigned to Me',  icon: User },
  { key: 'all',         label: 'All Requests',    icon: ListChecks },
  { key: 'ai',          label: 'AI Insights',     icon: Brain },
]

const PRIORITY_COLOR = {
  urgent: 'bg-error/10 text-error border-error/20',
  high:   'bg-warning/10 text-warning border-warning/20',
  medium: 'bg-accent/10 text-accent border-accent/20',
  low:    'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
}
const STATUS_COLOR = {
  open:            'bg-accent/10 text-accent',
  in_progress:     'bg-warning/10 text-warning',
  awaiting_client: 'bg-purple-500/10 text-purple-400',
  completed:       'bg-success/10 text-success',
  closed:          'bg-text-tertiary/10 text-text-tertiary',
  resolved:        'bg-success/10 text-success',
}
const TYPE_ICON = { ticket: MessageSquare, message: Mail, approval: FileCheck, asset: ImageIcon }

function fmtRelative(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

// ══════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════
export default function ServiceDesk() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()

  const [tab, setTab] = useState('inbox')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(type && id ? { type, id } : null)

  const me = user?.name || ''
  const filters = useMemo(() => {
    const f = { tab }
    if (search) f.q = search
    if (tab === 'mine' && me) f.assignee = me
    return f
  }, [tab, search, me])

  const requestsQuery = useServiceDeskRequests(filters, { enabled: tab !== 'ai' })
  const metricsQuery  = useServiceDeskMetrics()

  // Sync URL when selection changes
  useEffect(() => {
    if (selected) navigate(`/management/service-desk/${selected.type}/${selected.id}`, { replace: true })
    else navigate('/management/service-desk', { replace: true })
  }, [selected, navigate])

  if (tab === 'ai') {
    return <ServiceDeskShell
      header={<Header search={search} setSearch={setSearch} onRefresh={() => { requestsQuery.refetch(); metricsQuery.refetch() }} fetching={requestsQuery.isFetching || metricsQuery.isFetching} />}
      tabs={<TabBar tab={tab} setTab={setTab} metrics={metricsQuery.data} />}
    >
      <AIInsightsPanel onSelect={(t, id) => { setTab('all'); setSelected({ type: t, id }) }} />
    </ServiceDeskShell>
  }

  return (
    <ServiceDeskShell
      header={<Header search={search} setSearch={setSearch} onRefresh={() => { requestsQuery.refetch(); metricsQuery.refetch() }} fetching={requestsQuery.isFetching || metricsQuery.isFetching} />}
      tabs={<TabBar tab={tab} setTab={setTab} metrics={metricsQuery.data} />}
    >
      <div className="flex flex-1 min-h-0">
        <RequestList
          requests={requestsQuery.data?.requests || []}
          isLoading={requestsQuery.isLoading}
          error={requestsQuery.error}
          selected={selected}
          onSelect={setSelected}
        />
        <div className="flex-1 min-w-0 border-l border-border bg-bg overflow-y-auto">
          {selected ? (
            <RequestDetail
              key={`${selected.type}-${selected.id}`}
              type={selected.type}
              id={selected.id}
              onClose={() => setSelected(null)}
              currentUser={user}
            />
          ) : (
            <EmptyDetail metrics={metricsQuery.data} />
          )}
        </div>
      </div>
    </ServiceDeskShell>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHELL
// ══════════════════════════════════════════════════════════════
function ServiceDeskShell({ header, tabs, children }) {
  return (
    <div className="flex flex-col h-full">
      {header}
      {tabs}
      <div className="flex-1 min-h-0 flex">{children}</div>
    </div>
  )
}

function Header({ search, setSearch, onRefresh, fetching }) {
  return (
    <div className="px-6 pt-5 pb-3 border-b border-border bg-surface">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px] flex items-center gap-2">
            <Headphones size={18} className="text-accent" />
            Service Desk
          </h1>
          <p className="text-[11px] text-text-tertiary mt-0.5">Every client portal request lands here. Reply, assign, and convert without leaving the page.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search subject, body, client…"
              className="bg-elevated border border-border rounded-md pl-7 pr-3 py-1.5 text-[12px] w-64 focus:border-accent focus:outline-none focus-ring" />
          </div>
          <button onClick={onRefresh} disabled={fetching}
            className="p-1.5 text-text-tertiary hover:text-accent transition-colors focus-ring rounded">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TabBar({ tab, setTab, metrics }) {
  const counts = {
    inbox: metrics?.inbox, open: metrics?.open, awaiting: metrics?.awaiting,
    in_progress: metrics?.in_progress, completed: metrics?.completed,
    urgent: metrics?.urgent, all: metrics?.total,
  }
  return (
    <div className="px-6 border-b border-border bg-surface flex items-center gap-1 overflow-x-auto">
      {TABS.map(t => {
        const Active = tab === t.key
        return (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap focus-ring ${
              Active ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}>
            <t.icon size={13} />
            {t.label}
            {counts[t.key] !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${Active ? 'bg-accent/15' : 'bg-elevated text-text-tertiary'}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  REQUEST LIST
// ══════════════════════════════════════════════════════════════
function RequestList({ requests, isLoading, error, selected, onSelect }) {
  return (
    <div className="w-[420px] shrink-0 overflow-y-auto bg-surface">
      {error && (
        <div className="m-3 bg-error/5 border border-error/20 rounded-md p-2.5 text-[11px] text-error flex items-center gap-2">
          <AlertCircle size={12} /> {error.message}
        </div>
      )}
      {isLoading && requests.length === 0 ? (
        <RequestListSkeleton />
      ) : requests.length === 0 ? (
        <div className="py-16 text-center px-6 animate-fade-up">
          <Inbox size={28} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-[13px] text-text-secondary">No requests in this view</p>
          <p className="text-[11px] text-text-tertiary mt-1">When clients open tickets, send messages, request approvals, or upload assets, they'll appear here.</p>
        </div>
      ) : (
        <div>
          {requests.map((r, i) => {
            const TIcon = TYPE_ICON[r.type] || MessageSquare
            const isSelected = selected?.type === r.type && selected?.id === r.id
            return (
              <button key={`${r.type}-${r.id}`}
                onClick={() => onSelect({ type: r.type, id: r.id })}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors focus-ring animate-fade-up ${
                  isSelected ? 'bg-accent-muted' : 'hover:bg-elevated'
                }`}
                style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-accent text-white' : 'bg-elevated text-text-tertiary'
                  }`}>
                    <TIcon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-text-primary truncate">{r.client_name || 'Unknown'}</span>
                      <span className="text-[10px] text-text-tertiary shrink-0">{fmtRelative(r.updated_at)}</span>
                    </div>
                    <div className="text-[12px] text-text-secondary truncate mt-0.5">{r.subject}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.medium}`}>
                        {r.priority}
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_COLOR[r.status] || STATUS_COLOR.open}`}>
                        {(r.status || 'open').replace('_', ' ')}
                      </span>
                      {r.overdue && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-error/15 text-error font-bold">SLA</span>}
                      {r.escalated && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-error/15 text-error">Escalated</span>}
                      {r.assignee && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-elevated text-text-tertiary">{r.assignee}</span>}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RequestListSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border flex items-start gap-2.5">
          <Skeleton className="w-7 h-7 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-10" />
            </div>
            <Skeleton className="h-2.5 w-3/4" />
            <div className="flex gap-1.5 mt-1">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  EMPTY DETAIL
// ══════════════════════════════════════════════════════════════
function EmptyDetail({ metrics }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16 animate-fade-up">
      <div className="w-14 h-14 rounded-xl bg-accent-muted flex items-center justify-center mb-4 animate-glow-pulse">
        <Headphones size={24} className="text-accent" />
      </div>
      <h3 className="font-display font-semibold text-[16px] mb-1">Pick a request to start</h3>
      <p className="text-[12px] text-text-secondary max-w-sm mb-8">
        The Service Desk pulls in every ticket, message, approval and asset upload from your client portals so you can manage everything in one place.
      </p>
      {metrics && (
        <div className="grid grid-cols-3 gap-3 max-w-md w-full">
          <Stat label="Open" value={metrics.open} icon={MessageSquare} />
          <Stat label="Urgent" value={metrics.urgent} icon={AlertTriangle} accent="text-error" />
          <Stat label="Completed" value={metrics.completed} icon={CheckCircle2} accent="text-success" />
        </div>
      )}
    </div>
  )
}
function Stat({ label, value, icon: Icon, accent = 'text-accent' }) {
  return (
    <div className="card-premium hover-lift text-left">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1 ${accent}`}>
        <Icon size={11} />{label}
      </div>
      <div className="font-display font-bold text-[20px] text-text-primary">{value ?? '—'}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  REQUEST DETAIL
// ══════════════════════════════════════════════════════════════
function RequestDetail({ type, id, onClose, currentUser }) {
  const { data, isLoading, error } = useServiceDeskRequest(type, id)
  const [showProfile, setShowProfile] = useState(false)

  if (isLoading) return <RequestDetailSkeleton />
  if (error) return <div className="m-4 bg-error/5 border border-error/20 rounded-md p-3 text-[12px] text-error">{error.message}</div>
  if (!data || !data.request) return null

  const { request, messages = [], notes = [], tasks = [], client } = data
  const TIcon = TYPE_ICON[request.type] || MessageSquare

  return (
    <div className="h-full flex flex-col animate-fade-up">
      <div className="px-6 pt-5 pb-4 border-b border-border bg-surface">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button onClick={onClose} className="p-1 -ml-1 text-text-tertiary hover:text-text-primary lg:hidden focus-ring rounded">
              <ArrowLeft size={15} />
            </button>
            <div className="w-10 h-10 rounded-md bg-accent-muted flex items-center justify-center shrink-0">
              <TIcon size={16} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-semibold text-[16px] text-text-primary truncate">{request.subject}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-text-tertiary">
                <button onClick={() => setShowProfile(true)} className="flex items-center gap-1 hover:text-accent focus-ring rounded px-1">
                  <Building2 size={11} />{client?.business_name || '—'}
                </button>
                {client?.email && <><span>·</span><a href={`mailto:${client.email}`} className="hover:text-accent">{client.email}</a></>}
                <span>·</span>
                <span>{fmtRelative(request.created_at)}</span>
                {request.overdue && <><span>·</span><span className="text-error font-semibold">SLA breached</span></>}
              </div>
            </div>
          </div>
        </div>
        <ControlBar request={request} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <OriginalRequest request={request} />
        {request.ai_summary && <AISummaryCard text={request.ai_summary} />}
        {request.type === 'ticket' && <ConversationThread messages={messages} />}
        {request.type === 'message' && messages.length > 1 && (
          <ConversationThread messages={messages.map(m => ({ ...m, body: m.body, author_name: m.author === 'cloz' ? (m.author_name || 'Cloz') : (m.author_name || client?.business_name) }))} />
        )}
        <InternalNotes notes={notes} requestType={type} requestId={id} author={currentUser?.name || ''} />
        {tasks.length > 0 && <LinkedTasks tasks={tasks} />}
        <AIToolbox type={type} id={id} />
        <ConversionPanel type={type} id={id} request={request} client={client} />
      </div>

      <ReplyComposer
        type={type}
        id={id}
        clientEmail={client?.email}
        defaultAuthor={currentUser?.name || 'Cloz Digital'}
      />

      {showProfile && client && (
        <ClientProfileDrawer client={client} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}

function RequestDetailSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border bg-surface">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="h-7 w-24 rounded" />
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="card-premium">
          <Skeleton className="h-3 w-20 mb-3" />
          <SkeletonText lines={4} />
        </div>
        <div className="card-premium">
          <Skeleton className="h-3 w-32 mb-3" />
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  )
}

function ControlBar({ request }) {
  const toast = useToast()
  const patchMutation = usePatchRequest()
  const busy = patchMutation.isPending

  const patch = async (body) => {
    try {
      await patchMutation.mutateAsync({ type: request.type, id: request.id, patch: body })
    } catch (e) {
      toast.error('Update failed', { description: e.message })
    }
  }

  const STATUSES = ['open','in_progress','awaiting_client','completed','closed']
  const PRIORITIES = ['low','medium','high','urgent']
  const ASSIGNEES = ['', 'Anes', 'Denis']

  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <CtrlSelect label="Status" value={request.status || 'open'} options={STATUSES.map(s => ({ value: s, label: s.replace('_',' ') }))} onChange={v => patch({ status: v })} disabled={busy} />
      <CtrlSelect label="Priority" value={request.priority || 'medium'} options={PRIORITIES.map(p => ({ value: p, label: p }))} onChange={v => patch({ priority: v })} disabled={busy} />
      <CtrlSelect label="Assignee" value={request.assignee || ''} options={ASSIGNEES.map(a => ({ value: a, label: a || 'Unassigned' }))} onChange={v => patch({ assignee_name: v, assignee_email: v === 'Anes' ? 'anes@cloz.digital' : v === 'Denis' ? 'denis@cloz.digital' : '' })} disabled={busy} />
      {request.type === 'ticket' && (
        <button onClick={() => patch({ escalated: !request.escalated })} disabled={busy}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium border focus-ring transition-colors ${
            request.escalated ? 'bg-error/10 text-error border-error/20' : 'bg-elevated border-border text-text-secondary hover:text-text-primary'
          }`}>
          <Flag size={11} /> {request.escalated ? 'Escalated' : 'Escalate'}
        </button>
      )}
    </div>
  )
}
function CtrlSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="flex items-center gap-1.5 bg-elevated border border-border rounded px-2 py-1 text-[11px] focus-within:border-accent">
      <span className="text-text-tertiary uppercase tracking-wider text-[9px]">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="bg-transparent text-text-primary outline-none cursor-pointer capitalize">
        {options.map(o => <option key={o.value} value={o.value} className="bg-bg">{o.label}</option>)}
      </select>
    </label>
  )
}

function OriginalRequest({ request }) {
  return (
    <div className="card-premium">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Original Request</span>
        <span className="text-[10px] text-text-tertiary capitalize">{request.category}</span>
      </div>
      <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">{request.body || '(no body)'}</p>
      {request.attachments?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Attachments</div>
          {request.attachments.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[12px] text-accent hover:underline">
              <ExternalLink size={11} /> {a.name || a.url}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function AISummaryCard({ text }) {
  return (
    <div className="bg-accent-muted/40 border border-accent/20 rounded-lg p-4 animate-fade-up">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">AI Summary</span>
      </div>
      <p className="text-[12px] text-text-primary leading-relaxed">{text}</p>
    </div>
  )
}

function ConversationThread({ messages }) {
  if (!messages.length) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Conversation ({messages.length})</div>
      <div className="space-y-2.5">
        {messages.map(m => (
          <div key={m.id}
            className={`rounded-lg p-3.5 border transition-opacity ${
              m._optimistic ? 'opacity-60' : ''
            } ${m.author === 'cloz' ? 'bg-accent-muted/30 border-accent/20' : 'bg-surface border-border'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-semibold ${m.author === 'cloz' ? 'text-accent' : 'text-text-primary'}`}>
                {m.author_name || (m.author === 'cloz' ? 'Cloz Digital' : 'Client')}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {m._optimistic ? 'sending…' : fmtRelative(m.created_at)}
              </span>
            </div>
            <p className="text-[12px] text-text-primary whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternalNotes({ notes, requestType, requestId, author }) {
  const toast = useToast()
  const addNote = useAddRequestNote()
  const [draft, setDraft] = useState('')

  const save = async () => {
    if (!draft.trim()) return
    try {
      await addNote.mutateAsync({ type: requestType, id: requestId, body: { body: draft, author } })
      setDraft('')
    } catch (e) { toast.error('Note failed', { description: e.message }) }
  }

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-2 flex items-center gap-1.5">
        <Edit3 size={11} /> Internal Notes (private)
      </div>
      {notes.length > 0 && (
        <div className="space-y-2 mb-3">
          {notes.map(n => (
            <div key={n.id} className={`bg-bg/50 rounded p-2.5 text-[12px] text-text-primary ${n._optimistic ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-text-tertiary">{n.author || 'Team'}</span>
                <span className="text-[10px] text-text-tertiary">
                  {n._optimistic ? 'saving…' : fmtRelative(n.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
          placeholder="Add an internal note (not visible to the client)…"
          className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-[12px] focus:border-warning focus:outline-none resize-none focus-ring" />
        <button onClick={save} disabled={addNote.isPending || !draft.trim()}
          className="self-end bg-warning text-bg px-3 py-2 rounded-md text-[11px] font-semibold disabled:opacity-50 focus-ring">
          {addNote.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
        </button>
      </div>
    </div>
  )
}

function LinkedTasks({ tasks }) {
  return (
    <div className="card-premium">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2 flex items-center gap-1.5">
        <FileCheck size={11} /> Linked Tasks ({tasks.length})
      </div>
      <div className="space-y-1.5">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-[12px] text-text-primary">
            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-success' : 'bg-accent'}`} />
            <span className="flex-1 truncate">{t.title}</span>
            <span className="text-[10px] text-text-tertiary">{t.assignee || 'unassigned'}</span>
            <span className="text-[10px] text-text-tertiary capitalize">{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIToolbox({ type, id }) {
  const toast = useToast()
  const aiMutation = useRequestAI()
  const [output, setOutput] = useState(null)
  const [busy, setBusy] = useState(null)

  const run = async (action) => {
    setBusy(action); setOutput(null)
    try {
      const r = await aiMutation.mutateAsync({ type, id, action })
      setOutput({ action, text: r.result })
    } catch (e) {
      setOutput({ action, text: `Error: ${e.message}` })
      toast.error('AI failed', { description: e.message })
    } finally { setBusy(null) }
  }

  const ACTIONS = [
    { key: 'summary',       label: 'Summarize',      icon: Sparkles },
    { key: 'suggest_reply', label: 'Suggest reply',  icon: MessageSquare },
    { key: 'urgency',       label: 'Detect urgency', icon: AlertTriangle },
    { key: 'assignee',      label: 'Suggest assignee', icon: User },
    { key: 'effort',        label: 'Estimate effort', icon: Clock },
    { key: 'upsell',        label: 'Upsell ideas',   icon: Target },
    { key: 'checklist',     label: 'Make checklist', icon: ListChecks },
  ]
  return (
    <div className="card-premium">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2.5 flex items-center gap-1.5">
        <Brain size={11} className="text-accent" /> AI Helpers
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map(a => (
          <button key={a.key} onClick={() => run(a.key)} disabled={!!busy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-elevated text-text-secondary hover:bg-accent-muted hover:text-accent disabled:opacity-50 focus-ring transition-colors">
            {busy === a.key ? <Loader2 size={10} className="animate-spin" /> : <a.icon size={10} />}
            {a.label}
          </button>
        ))}
      </div>
      {output && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-up">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1.5">{output.action.replace('_',' ')}</div>
          <p className="text-[12px] text-text-primary whitespace-pre-wrap leading-relaxed">{output.text}</p>
        </div>
      )}
    </div>
  )
}

function ConversionPanel({ type, id, request, client }) {
  const toast = useToast()
  const convert = useConvertRequest()
  const { data: sopsData } = useOperationsSops()
  const sops = sopsData?.sops || []

  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('task')
  const [payload, setPayload] = useState({})

  const submit = async () => {
    try {
      const r = await convert.mutateAsync({ type, id, target, payload })
      toast.success(`Created ${r.kind}`, { description: `id ${r.id.slice(0,8)}…` })
      setOpen(false); setPayload({})
    } catch (e) { toast.error('Conversion failed', { description: e.message }) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full bg-surface border border-dashed border-border hover:border-accent rounded-lg p-3 text-[12px] text-text-tertiary hover:text-accent flex items-center justify-center gap-1.5 focus-ring transition-colors">
        <Plus size={12} /> Convert this request → Task · SOP · Invoice · Proposal
      </button>
    )
  }

  return (
    <div className="card-premium animate-fade-up !border-accent/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">Convert</div>
        <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary focus-ring rounded p-0.5"><X size={13} /></button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { v: 'task',     l: 'Task',     i: ListChecks },
          { v: 'sop',      l: 'SOP',      i: Wrench },
          { v: 'invoice',  l: 'Invoice',  i: Receipt },
          { v: 'proposal', l: 'Proposal', i: FileText },
        ].map(t => (
          <button key={t.v} onClick={() => setTarget(t.v)}
            className={`flex flex-col items-center gap-1 p-2.5 rounded border text-[11px] font-medium focus-ring transition-colors ${
              target === t.v ? 'border-accent text-accent bg-accent-muted' : 'border-border text-text-secondary hover:text-text-primary'
            }`}>
            <t.i size={14} /> {t.l}
          </button>
        ))}
      </div>

      {target === 'task' && (
        <div className="space-y-2">
          <Input label="Title" value={payload.title ?? request.subject} onChange={v => setPayload(p => ({ ...p, title: v }))} />
          <Textarea label="Description" value={payload.description ?? request.body} onChange={v => setPayload(p => ({ ...p, description: v }))} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Assignee" value={payload.assignee || ''} options={['','Anes','Denis']} onChange={v => setPayload(p => ({ ...p, assignee: v }))} />
            <Select label="Priority" value={payload.priority || 'medium'} options={['low','medium','high','urgent']} onChange={v => setPayload(p => ({ ...p, priority: v }))} />
          </div>
        </div>
      )}
      {target === 'sop' && (
        <div className="space-y-2">
          <Select label="SOP" value={payload.sop_id || ''} options={[{value:'',label:'Choose…'}, ...sops.map(s => ({ value: s.id, label: s.title }))]} onChange={v => setPayload(p => ({ ...p, sop_id: v }))} />
          <Select label="Assignee" value={payload.assignee || ''} options={['','Anes','Denis']} onChange={v => setPayload(p => ({ ...p, assignee: v }))} />
        </div>
      )}
      {target === 'invoice' && (
        <div className="space-y-2">
          <Input label="Description" value={payload.description ?? request.subject} onChange={v => setPayload(p => ({ ...p, description: v }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Amount (BAM)" type="number" value={payload.amount || ''} onChange={v => setPayload(p => ({ ...p, amount: v }))} />
            <Input label="Due Date" type="date" value={payload.due || ''} onChange={v => setPayload(p => ({ ...p, due: v }))} />
          </div>
        </div>
      )}
      {target === 'proposal' && (
        <div className="space-y-2">
          <Input label="Title" value={payload.title ?? request.subject} onChange={v => setPayload(p => ({ ...p, title: v }))} />
          <Textarea label="Body" value={payload.body ?? request.body} onChange={v => setPayload(p => ({ ...p, body: v }))} rows={4} />
          <Input label="Total (BAM)" type="number" value={payload.total || ''} onChange={v => setPayload(p => ({ ...p, total: v }))} />
        </div>
      )}

      <button onClick={submit} disabled={convert.isPending || (target === 'sop' && !payload.sop_id)}
        className="button-premium w-full justify-center focus-ring disabled:opacity-50">
        {convert.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create {target}
      </button>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-text-tertiary block mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none focus-ring" />
    </div>
  )
}
function Textarea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-text-tertiary block mb-1">{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none resize-none focus-ring" />
    </div>
  )
}
function Select({ label, value, options, onChange }) {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o || '—' } : o)
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-text-tertiary block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none capitalize focus-ring">
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ReplyComposer({ type, id, clientEmail, defaultAuthor }) {
  const toast = useToast()
  const reply = useReplyToRequest()
  const ai    = useRequestAI()
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState(defaultAuthor)
  const [sendEmail, setSendEmail] = useState(true)
  const [closeAfter, setCloseAfter] = useState(false)

  const generate = async () => {
    try {
      const r = await ai.mutateAsync({ type, id, action: 'suggest_reply' })
      setBody(r.result || '')
    } catch (e) { toast.error('AI suggest failed', { description: e.message }) }
  }

  const send = async () => {
    if (!body.trim()) return
    try {
      await reply.mutateAsync({
        type, id,
        body: {
          body, author_name: author, send_email: sendEmail,
          status: closeAfter ? 'closed' : undefined,
        },
      })
      setBody('')
      toast.success('Reply sent', { description: sendEmail ? 'Posted in portal + emailed' : 'Posted in portal' })
    } catch (e) { toast.error('Reply failed', { description: e.message }) }
  }

  return (
    <div className="border-t border-border bg-surface px-6 py-4 shrink-0">
      <textarea value={body} onChange={e => setBody(e.target.value)}
        placeholder={`Reply to client${clientEmail ? ` (${clientEmail})` : ''}…`} rows={3}
        className="w-full bg-bg border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none resize-none focus-ring" />
      <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name"
            className="bg-elevated border border-border rounded px-2 py-1 text-[11px] w-32 focus-ring" />
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="accent-accent" />
            Also email
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={closeAfter} onChange={e => setCloseAfter(e.target.checked)} className="accent-accent" />
            Close after send
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={ai.isPending}
            className="flex items-center gap-1 text-[11px] text-accent hover:bg-accent-muted px-2.5 py-1.5 rounded focus-ring">
            {ai.isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Suggest reply
          </button>
          <button onClick={send} disabled={reply.isPending || !body.trim()}
            className="button-premium !py-1.5 !px-4 focus-ring disabled:opacity-50">
            {reply.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Send reply
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  CLIENT PROFILE DRAWER
// ══════════════════════════════════════════════════════════════
function ClientProfileDrawer({ client, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end animate-fade-in" onClick={onClose}>
      <div className="w-[440px] h-full glass-elevated border-l border-border overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface/95 z-10">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-accent" />
            <h3 className="font-display font-semibold text-[15px]">{client.business_name}</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary focus-ring rounded p-0.5"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Section title="Contact">
            <Field icon={User} label="Contact" value={client.contact_name} />
            <Field icon={Mail} label="Email" value={client.email} />
            <Field icon={Phone} label="Phone" value={client.phone} />
            <Field icon={Globe} label="Website" value={client.website} />
          </Section>
          <Section title="Account">
            <Field icon={Briefcase} label="Industry / Niche" value={[client.industry, client.niche].filter(Boolean).join(' · ')} />
            <Field icon={Tag} label="Package" value={client.package} />
            <Field icon={User} label="Account Manager" value={client.account_manager} />
            <Field icon={Flag} label="Priority Level" value={client.priority_level} />
            <Field icon={Receipt} label="Monthly Retainer" value={client.monthly_retainer ? `${client.monthly_retainer} BAM` : (client.mrr ? `${client.mrr} BAM` : '')} />
          </Section>
          <Section title="Discovery & Goals">
            <Field label="Goals"           value={client.goals} multiline />
            <Field label="Requested Services" value={(client.requested_services || []).join(', ')} />
            <Field label="Business Challenges" value={client.business_challenges} multiline />
            <Field label="Discovery Notes" value={client.discovery_notes} multiline />
            <Field label="Communication Preferences" value={client.communication_preferences} multiline />
          </Section>
          <a href="/management/portal-clients" className="block text-center bg-elevated hover:bg-accent-muted text-accent text-[12px] font-semibold py-2.5 rounded focus-ring">
            Open Full Profile →
          </a>
        </div>
      </div>
    </div>
  )
}
function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function Field({ icon: Icon, label, value, multiline }) {
  if (!value) return null
  return (
    <div className={multiline ? '' : 'flex items-center gap-2 text-[12px]'}>
      {Icon && !multiline && <Icon size={11} className="text-text-tertiary shrink-0" />}
      {multiline ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-0.5">{label}</div>
          <div className="text-[12px] text-text-primary whitespace-pre-wrap">{value}</div>
        </div>
      ) : (
        <><span className="text-text-tertiary">{label}:</span> <span className="text-text-primary">{value}</span></>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  AI INSIGHTS PANEL
// ══════════════════════════════════════════════════════════════
function AIInsightsPanel({ onSelect }) {
  const { data: reqData, isLoading: lr } = useServiceDeskRequests({ tab: 'all' })
  const { data: metrics } = useServiceDeskMetrics()

  const requests = reqData?.requests || []
  const byPriority = useMemo(() => {
    const out = { urgent: 0, high: 0, medium: 0, low: 0 }
    for (const r of requests) out[r.priority] = (out[r.priority] || 0) + 1
    return out
  }, [requests])

  const oldestOpen = useMemo(() =>
    [...requests].filter(r => !['closed','resolved','completed'].includes(r.status))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(0, 5),
    [requests])

  if (lr || !metrics) return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={metrics?.total} icon={Inbox} />
        <Stat label="Avg satisfaction" value={metrics?.avg_satisfaction ? `${metrics.avg_satisfaction}★` : '—'} icon={Sparkles} accent="text-warning" />
        <Stat label="Overdue (SLA)" value={metrics?.overdue} icon={AlertTriangle} accent="text-error" />
        <Stat label="Completed" value={metrics?.completed} icon={CheckCircle2} accent="text-success" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-premium">
          <h3 className="font-display font-semibold text-[14px] mb-3">By priority</h3>
          {['urgent','high','medium','low'].map(p => (
            <div key={p} className="flex items-center gap-3 mb-2.5">
              <span className={`text-[11px] uppercase tracking-wider w-16 ${PRIORITY_COLOR[p].split(' ')[1]}`}>{p}</span>
              <div className="flex-1 bg-elevated rounded h-2">
                <div className={`h-2 rounded transition-all ${
                  p === 'urgent' ? 'bg-error' : p === 'high' ? 'bg-warning' : p === 'medium' ? 'bg-accent' : 'bg-text-tertiary'
                }`} style={{ width: `${requests.length ? Math.round((byPriority[p] / requests.length) * 100) : 0}%` }} />
              </div>
              <span className="text-[12px] text-text-primary w-10 text-right">{byPriority[p] || 0}</span>
            </div>
          ))}
        </div>

        <div className="card-premium">
          <h3 className="font-display font-semibold text-[14px] mb-3">By assignee</h3>
          {Object.keys(metrics?.by_assignee || {}).length === 0 ? (
            <p className="text-[12px] text-text-tertiary">No requests assigned yet.</p>
          ) : (
            Object.entries(metrics.by_assignee).map(([who, n]) => (
              <div key={who} className="flex items-center justify-between py-1.5 text-[12px]">
                <span className="text-text-primary">{who}</span>
                <span className="text-text-tertiary">{n}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card-premium">
        <h3 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2">
          <Clock size={13} className="text-warning" /> Oldest open requests
        </h3>
        {oldestOpen.length === 0 ? (
          <p className="text-[12px] text-text-tertiary">Nothing open — well done.</p>
        ) : (
          <div className="space-y-1.5">
            {oldestOpen.map(r => (
              <button key={`${r.type}-${r.id}`} onClick={() => onSelect(r.type, r.id)}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded hover:bg-elevated focus-ring">
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.medium}`}>{r.priority}</span>
                <span className="text-[12px] text-text-primary flex-1 truncate">{r.subject}</span>
                <span className="text-[11px] text-text-tertiary truncate max-w-[160px]">{r.client_name}</span>
                <span className="text-[10px] text-text-tertiary">{fmtRelative(r.created_at)}</span>
                <ChevronRight size={12} className="text-text-tertiary" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
