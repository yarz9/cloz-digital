import { useState, useEffect, useCallback } from 'react'
import {
  Inbox, Send, FileEdit, Upload, Clock, Star, Archive, Trash2, AlertTriangle, LayoutTemplate,
  Target, Users, Receipt, LifeBuoy, Megaphone, Repeat, Plus, Search, RefreshCw, Sparkles,
  Mail as MailIcon, ChevronDown, X, MoreHorizontal, ArrowLeft, Reply, ReplyAll, Forward,
  Tag, FolderOpen, Loader2, Check, Languages, Wand2, MessageSquare, Brain, Zap,
  FileText, DollarSign, Send as SendIcon
} from 'lucide-react'
import { mail } from '../../lib/api'

// ── Icon map for folders ──
const ICONS = {
  inbox: Inbox, send: Send, 'file-edit': FileEdit, upload: Upload, clock: Clock,
  star: Star, archive: Archive, trash: Trash2, 'alert-triangle': AlertTriangle,
  'layout-template': LayoutTemplate, target: Target, users: Users, receipt: Receipt,
  'life-buoy': LifeBuoy, megaphone: Megaphone, repeat: Repeat,
}

// ── Sender profiles (client-side mirror) ──
const SENDERS = [
  { key: 'anes', displayName: 'Anes D.', title: 'Founder & Web Developer', email: 'anes@cloz.digital', color: '#5E8DB5' },
  { key: 'denis', displayName: 'Denis G.', title: 'Client Success Manager', email: 'denis@cloz.digital', color: '#4ADE80' },
  { key: 'general', displayName: 'Cloz Digital Team', title: 'Website Design', email: 'general@cloz.digital', color: '#A1A1AA' },
  { key: 'billing', displayName: 'Billing Department', title: 'Accounts & Billing', email: 'billing@cloz.digital', color: '#FBBF24' },
]

export default function Mail() {
  const [folders, setFolders] = useState({ system: [], business: [] })
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [messages, setMessages] = useState([])
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [msgDetail, setMsgDetail] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [templates, setTemplates] = useState([])

  // Load folders + stats
  const loadFolders = useCallback(async () => {
    try {
      const [f, s] = await Promise.all([mail.folders(), mail.stats()])
      setFolders(f)
      setStats(s)
    } catch { /* silent */ }
  }, [])

  // Load messages for folder
  const loadMessages = useCallback(async (folder, search) => {
    setLoading(true)
    try {
      const params = { folder }
      if (search) params.search = search
      const data = await mail.messages(params)
      setMessages(data.messages || [])
    } catch { setMessages([]) }
    setLoading(false)
  }, [])

  useEffect(() => { loadFolders() }, [loadFolders])
  useEffect(() => { loadMessages(activeFolder, searchQuery) }, [activeFolder, searchQuery, loadMessages])

  // Open message detail
  const openMessage = async (msg) => {
    setSelectedMsg(msg.id)
    try {
      const data = await mail.message(msg.id)
      setMsgDetail(data)
      loadFolders() // refresh unread counts
    } catch { /* silent */ }
  }

  // Actions
  const toggleStar = async (id, e) => {
    e.stopPropagation()
    const msg = messages.find(m => m.id === id)
    await mail.update(id, { is_starred: msg?.is_starred ? 0 : 1 })
    loadMessages(activeFolder, searchQuery)
  }

  const trashMessage = async (id) => {
    await mail.remove(id)
    setSelectedMsg(null)
    setMsgDetail(null)
    loadMessages(activeFolder, searchQuery)
    loadFolders()
  }

  const archiveMessage = async (id) => {
    await mail.update(id, { folder: 'archive' })
    setSelectedMsg(null)
    setMsgDetail(null)
    loadMessages(activeFolder, searchQuery)
    loadFolders()
  }

  return (
    <div className="flex h-full">
      {/* ── Folder Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-3 border-b border-border">
          <button onClick={() => setShowCompose(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-[13px] font-medium transition-colors">
            <Plus size={15} /> Compose
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-3 py-2 border-b border-border grid grid-cols-3 gap-1 text-center">
          <div><div className="text-[15px] font-semibold text-text-primary">{stats.unread || 0}</div><div className="text-[9px] text-text-tertiary uppercase">Unread</div></div>
          <div><div className="text-[15px] font-semibold text-text-primary">{stats.sentToday || 0}</div><div className="text-[9px] text-text-tertiary uppercase">Sent</div></div>
          <div><div className="text-[15px] font-semibold text-text-primary">{stats.drafts || 0}</div><div className="text-[9px] text-text-tertiary uppercase">Drafts</div></div>
        </div>

        {/* Folders */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <div className="px-2 pt-1 pb-1.5"><span className="text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">Mailbox</span></div>
          {folders.system?.map(f => <FolderItem key={f.key} folder={f} active={activeFolder === f.key} onClick={() => { setActiveFolder(f.key); setSelectedMsg(null); setMsgDetail(null) }} />)}

          <div className="px-2 pt-3 pb-1.5"><span className="text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">Business</span></div>
          {folders.business?.map(f => <FolderItem key={f.key} folder={f} active={activeFolder === f.key} onClick={() => { setActiveFolder(f.key); setSelectedMsg(null); setMsgDetail(null) }} />)}
        </nav>

        {/* AI button */}
        <div className="p-2 border-t border-border">
          <button onClick={() => setShowAI(!showAI)} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${showAI ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-secondary hover:text-text-primary'}`}>
            <Sparkles size={13} /> AI Assistant
          </button>
        </div>
      </aside>

      {/* ── Message List ── */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-bg">
        {/* Search + actions */}
        <div className="p-2 border-b border-border flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search mail..."
              className="w-full pl-8 pr-3 py-1.5 bg-elevated border border-border rounded-md text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
          <button onClick={() => { loadMessages(activeFolder, searchQuery); loadFolders() }} className="p-1.5 rounded-md hover:bg-elevated text-text-tertiary hover:text-text-secondary" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Folder title */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-text-primary capitalize">{activeFolder.replace('-', ' ')}</h3>
          <span className="text-[11px] text-text-tertiary">{messages.length} messages</span>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-text-tertiary"><Loader2 size={18} className="animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
              <MailIcon size={28} strokeWidth={1.2} className="mb-2 opacity-40" />
              <p className="text-[12px]">No messages</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`px-3 py-2.5 border-b border-border cursor-pointer transition-colors ${
                  selectedMsg === msg.id ? 'bg-accent-muted' : 'hover:bg-elevated'
                } ${!msg.is_read ? '' : 'opacity-70'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {!msg.is_read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                      <span className={`text-[12px] truncate ${!msg.is_read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {msg.from_name || msg.from_email || 'Unknown'}
                      </span>
                    </div>
                    <p className={`text-[12px] truncate mt-0.5 ${!msg.is_read ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                      {msg.subject || '(no subject)'}
                    </p>
                    <p className="text-[11px] text-text-tertiary truncate mt-0.5">{msg.snippet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-text-tertiary">{formatDate(msg.received_at || msg.created_at)}</span>
                    <button onClick={(e) => toggleStar(msg.id, e)} className="p-0.5">
                      <Star size={12} className={msg.is_starred ? 'text-warning fill-warning' : 'text-text-tertiary'} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Reading Pane / Compose ── */}
      <div className="flex-1 flex flex-col bg-bg overflow-hidden">
        {showCompose ? (
          <ComposePanel
            onClose={() => setShowCompose(false)}
            onSent={() => { setShowCompose(false); loadMessages(activeFolder, searchQuery); loadFolders() }}
            templates={templates}
            loadTemplates={async () => { if (templates.length === 0) { try { setTemplates(await mail.templates()) } catch {} } }}
          />
        ) : msgDetail ? (
          <ReadingPane
            data={msgDetail}
            onClose={() => { setSelectedMsg(null); setMsgDetail(null) }}
            onTrash={() => trashMessage(msgDetail.message.id)}
            onArchive={() => archiveMessage(msgDetail.message.id)}
            onReply={() => { /* open compose in reply mode */ }}
            onShowCompose={setShowCompose}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary">
            <MailIcon size={40} strokeWidth={1} className="opacity-30 mb-3" />
            <p className="text-[13px]">Select a message to read</p>
            <p className="text-[11px] mt-1">or press Compose to write a new email</p>
          </div>
        )}
      </div>

      {/* ── AI Assistant Panel ── */}
      {showAI && (
        <aside className="w-72 shrink-0 border-l border-border bg-surface flex flex-col">
          <AIPanel
            message={msgDetail?.message}
            onClose={() => setShowAI(false)}
            onInsert={(text) => {
              // Could be used to insert AI text into compose
            }}
          />
        </aside>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  FOLDER ITEM
// ═══════════════════════════════════════════

function FolderItem({ folder, active, onClick }) {
  const Icon = ICONS[folder.icon] || FolderOpen
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
        active ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
      }`}
    >
      <Icon size={14} strokeWidth={1.8} />
      <span className="flex-1 text-left">{folder.label}</span>
      {folder.unread > 0 && (
        <span className="text-[10px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{folder.unread}</span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════
//  READING PANE
// ═══════════════════════════════════════════

function ReadingPane({ data, onClose, onTrash, onArchive }) {
  const { message: msg, thread } = data
  const [showThread, setShowThread] = useState(false)
  const [replyMode, setReplyMode] = useState(null) // null | 'reply' | 'replyAll' | 'forward'
  const [replyBody, setReplyBody] = useState('')
  const [replySender, setReplySender] = useState('general')
  const [sending, setSending] = useState(false)

  const handleReply = async () => {
    if (!replyBody.trim()) return
    setSending(true)
    try {
      if (replyMode === 'forward') {
        await mail.forward({ messageId: msg.id, sender: replySender, to: replyBody.split('\n')[0], note: replyBody.split('\n').slice(1).join('\n') })
      } else {
        await mail.reply({ messageId: msg.id, sender: replySender, body: replyBody, replyAll: replyMode === 'replyAll' })
      }
      setReplyMode(null)
      setReplyBody('')
    } catch { /* silent */ }
    setSending(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <button onClick={onClose} className="p-1 rounded hover:bg-elevated text-text-tertiary"><ArrowLeft size={16} /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold text-text-primary truncate">{msg.subject || '(no subject)'}</h2>
          <p className="text-[11px] text-text-tertiary">{msg.from_name} &lt;{msg.from_email}&gt;</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setReplyMode('reply')} className="p-1.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-primary" title="Reply"><Reply size={15} /></button>
          <button onClick={() => setReplyMode('replyAll')} className="p-1.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-primary" title="Reply All"><ReplyAll size={15} /></button>
          <button onClick={() => setReplyMode('forward')} className="p-1.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-primary" title="Forward"><Forward size={15} /></button>
          <button onClick={onArchive} className="p-1.5 rounded hover:bg-elevated text-text-tertiary hover:text-text-primary" title="Archive"><Archive size={15} /></button>
          <button onClick={onTrash} className="p-1.5 rounded hover:bg-elevated text-text-tertiary hover:text-error" title="Trash"><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 py-2 border-b border-border text-[11px] text-text-tertiary flex items-center gap-4">
        <span>To: {(msg.to_emails || []).join(', ')}</span>
        {msg.cc_emails?.length > 0 && <span>CC: {msg.cc_emails.join(', ')}</span>}
        <span className="ml-auto">{formatDateTime(msg.received_at || msg.sent_at || msg.created_at)}</span>
      </div>

      {/* Thread indicator */}
      {thread?.length > 1 && (
        <button onClick={() => setShowThread(!showThread)} className="px-4 py-1.5 border-b border-border text-[11px] text-accent hover:bg-elevated flex items-center gap-1">
          <MessageSquare size={12} /> {thread.length} messages in thread {showThread ? '(collapse)' : '(expand)'}
        </button>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showThread && thread?.length > 1 ? (
          thread.map((t, i) => (
            <div key={t.id} className={`mb-4 pb-4 ${i < thread.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-medium text-text-primary">{t.from_name}</span>
                <span className="text-[10px] text-text-tertiary">{formatDateTime(t.sent_at || t.created_at)}</span>
              </div>
              <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{t.body_text}</div>
            </div>
          ))
        ) : (
          <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{msg.body_text}</div>
        )}
      </div>

      {/* Reply area */}
      {replyMode && (
        <div className="border-t border-border bg-surface p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-text-tertiary uppercase">
              {replyMode === 'reply' ? 'Reply' : replyMode === 'replyAll' ? 'Reply All' : 'Forward'}
            </span>
            <div className="flex items-center gap-2">
              <SenderSelect value={replySender} onChange={setReplySender} compact />
              <button onClick={() => setReplyMode(null)} className="p-1 rounded hover:bg-elevated text-text-tertiary"><X size={14} /></button>
            </div>
          </div>
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder={replyMode === 'forward' ? 'Enter recipient email on first line, then your note...' : 'Type your reply...'}
            className="w-full h-28 bg-elevated border border-border rounded-md px-3 py-2 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handleReply} disabled={sending} className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-medium transition-colors disabled:opacity-50">
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  COMPOSE PANEL
// ═══════════════════════════════════════════

function ComposePanel({ onClose, onSent, templates, loadTemplates }) {
  const [sender, setSender] = useState('general')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiDraft, setShowAiDraft] = useState(false)
  const [aiPurpose, setAiPurpose] = useState('')
  const [aiCategory, setAiCategory] = useState('general')

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const applyTemplate = (tpl) => {
    setSubject(tpl.subject)
    setBody(tpl.body.replace('{{signature}}', ''))
    if (tpl.default_account) setSender(tpl.default_account)
    setShowTemplates(false)
  }

  const handleSend = async () => {
    if (!to.trim()) return
    setSending(true)
    try {
      const res = await mail.compose({ sender, to: to.split(',').map(s => s.trim()), cc: cc ? cc.split(',').map(s => s.trim()) : [], subject, body, isDraft: false })
      await mail.send(res.id)
      onSent()
    } catch { /* silent */ }
    setSending(false)
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await mail.compose({ sender, to: to.split(',').map(s => s.trim()), cc: cc ? cc.split(',').map(s => s.trim()) : [], subject, body, isDraft: true })
    } catch { /* silent */ }
    setSaving(false)
  }

  const handleAiDraft = async () => {
    if (!aiPurpose.trim()) return
    setAiLoading(true)
    try {
      const res = await mail.generate({ sender, to: to || undefined, purpose: aiPurpose, category: aiCategory, tone: 'professional' })
      if (res.data) {
        setSubject(res.data.subject || subject)
        setBody(res.data.body || '')
      }
      setShowAiDraft(false)
      setAiPurpose('')
    } catch { /* silent */ }
    setAiLoading(false)
  }

  const handleAiRewrite = async (tone) => {
    if (!body.trim()) return
    setAiLoading(true)
    try {
      const res = await mail.rewrite({ body, tone, sender })
      if (res.text) setBody(res.text)
    } catch { /* silent */ }
    setAiLoading(false)
  }

  const handleAiSubjects = async () => {
    setAiLoading(true)
    try {
      const res = await mail.generateSubject({ body, purpose: subject || aiPurpose, category: aiCategory })
      if (res.data?.subjects?.length) setSubject(res.data.subjects[0])
    } catch { /* silent */ }
    setAiLoading(false)
  }

  const handleTranslate = async () => {
    if (!body.trim()) return
    setAiLoading(true)
    try {
      const res = await mail.translate({ body, targetLang: 'Bosnian' })
      if (res.text) setBody(res.text)
    } catch { /* silent */ }
    setAiLoading(false)
  }

  const senderProfile = SENDERS.find(s => s.key === sender) || SENDERS[2]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-text-primary">New Message</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-elevated hover:bg-raised text-[11px] text-text-secondary" title="Templates">
            <LayoutTemplate size={13} /> Templates
          </button>
          <button onClick={() => setShowAiDraft(!showAiDraft)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-muted hover:bg-accent/20 text-[11px] text-accent" title="AI Draft">
            <Sparkles size={13} /> AI Draft
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-elevated text-text-tertiary"><X size={16} /></button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="px-4 py-2 border-b border-border bg-elevated max-h-40 overflow-y-auto">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-1.5">Select Template</p>
          <div className="grid grid-cols-2 gap-1">
            {templates.map(tpl => (
              <button key={tpl.id} onClick={() => applyTemplate(tpl)} className="text-left px-2 py-1.5 rounded text-[11px] text-text-secondary hover:bg-raised hover:text-text-primary transition-colors">
                <span className="font-medium">{tpl.name}</span>
                <span className="text-text-tertiary ml-1">({tpl.category})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Draft panel */}
      {showAiDraft && (
        <div className="px-4 py-3 border-b border-border bg-surface">
          <p className="text-[11px] font-semibold text-accent mb-2 flex items-center gap-1"><Sparkles size={12} /> AI Email Generator</p>
          <div className="space-y-2">
            <input value={aiPurpose} onChange={e => setAiPurpose(e.target.value)} placeholder="What is this email about?" className="w-full bg-elevated border border-border rounded-md px-3 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
            <div className="flex gap-2">
              <select value={aiCategory} onChange={e => setAiCategory(e.target.value)} className="flex-1 bg-elevated border border-border rounded-md px-2 py-1.5 text-[11px] text-text-secondary focus:border-accent focus:outline-none">
                <option value="general">General</option>
                <option value="outreach">Lead Outreach</option>
                <option value="proposal">Proposal</option>
                <option value="onboarding">Onboarding</option>
                <option value="support">Support</option>
                <option value="invoice">Invoice</option>
                <option value="overdue-reminder">Payment Reminder</option>
                <option value="renewal-invoice">Renewal</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <button onClick={handleAiDraft} disabled={aiLoading || !aiPurpose} className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-medium disabled:opacity-50">
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose form */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        {/* Sender */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-text-tertiary w-12 shrink-0">From</label>
          <SenderSelect value={sender} onChange={setSender} />
        </div>

        {/* To */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-text-tertiary w-12 shrink-0">To</label>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" className="flex-1 bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
          {!showCc && <button onClick={() => setShowCc(true)} className="text-[10px] text-accent hover:underline">CC</button>}
        </div>

        {showCc && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-text-tertiary w-12 shrink-0">CC</label>
            <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com" className="flex-1 bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-text-tertiary w-12 shrink-0">Subj</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="flex-1 bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
          <button onClick={handleAiSubjects} disabled={aiLoading} className="p-1.5 rounded hover:bg-elevated text-text-tertiary hover:text-accent" title="AI Subject Suggestions">
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          </button>
        </div>
      </div>

      {/* Sender identity bar */}
      <div className="px-4 py-1.5 border-b border-border bg-elevated/50 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: senderProfile.color }} />
        <span className="text-[10px] text-text-tertiary">Sending as <span className="text-text-secondary font-medium">{senderProfile.displayName}</span> ({senderProfile.email})</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your message..."
          className="flex-1 w-full px-4 py-3 bg-bg text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* AI toolbar + send */}
      <div className="px-4 py-2.5 border-t border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => handleAiRewrite('professional')} disabled={aiLoading} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-elevated" title="Rewrite Professional">
            <Wand2 size={11} /> Professional
          </button>
          <button onClick={() => handleAiRewrite('friendly')} disabled={aiLoading} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-elevated" title="Rewrite Friendly">
            <Wand2 size={11} /> Friendly
          </button>
          <button onClick={() => handleAiRewrite('concise')} disabled={aiLoading} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-elevated" title="Rewrite Concise">
            <Wand2 size={11} /> Concise
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={handleTranslate} disabled={aiLoading} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-secondary hover:bg-elevated" title="Translate to Bosnian">
            <Languages size={11} /> Bosnian
          </button>
          {aiLoading && <Loader2 size={12} className="animate-spin text-accent ml-1" />}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-elevated hover:bg-raised text-text-secondary rounded-md text-[12px] font-medium transition-colors">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <FileEdit size={12} />} Draft
          </button>
          <button onClick={handleSend} disabled={sending || !to} className="flex items-center gap-1 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-medium transition-colors disabled:opacity-50">
            {sending ? <Loader2 size={12} className="animate-spin" /> : <SendIcon size={12} />} Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  AI ASSISTANT PANEL
// ═══════════════════════════════════════════

function AIPanel({ message, onClose }) {
  const [activeTab, setActiveTab] = useState('actions')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  // Quick AI actions
  const actions = [
    { label: 'Summarize Thread', icon: Brain, action: 'summarize' },
    { label: 'Suggest Replies', icon: MessageSquare, action: 'suggest-reply' },
    { label: 'Generate Follow-Up', icon: Repeat, action: 'followup' },
    { label: 'Detect Priority', icon: Zap, action: 'priority' },
    { label: 'Translate', icon: Languages, action: 'translate' },
  ]

  const billingActions = [
    { label: 'Invoice Email', icon: Receipt, action: 'invoice-email' },
    { label: 'Payment Reminder', icon: DollarSign, action: 'payment-reminder' },
    { label: 'Overdue Notice', icon: AlertTriangle, action: 'overdue' },
  ]

  const runAction = async (action) => {
    setLoading(true)
    setResult(null)
    try {
      let res
      switch (action) {
        case 'summarize':
          res = await mail.summarize({ body: message?.body_text || 'No message selected' })
          setResult({ type: 'summary', data: res.data })
          break
        case 'suggest-reply':
          if (!message?.id) { setResult({ type: 'error', data: 'Select a message first' }); break }
          res = await mail.suggestReply({ messageId: message.id })
          setResult({ type: 'suggestions', data: res.data })
          break
        case 'followup':
          if (!message?.id) { setResult({ type: 'error', data: 'Select a message first' }); break }
          res = await mail.generateFollowup({ messageId: message.id })
          setResult({ type: 'email', data: res.data })
          break
        case 'translate':
          res = await mail.translate({ body: message?.body_text || '' })
          setResult({ type: 'text', data: res.text })
          break
        case 'invoice-email':
          setResult({ type: 'form', formType: 'invoice' })
          break
        case 'payment-reminder':
          setResult({ type: 'form', formType: 'reminder' })
          break
        case 'overdue':
          setResult({ type: 'form', formType: 'overdue' })
          break
        default:
          break
      }
    } catch (e) {
      setResult({ type: 'error', data: e.message })
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-accent flex items-center gap-1.5"><Sparkles size={13} /> AI Assistant</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-elevated text-text-tertiary"><X size={14} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {['actions', 'billing'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setResult(null) }}
            className={`flex-1 py-2 text-[11px] font-medium capitalize transition-colors ${activeTab === tab ? 'text-accent border-b-2 border-accent' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {(activeTab === 'actions' ? actions : billingActions).map(a => (
          <button key={a.action} onClick={() => runAction(a.action)} disabled={loading}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors disabled:opacity-50 text-left"
          >
            <a.icon size={13} strokeWidth={1.8} className="shrink-0" />
            <span>{a.label}</span>
          </button>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-6 text-accent">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {/* Result display */}
        {result && !loading && (
          <div className="mt-3 p-2.5 bg-elevated rounded-lg">
            {result.type === 'error' && (
              <p className="text-[11px] text-error">{result.data}</p>
            )}
            {result.type === 'summary' && result.data && (
              <div className="space-y-2">
                <p className="text-[11px] text-text-primary leading-relaxed">{result.data.summary}</p>
                {result.data.actionItems?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-1">Action Items</p>
                    {result.data.actionItems.map((item, i) => (
                      <p key={i} className="text-[11px] text-text-secondary flex items-start gap-1"><Check size={10} className="mt-0.5 text-success shrink-0" />{item}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${result.data.sentiment === 'positive' ? 'bg-success/20 text-success' : result.data.sentiment === 'negative' ? 'bg-error/20 text-error' : result.data.sentiment === 'urgent' ? 'bg-warning/20 text-warning' : 'bg-elevated text-text-tertiary'}`}>
                    {result.data.sentiment}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${result.data.priority === 'high' ? 'bg-error/20 text-error' : result.data.priority === 'medium' ? 'bg-warning/20 text-warning' : 'bg-elevated text-text-tertiary'}`}>
                    {result.data.priority} priority
                  </span>
                </div>
              </div>
            )}
            {result.type === 'suggestions' && result.data?.suggestions && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-text-tertiary uppercase">Reply Suggestions</p>
                {result.data.suggestions.map((s, i) => (
                  <div key={i} className="p-2 bg-raised rounded border border-border">
                    <span className="text-[9px] font-medium text-accent uppercase">{s.tone}</span>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{s.body?.slice(0, 200)}...</p>
                  </div>
                ))}
              </div>
            )}
            {result.type === 'email' && result.data && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-text-tertiary uppercase">Generated Follow-Up</p>
                <p className="text-[11px] font-medium text-text-primary">{result.data.subject}</p>
                <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">{result.data.body?.slice(0, 300)}...</p>
              </div>
            )}
            {result.type === 'text' && (
              <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">{result.data}</p>
            )}
            {result.type === 'form' && (
              <BillingForm formType={result.formType} onGenerated={(data) => setResult({ type: 'email', data })} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  BILLING FORM (inside AI panel)
// ═══════════════════════════════════════════

function BillingForm({ formType, onGenerated }) {
  const [clientName, setClientName] = useState('')
  const [amount, setAmount] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [daysOverdue, setDaysOverdue] = useState('')
  const [escalation, setEscalation] = useState('friendly')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      let res
      if (formType === 'invoice') {
        res = await mail.generateInvoiceEmail({ clientName, amount, invoiceNumber, dueDate })
      } else {
        res = await mail.generatePaymentReminder({ clientName, amount, invoiceNumber, daysOverdue, escalation: formType === 'overdue' ? 'firm' : escalation })
      }
      if (res.data) onGenerated(res.data)
    } catch { /* silent */ }
    setLoading(false)
  }

  return (
    <div className="space-y-2 mt-1">
      <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" className="w-full bg-raised border border-border rounded px-2 py-1 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (EUR)" className="w-full bg-raised border border-border rounded px-2 py-1 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
      <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Invoice #" className="w-full bg-raised border border-border rounded px-2 py-1 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
      {formType === 'invoice' && <input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="Due date" type="date" className="w-full bg-raised border border-border rounded px-2 py-1 text-[11px] text-text-primary focus:border-accent focus:outline-none" />}
      {formType !== 'invoice' && (
        <>
          <input value={daysOverdue} onChange={e => setDaysOverdue(e.target.value)} placeholder="Days overdue" className="w-full bg-raised border border-border rounded px-2 py-1 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
          <select value={escalation} onChange={e => setEscalation(e.target.value)} className="w-full bg-raised border border-border rounded px-2 py-1 text-[11px] text-text-secondary focus:border-accent focus:outline-none">
            <option value="friendly">Friendly</option>
            <option value="firm">Firm</option>
            <option value="final">Final Notice</option>
          </select>
        </>
      )}
      <button onClick={generate} disabled={loading || !clientName || !amount} className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded text-[11px] font-medium disabled:opacity-50">
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} Generate
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════
//  SENDER SELECT
// ═══════════════════════════════════════════

function SenderSelect({ value, onChange, compact }) {
  const [open, setOpen] = useState(false)
  const selected = SENDERS.find(s => s.key === value) || SENDERS[2]

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5 flex-1'} bg-elevated border border-border rounded-md text-[11px] text-text-secondary hover:border-accent transition-colors`}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.color }} />
        <span className="truncate">{compact ? selected.key : selected.displayName}</span>
        <ChevronDown size={11} className="text-text-tertiary shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
            <p className="px-3 py-1 text-[9px] font-semibold text-text-tertiary uppercase">Who is sending this email?</p>
            {SENDERS.map(s => (
              <button key={s.key} onClick={() => { onChange(s.key); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-elevated transition-colors ${value === s.key ? 'bg-accent-muted' : ''}`}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-text-primary">{s.displayName}</p>
                  <p className="text-[10px] text-text-tertiary">{s.email}</p>
                </div>
                {value === s.key && <Check size={12} className="text-accent shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
