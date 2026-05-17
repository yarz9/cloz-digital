// Management → Knowledge Center
// Notion + Confluence + Trainual + ChatGPT Enterprise — Cloz-Digital edition.
// 9 tabs: Dashboard · KB · Academy · Playbooks · Search · Copilot · Prompts · Certifications · Analytics.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  BookOpen, GraduationCap, BookMarked, Search as SearchIcon, Bot, Sparkles,
  Award, BarChart3, LayoutDashboard, Plus, Loader2, AlertCircle, RefreshCw,
  Save, X, ArrowRight, ArrowLeft, Star, MessageSquare, FileText, Clock,
  CheckCircle2, ChevronRight, ChevronDown, Edit3, Trash2, Send, Copy,
  Filter, Tag, Eye, History, ExternalLink, Bookmark, FolderOpen, Library,
  Play, BrainCircuit, Wand2, ListChecks, AlertTriangle, TrendingUp,
} from 'lucide-react'
import Markdown from '@/components/Markdown'
import { useUser } from '@/contexts/UserContext'

async function api(path, options = {}) {
  const res = await fetch(`/api/knowledge${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

const TABS = [
  { key: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { key: 'kb',         label: 'Knowledge Base',icon: BookOpen },
  { key: 'academy',    label: 'Academy',       icon: GraduationCap },
  { key: 'playbooks',  label: 'Playbooks',     icon: BookMarked },
  { key: 'search',     label: 'Search',        icon: SearchIcon },
  { key: 'copilot',    label: 'AI Copilot',    icon: Bot },
  { key: 'prompts',    label: 'Prompt Library',icon: Sparkles },
  { key: 'certs',      label: 'Certifications',icon: Award },
  { key: 'analytics',  label: 'Analytics',     icon: BarChart3 },
]

export default function KnowledgeCenter() {
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const refreshStats = useCallback(() => {
    api('/analytics').then(setStats).catch(() => {})
  }, [])
  useEffect(() => { refreshStats() }, [refreshStats])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border bg-surface">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-[20px] flex items-center gap-2">
              <BrainCircuit size={18} className="text-accent" />
              Knowledge Center
            </h1>
            <p className="text-[11px] text-text-tertiary mt-0.5">Institutional memory + training academy + AI copilot. Single source of truth.</p>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="px-6 border-b border-border bg-surface flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                Active ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>
              <t.icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'dashboard'  && <DashboardTab stats={stats} onJump={setTab} onRefresh={refreshStats} />}
        {tab === 'kb'         && <KnowledgeBaseTab onChange={refreshStats} />}
        {tab === 'academy'    && <AcademyTab />}
        {tab === 'playbooks'  && <PlaybooksTab onChange={refreshStats} />}
        {tab === 'search'     && <SearchTab />}
        {tab === 'copilot'    && <CopilotTab />}
        {tab === 'prompts'    && <PromptsTab onChange={refreshStats} />}
        {tab === 'certs'      && <CertificationsTab />}
        {tab === 'analytics'  && <AnalyticsTab stats={stats} />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
function DashboardTab({ stats, onJump, onRefresh }) {
  const { user } = useUser()
  const [enrollments, setEnrollments] = useState([])
  const [certs, setCerts] = useState([])
  useEffect(() => {
    if (!user) return
    api(`/enrollments?user=${encodeURIComponent(user.name)}`).then(d => setEnrollments(d.enrollments || []))
    api(`/certificates?user=${encodeURIComponent(user.name)}`).then(d => setCerts(d.certificates || []))
  }, [user])

  if (!stats) return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  const c = stats.counts
  return (
    <div className="overflow-y-auto h-full px-6 py-5 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Articles" value={c.articles} sub={`${c.published} published · ${c.drafts} drafts`} icon={BookOpen} onClick={() => onJump('kb')} />
        <KpiCard label="Courses"  value={c.courses}  sub={`${c.lessons} lessons`} icon={GraduationCap} onClick={() => onJump('academy')} />
        <KpiCard label="Playbooks" value={c.playbooks} sub="repeatable plays" icon={BookMarked} onClick={() => onJump('playbooks')} />
        <KpiCard label="Prompts"  value={c.prompts}  sub="ready to use" icon={Sparkles} onClick={() => onJump('prompts')} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Most-viewed articles" icon={TrendingUp}>
          {(stats.top_viewed || []).length === 0
            ? <Empty>No articles viewed yet.</Empty>
            : stats.top_viewed.map(a => (
              <RowLine key={a.id} label={a.title} value={`${a.view_count} views`} onClick={() => onJump('kb')} />
            ))}
        </Panel>
        <Panel title="Top searches" icon={SearchIcon}>
          {(stats.top_searches || []).length === 0
            ? <Empty>No searches yet.</Empty>
            : stats.top_searches.map(s => (
              <RowLine key={s.query} label={s.query} value={`${s.n}×`} onClick={() => onJump('search')} />
            ))}
        </Panel>
      </div>

      {user && (
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title="Your enrolled courses" icon={GraduationCap}>
            {enrollments.length === 0
              ? <Empty>Browse the Academy to enroll in your first course.</Empty>
              : enrollments.map(e => (
                <div key={e.id} className="py-2 border-b border-border last:border-0">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-text-primary">{e.cover_emoji} {e.title}</span>
                    <span className="text-text-tertiary">{e.progress_pct}%</span>
                  </div>
                  <div className="mt-1 h-1 bg-elevated rounded overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${e.progress_pct}%` }} />
                  </div>
                </div>
              ))}
          </Panel>
          <Panel title="Your certificates" icon={Award}>
            {certs.length === 0
              ? <Empty>Complete a course to earn a certificate.</Empty>
              : certs.map(c => (
                <RowLine key={c.id} label={c.course_title} value={`${c.score}%`} />
              ))}
          </Panel>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Failed searches — knowledge gaps" icon={AlertTriangle}>
          {(stats.failed_searches || []).length === 0
            ? <Empty>No failed searches.</Empty>
            : stats.failed_searches.map(s => (
              <RowLine key={s.query} label={s.query} value={`${s.n}×`} />
            ))}
        </Panel>
        <Panel title="Most-used playbooks" icon={BookMarked}>
          {(stats.top_playbooks || []).length === 0
            ? <Empty>No playbook activity yet.</Empty>
            : stats.top_playbooks.map(p => (
              <RowLine key={p.id} label={p.title} value={`${p.use_count} uses`} onClick={() => onJump('playbooks')} />
            ))}
        </Panel>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} className="text-left bg-surface border border-border hover:border-accent/40 rounded-lg p-4 transition-colors">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent mb-1">
        <Icon size={11} />{label}
      </div>
      <div className="font-display font-bold text-[26px] text-text-primary leading-none">{value ?? '—'}</div>
      <div className="text-[10px] text-text-tertiary mt-1">{sub}</div>
    </button>
  )
}
function Panel({ title, icon: Icon, children }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} />} {title}
      </div>
      <div>{children}</div>
    </div>
  )
}
function RowLine({ label, value, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center justify-between gap-2 py-1.5 text-[12px] hover:bg-elevated rounded px-2 -mx-2">
      <span className="text-text-primary truncate flex-1">{label}</span>
      <span className="text-text-tertiary text-[11px]">{value}</span>
    </button>
  )
}
function Empty({ children }) {
  return <div className="text-[12px] text-text-tertiary py-2">{children}</div>
}

// ══════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════
const ARTICLE_CATEGORIES = [
  'general','sales','outreach','client-management','web-development',
  'design-systems','seo','marketing','support-operations',
  'financial-operations','legal','onboarding','meeting-notes','postmortems',
]

function KnowledgeBaseTab({ onChange }) {
  const { user } = useUser()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ category: '', status: '', q: '' })
  const [selected, setSelected] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editingArticle, setEditingArticle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (filter.category) params.set('category', filter.category)
      if (filter.status)   params.set('status', filter.status)
      if (filter.q)        params.set('q', filter.q)
      const d = await api(`/articles?${params}`)
      setArticles(d.articles || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [filter])
  useEffect(() => { load() }, [load])

  const open = async (id) => {
    try {
      const d = await api(`/articles/${id}`)
      setSelected(d)
    } catch (e) { setError(e.message) }
  }
  const refresh = () => { load(); if (selected) open(selected.article.id); onChange?.() }

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-[380px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="p-3 border-b border-border space-y-2 sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2">
            <input value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} placeholder="Search articles…"
              className="flex-1 bg-elevated border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none" />
            <button onClick={() => { setEditingArticle(null); setShowEditor(true) }}
              className="bg-accent hover:bg-accent-hover text-white px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1">
              <Plus size={11} /> New
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
              className="flex-1 bg-elevated border border-border rounded px-2 py-1 text-[11px]">
              <option value="">All categories</option>
              {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
              className="bg-elevated border border-border rounded px-2 py-1 text-[11px]">
              <option value="">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-accent" /></div>
        ) : articles.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-text-tertiary px-6">No articles match. Create the first one →</div>
        ) : (
          articles.map(a => (
            <button key={a.id} onClick={() => open(a.id)}
              className={`w-full text-left px-4 py-3 border-b border-border hover:bg-elevated transition-colors ${
                selected?.article?.id === a.id ? 'bg-accent-muted' : ''
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold text-text-primary truncate flex-1">{a.title}</span>
                {a.status === 'draft' && <span className="text-[9px] uppercase bg-warning/15 text-warning px-1.5 py-0.5 rounded">draft</span>}
              </div>
              <div className="text-[11px] text-text-tertiary truncate">{a.excerpt}</div>
              <div className="text-[10px] text-text-tertiary mt-1 flex items-center gap-2">
                <span>{a.category}</span><span>·</span><span>v{a.version}</span><span>·</span><span>{a.view_count} views</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto bg-bg">
        {error && <div className="m-4 bg-error/5 border border-error/20 rounded p-3 text-[12px] text-error">{error}</div>}
        {selected ? (
          <ArticleDetail data={selected} user={user} onClose={() => setSelected(null)}
            onEdit={() => { setEditingArticle(selected.article); setShowEditor(true) }}
            onChanged={refresh} />
        ) : (
          <div className="h-full flex items-center justify-center text-center px-8">
            <div>
              <BookOpen size={36} className="mx-auto text-text-tertiary mb-3" />
              <h3 className="font-display font-semibold text-[15px] mb-1">Pick an article</h3>
              <p className="text-[12px] text-text-tertiary max-w-sm">Or create a new one. Every article is versioned and feeds the AI Copilot.</p>
            </div>
          </div>
        )}
      </div>

      {showEditor && (
        <ArticleEditor article={editingArticle} user={user}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); refresh() }} />
      )}
    </div>
  )
}

function ArticleDetail({ data, user, onClose, onEdit, onChanged }) {
  const { article, comments, versions } = data
  const [comment, setComment] = useState('')
  const [summary, setSummary] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [favorited, setFavorited] = useState(false)

  const postComment = async () => {
    if (!comment.trim()) return
    await api(`/articles/${article.id}/comments`, { method: 'POST', body: JSON.stringify({ author: user?.name || '', body: comment }) })
    setComment(''); onChanged()
  }
  const remove = async () => {
    if (!confirm('Delete this article?')) return
    await api(`/articles/${article.id}`, { method: 'DELETE' }); onClose(); onChanged()
  }
  const fav = async () => {
    const next = !favorited
    setFavorited(next)
    await api(`/articles/${article.id}/favorite`, { method: 'POST', body: JSON.stringify({ user: user?.name || '', on: next }) })
  }
  const aiSummary = async () => {
    setAiBusy(true)
    try {
      const r = await api('/ai/summarize', { method: 'POST', body: JSON.stringify({ article_id: article.id }) })
      setSummary(r.summary)
    } catch (e) { setSummary(`Error: ${e.message}`) }
    finally { setAiBusy(false) }
  }
  const publish = async () => {
    await api(`/articles/${article.id}`, { method: 'PATCH', body: JSON.stringify({ status: article.status === 'published' ? 'draft' : 'published' }) })
    onChanged()
  }

  return (
    <div className="px-8 py-6 max-w-[820px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary mb-2">
            <span className="uppercase tracking-wider">{article.category}</span>
            <span>·</span>
            <span>v{article.version}</span>
            <span>·</span>
            <span>{article.view_count} views</span>
            {article.status === 'draft' && <><span>·</span><span className="text-warning font-semibold uppercase">Draft</span></>}
          </div>
          <h1 className="font-display font-bold text-[26px] text-text-primary leading-tight">{article.title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fav} title="Favorite"
            className={`p-1.5 rounded ${favorited ? 'text-warning' : 'text-text-tertiary hover:text-warning'}`}>
            <Star size={14} fill={favorited ? 'currentColor' : 'none'} />
          </button>
          <button onClick={aiSummary} disabled={aiBusy} title="AI summarize"
            className="p-1.5 rounded text-text-tertiary hover:text-accent">
            {aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          </button>
          <button onClick={onEdit} title="Edit"
            className="p-1.5 rounded text-text-tertiary hover:text-accent"><Edit3 size={14} /></button>
          <button onClick={publish}
            className={`text-[11px] px-2.5 py-1 rounded font-semibold ${
              article.status === 'published' ? 'bg-elevated text-text-secondary' : 'bg-accent text-white'
            }`}>
            {article.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={remove} title="Delete"
            className="p-1.5 rounded text-text-tertiary hover:text-error"><Trash2 size={13} /></button>
        </div>
      </div>

      {article.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {article.tags.map(t => <span key={t} className="text-[10px] bg-elevated text-text-tertiary px-2 py-0.5 rounded-full">#{t}</span>)}
        </div>
      )}

      {summary && (
        <div className="mb-5 bg-accent-muted/40 border border-accent/20 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1.5 flex items-center gap-1.5">
            <Sparkles size={11} /> AI Summary
          </div>
          <div className="text-[12px] text-text-primary whitespace-pre-wrap">{summary}</div>
        </div>
      )}

      <article className="prose prose-invert max-w-none">
        <Markdown body={article.body} />
      </article>

      {/* Comments */}
      <div className="mt-10 pt-6 border-t border-border">
        <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Comments ({comments.length})</div>
        {comments.length > 0 && (
          <div className="space-y-3 mb-4">
            {comments.map(c => (
              <div key={c.id} className="bg-surface border border-border rounded-md p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-text-secondary">{c.author || 'Team'}</span>
                  <span className="text-[10px] text-text-tertiary">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[12px] text-text-primary whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
            placeholder="Add a comment…"
            className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none resize-none" />
          <button onClick={postComment} disabled={!comment.trim()}
            className="self-end bg-accent text-white px-3 py-2 rounded-md text-[11px] font-semibold disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

      {/* Versions */}
      {versions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3 flex items-center gap-1.5">
            <History size={11} /> Version history
          </div>
          <div className="space-y-1.5">
            {versions.map(v => (
              <div key={v.id} className="flex items-center gap-3 text-[11px] text-text-secondary">
                <span className="font-mono text-text-tertiary">v{v.version}</span>
                <span>{v.author || 'unknown'}</span>
                <span className="text-text-tertiary">{new Date(v.created_at).toLocaleString()}</span>
                {v.change_note && <span className="text-text-tertiary italic">— {v.change_note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ArticleEditor({ article, user, onClose, onSaved }) {
  const [form, setForm] = useState(article || {
    title: '', category: 'general', body: '', tags: [], status: 'draft',
  })
  const [tagInput, setTagInput] = useState((article?.tags || []).join(', '))
  const [changeNote, setChangeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  const save = async () => {
    if (!form.title.trim()) return setError('Title required')
    setSaving(true); setError('')
    try {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
      const body = { ...form, tags, author: user?.name || '', change_note: changeNote }
      if (article?.id) {
        await api(`/articles/${article.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api('/articles', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex" onClick={onClose}>
      <div className="ml-auto w-full max-w-[900px] h-full bg-bg border-l border-border overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-accent" />
            <h3 className="font-display font-semibold text-[14px]">{article?.id ? 'Edit article' : 'New article'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(p => !p)}
              className="text-[11px] bg-elevated text-text-secondary hover:text-accent px-2.5 py-1.5 rounded">
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={save} disabled={saving}
              className="bg-accent text-white text-[11px] font-semibold px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-50">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
            </button>
            <button onClick={onClose}><X size={15} className="text-text-tertiary hover:text-text-primary" /></button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {error && <div className="bg-error/5 border border-error/20 rounded p-2.5 text-[12px] text-error">{error}</div>}

          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full bg-transparent border-none text-[24px] font-display font-bold focus:outline-none" />

          <div className="grid grid-cols-3 gap-2">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="bg-surface border border-border rounded px-2.5 py-1.5 text-[12px]">
              {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="bg-surface border border-border rounded px-2.5 py-1.5 text-[12px]">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              placeholder="tags, comma, separated"
              className="bg-surface border border-border rounded px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none" />
          </div>

          {article?.id && (
            <input value={changeNote} onChange={e => setChangeNote(e.target.value)}
              placeholder="Change note (will create a new version if the body changes)"
              className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-[11px] focus:border-accent focus:outline-none" />
          )}

          {preview ? (
            <div className="bg-surface border border-border rounded-md p-5 min-h-[400px]">
              <Markdown body={form.body} />
            </div>
          ) : (
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="# Write in Markdown\n\nSupports headings, lists, **bold**, `code`, [links](https://), and ``` fenced blocks ```."
              className="w-full bg-surface border border-border rounded-md p-4 text-[13px] font-mono min-h-[480px] focus:border-accent focus:outline-none leading-relaxed" />
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  ACADEMY
// ══════════════════════════════════════════════════════════════
function AcademyTab() {
  const { user } = useUser()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ kind: 'list' })
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api(`/courses${user ? `?user=${encodeURIComponent(user.name)}` : ''}`)
      setCourses(d.courses || [])
    } finally { setLoading(false) }
  }, [user])
  useEffect(() => { load() }, [load])

  if (view.kind === 'detail') {
    return <CourseDetail courseId={view.id} user={user} onBack={() => { setView({ kind: 'list' }); load() }} />
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-semibold text-[16px]">Training courses</h2>
        <button onClick={() => setShowNew(true)}
          className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded flex items-center gap-1.5">
          <Plus size={12} /> New course
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
      ) : courses.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-10 text-center">
          <GraduationCap size={28} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-[13px] text-text-secondary">No courses yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(c => (
            <button key={c.id} onClick={() => setView({ kind: 'detail', id: c.id })}
              className="text-left bg-surface border border-border hover:border-accent/40 rounded-lg p-5 transition-colors">
              <div className="text-[32px] leading-none mb-2">{c.cover_emoji}</div>
              <h3 className="font-display font-semibold text-[15px] text-text-primary mb-1">{c.title}</h3>
              <p className="text-[12px] text-text-tertiary mb-3 line-clamp-2">{c.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
                <span>{c.category}</span><span>·</span>
                <span>{c.lesson_count} lessons</span><span>·</span>
                <span>{c.est_minutes} min</span>
              </div>
              {c.enrollment && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-1">
                    <span>{c.enrollment.status === 'completed' ? 'Completed' : 'In progress'}</span>
                    <span>{c.enrollment.progress_pct}%</span>
                  </div>
                  <div className="h-1 bg-elevated rounded overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${c.enrollment.progress_pct}%` }} />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showNew && <CourseQuickForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
    </div>
  )
}

function CourseQuickForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', category: 'web-development', description: '', level: 'beginner', est_minutes: 30, cover_emoji: '📘' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try { await api('/courses', { method: 'POST', body: JSON.stringify(form) }); onSaved() }
    finally { setSaving(false) }
  }
  return (
    <Modal title="New course" onClose={onClose}>
      <div className="space-y-3">
        <FormRow label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="form-input" /></FormRow>
        <div className="grid grid-cols-3 gap-2">
          <FormRow label="Emoji"><input value={form.cover_emoji} onChange={e => setForm({ ...form, cover_emoji: e.target.value })} className="form-input" /></FormRow>
          <FormRow label="Category">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="form-input">
              {['web-development','ui-ux-design','seo','google-ads','meta-ads','sales','outreach','client-management','financial-operations','legal','support-operations','onboarding'].map(c => <option key={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Level">
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="form-input">
              {['beginner','intermediate','advanced'].map(l => <option key={l}>{l}</option>)}
            </select>
          </FormRow>
        </div>
        <FormRow label="Description"><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="form-input resize-none" /></FormRow>
        <FormRow label="Est. minutes"><input type="number" value={form.est_minutes} onChange={e => setForm({ ...form, est_minutes: e.target.value })} className="form-input" /></FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-[12px] text-text-tertiary px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={saving || !form.title}
            className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CourseDetail({ courseId, user, onBack }) {
  const [data, setData] = useState(null)
  const [lessonIdx, setLessonIdx] = useState(0)
  const [showAddLesson, setShowAddLesson] = useState(false)

  const load = useCallback(() => api(`/courses/${courseId}`).then(setData), [courseId])
  useEffect(() => { load() }, [load])

  const enroll = async () => {
    await api(`/courses/${courseId}/enroll`, { method: 'POST', body: JSON.stringify({ user: user?.name }) })
    load()
  }

  if (!data) return <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  const { course, lessons } = data
  const lesson = lessons[lessonIdx]

  return (
    <div className="flex h-full">
      <div className="w-[300px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <button onClick={onBack} className="text-[11px] text-text-tertiary hover:text-accent flex items-center gap-1 mb-3">
            <ArrowLeft size={11} /> Back to courses
          </button>
          <div className="text-[28px] mb-1">{course.cover_emoji}</div>
          <h2 className="font-display font-bold text-[15px] mb-1">{course.title}</h2>
          <p className="text-[11px] text-text-tertiary">{course.description}</p>
          {user && (
            <button onClick={enroll}
              className="mt-3 w-full bg-accent text-white text-[11px] font-semibold py-1.5 rounded">
              Enroll
            </button>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Lessons</span>
            <button onClick={() => setShowAddLesson(true)} className="text-text-tertiary hover:text-accent"><Plus size={12} /></button>
          </div>
          {lessons.map((l, i) => (
            <button key={l.id} onClick={() => setLessonIdx(i)}
              className={`w-full text-left p-2 rounded mb-1 text-[12px] ${
                i === lessonIdx ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-elevated'
              }`}>
              <span className="inline-block w-5 text-[10px] text-text-tertiary mr-1">{i + 1}.</span>
              {l.title}
              {l.quizzes?.length > 0 && <span className="ml-1 text-[9px] text-text-tertiary">· quiz</span>}
            </button>
          ))}
          {lessons.length === 0 && <div className="text-[12px] text-text-tertiary px-2">No lessons yet.</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-bg">
        {lesson ? (
          <LessonPlayer lesson={lesson} user={user} onCompleted={load} />
        ) : (
          <div className="h-full flex items-center justify-center text-[13px] text-text-tertiary">Add a lesson to get started.</div>
        )}
      </div>

      {showAddLesson && (
        <LessonForm courseId={courseId} onClose={() => setShowAddLesson(false)} onSaved={() => { setShowAddLesson(false); load() }} />
      )}
    </div>
  )
}

function LessonPlayer({ lesson, user, onCompleted }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const quizzes = lesson.quizzes || []
  const total = quizzes.length

  const score = useMemo(() => {
    if (!submitted) return 0
    let s = 0
    for (const q of quizzes) if (answers[q.id] === q.answer_index) s++
    return s
  }, [submitted, answers, quizzes])

  const complete = async () => {
    if (!user) return alert('Pick a user (top of management) first.')
    setSubmitting(true)
    try {
      await api(`/lessons/${lesson.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ user: user.name, quiz_score: score, quiz_total: total }),
      })
      onCompleted?.()
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-[760px] mx-auto px-8 py-6">
      <h1 className="font-display font-bold text-[26px] mb-3">{lesson.title}</h1>
      <div className="flex items-center gap-3 text-[11px] text-text-tertiary mb-5">
        <Clock size={11} /> {lesson.est_minutes} min
        {lesson.video_url && <><span>·</span><a href={lesson.video_url} target="_blank" rel="noreferrer" className="text-accent">Video</a></>}
        {lesson.attachment_url && <><span>·</span><a href={lesson.attachment_url} target="_blank" rel="noreferrer" className="text-accent">Attachment</a></>}
      </div>

      <article className="prose prose-invert max-w-none">
        <Markdown body={lesson.body} />
      </article>

      {quizzes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3 flex items-center gap-1.5">
            <ListChecks size={11} /> Quiz ({quizzes.length})
          </div>
          {quizzes.map((q, i) => (
            <div key={q.id} className="bg-surface border border-border rounded-lg p-4 mb-3">
              <div className="text-[13px] text-text-primary mb-2"><strong>{i + 1}.</strong> {q.question}</div>
              <div className="space-y-1.5">
                {q.options.map((opt, idx) => {
                  const isCorrect = submitted && idx === q.answer_index
                  const isWrong = submitted && answers[q.id] === idx && idx !== q.answer_index
                  return (
                    <label key={idx} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
                      isCorrect ? 'border-success bg-success/5'
                      : isWrong ? 'border-error bg-error/5'
                      : answers[q.id] === idx ? 'border-accent bg-accent-muted'
                      : 'border-border hover:bg-elevated'
                    }`}>
                      <input type="radio" name={q.id} disabled={submitted}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers(a => ({ ...a, [q.id]: idx }))} />
                      <span className="text-[12px]">{opt}</span>
                    </label>
                  )
                })}
              </div>
              {submitted && q.explanation && (
                <p className="mt-2 text-[11px] text-text-tertiary italic">{q.explanation}</p>
              )}
            </div>
          ))}
          {!submitted ? (
            <button onClick={() => setSubmitted(true)}
              className="bg-accent text-white text-[12px] font-semibold px-4 py-2 rounded">Submit answers</button>
          ) : (
            <div className="flex items-center justify-between mt-3">
              <div className="text-[13px] text-text-primary">Score: <strong className="text-accent">{score} / {total}</strong></div>
              <button onClick={complete} disabled={submitting}
                className="bg-accent text-white text-[12px] font-semibold px-4 py-2 rounded flex items-center gap-1.5 disabled:opacity-50">
                {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                Mark lesson complete
              </button>
            </div>
          )}
        </div>
      )}

      {quizzes.length === 0 && (
        <div className="mt-8 pt-6 border-t border-border flex justify-end">
          <button onClick={complete} disabled={submitting}
            className="bg-accent text-white text-[12px] font-semibold px-4 py-2 rounded flex items-center gap-1.5 disabled:opacity-50">
            {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Mark lesson complete
          </button>
        </div>
      )}
    </div>
  )
}

function LessonForm({ courseId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', body: '', est_minutes: 5, video_url: '', attachment_url: '' })
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [lessonId, setLessonId] = useState(null)
  const [genQuizzes, setGenQuizzes] = useState([])

  const save = async () => {
    setSaving(true)
    try {
      const r = await api(`/courses/${courseId}/lessons`, { method: 'POST', body: JSON.stringify(form) })
      setLessonId(r.id)
    } finally { setSaving(false) }
  }
  const genQuiz = async () => {
    if (!lessonId) return alert('Save the lesson first.')
    setAiBusy(true)
    try {
      const r = await api('/ai/quiz', { method: 'POST', body: JSON.stringify({ lesson_id: lessonId, count: 3 }) })
      setGenQuizzes(r.quizzes || [])
    } finally { setAiBusy(false) }
  }
  const saveQuizzes = async () => {
    for (const q of genQuizzes) {
      await api(`/lessons/${lessonId}/quizzes`, { method: 'POST', body: JSON.stringify(q) })
    }
    onSaved()
  }
  return (
    <Modal title="Add lesson" onClose={onClose}>
      <div className="space-y-3">
        <FormRow label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="form-input" /></FormRow>
        <FormRow label="Body (Markdown)"><textarea rows={8} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="form-input resize-none font-mono" /></FormRow>
        <div className="grid grid-cols-3 gap-2">
          <FormRow label="Minutes"><input type="number" value={form.est_minutes} onChange={e => setForm({ ...form, est_minutes: e.target.value })} className="form-input" /></FormRow>
          <FormRow label="Video URL"><input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} className="form-input" /></FormRow>
          <FormRow label="Attachment URL"><input value={form.attachment_url} onChange={e => setForm({ ...form, attachment_url: e.target.value })} className="form-input" /></FormRow>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {!lessonId && (
            <>
              <button onClick={onClose} className="text-[12px] text-text-tertiary px-3 py-1.5">Cancel</button>
              <button onClick={save} disabled={saving || !form.title}
                className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save lesson'}
              </button>
            </>
          )}
          {lessonId && genQuizzes.length === 0 && (
            <>
              <button onClick={() => { onSaved() }} className="text-[12px] text-text-tertiary px-3 py-1.5">Done</button>
              <button onClick={genQuiz} disabled={aiBusy}
                className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-50">
                {aiBusy ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />} AI: generate quiz
              </button>
            </>
          )}
        </div>
        {genQuizzes.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">Generated quizzes</div>
            {genQuizzes.map((q, i) => (
              <div key={i} className="bg-surface border border-border rounded p-3 text-[12px]">
                <strong>{q.question}</strong>
                <ul className="mt-1 pl-4 list-disc text-text-secondary">
                  {q.options?.map((o, j) => <li key={j} className={j === q.answer_index ? 'text-success' : ''}>{o}</li>)}
                </ul>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => setGenQuizzes([])} className="text-[12px] text-text-tertiary px-3 py-1.5">Discard</button>
              <button onClick={saveQuizzes} className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded">Save quizzes</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════
//  PLAYBOOKS
// ══════════════════════════════════════════════════════════════
function PlaybooksTab({ onChange }) {
  const [playbooks, setPlaybooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api(`/playbooks?${q ? `q=${encodeURIComponent(q)}` : ''}`)
      setPlaybooks(d.playbooks || [])
    } finally { setLoading(false) }
  }, [q])
  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-full">
      <div className="w-[360px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="p-3 border-b border-border sticky top-0 bg-surface z-10 flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search playbooks…"
            className="flex-1 bg-elevated border border-border rounded px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none" />
          <button onClick={() => setShowNew(true)} className="bg-accent text-white text-[11px] font-semibold px-2.5 py-1.5 rounded flex items-center gap-1">
            <Plus size={11} /> New
          </button>
        </div>
        {loading ? <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-accent" /></div>
          : playbooks.length === 0 ? <div className="py-10 text-center text-[12px] text-text-tertiary px-6">No playbooks.</div>
          : playbooks.map(p => (
            <button key={p.id} onClick={() => api(`/playbooks/${p.id}`).then(d => setSelected(d.playbook))}
              className={`w-full text-left px-4 py-3 border-b border-border hover:bg-elevated ${selected?.id === p.id ? 'bg-accent-muted' : ''}`}>
              <div className="text-[13px] font-semibold text-text-primary truncate">{p.title}</div>
              <div className="text-[11px] text-text-tertiary truncate">{p.summary}</div>
              <div className="text-[10px] text-text-tertiary mt-1">{p.category} · {(p.steps || []).length} steps · {p.use_count} uses</div>
            </button>
          ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-bg">
        {selected ? <PlaybookView playbook={selected} onChanged={() => { load(); onChange?.() }} />
          : <div className="h-full flex items-center justify-center text-[13px] text-text-tertiary">Pick a playbook.</div>}
      </div>
      {showNew && <PlaybookForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
    </div>
  )
}
function PlaybookView({ playbook }) {
  return (
    <div className="max-w-[760px] mx-auto px-8 py-6">
      <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">{playbook.category}</div>
      <h1 className="font-display font-bold text-[26px] mb-2">{playbook.title}</h1>
      <p className="text-[13px] text-text-secondary mb-6">{playbook.summary}</p>
      {playbook.body && <article className="prose prose-invert max-w-none mb-6"><Markdown body={playbook.body} /></article>}
      <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Steps ({playbook.steps.length})</div>
      <ol className="space-y-3">
        {playbook.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 bg-surface border border-border rounded-lg p-4">
            <div className="w-7 h-7 rounded-full bg-accent-muted text-accent font-display font-bold flex items-center justify-center text-[12px] shrink-0">{i + 1}</div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-text-primary">{typeof s === 'string' ? s : s.title}</div>
              {typeof s !== 'string' && s.detail && <div className="text-[12px] text-text-secondary mt-1">{s.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
function PlaybookForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', category: 'general', summary: '', body: '', steps: [{ title: '', detail: '' }] })
  const [saving, setSaving] = useState(false)
  const updateStep = (i, k, v) => setForm(f => ({ ...f, steps: f.steps.map((s, j) => j === i ? { ...s, [k]: v } : s) }))
  const save = async () => {
    setSaving(true)
    try { await api('/playbooks', { method: 'POST', body: JSON.stringify(form) }); onSaved() }
    finally { setSaving(false) }
  }
  return (
    <Modal title="New playbook" onClose={onClose}>
      <div className="space-y-3">
        <FormRow label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="form-input" /></FormRow>
        <div className="grid grid-cols-2 gap-2">
          <FormRow label="Category">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="form-input">
              {['sales','client-management','project-delivery','seo','marketing','support-operations','collections','renewals','upselling','offboarding','general'].map(c => <option key={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Summary"><input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} className="form-input" /></FormRow>
        </div>
        <FormRow label="Body (Markdown, optional)"><textarea rows={3} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="form-input resize-none" /></FormRow>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1 flex items-center justify-between">
            <span>Steps</span>
            <button onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { title: '', detail: '' }] }))} className="text-accent">+ Add step</button>
          </div>
          {form.steps.map((s, i) => (
            <div key={i} className="bg-surface border border-border rounded p-2 mb-1.5">
              <input value={s.title} onChange={e => updateStep(i, 'title', e.target.value)} placeholder={`Step ${i+1} title`}
                className="w-full bg-transparent border-none text-[12px] font-semibold focus:outline-none mb-1" />
              <input value={s.detail} onChange={e => updateStep(i, 'detail', e.target.value)} placeholder="Detail"
                className="w-full bg-transparent border-none text-[11px] text-text-secondary focus:outline-none" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-[12px] text-text-tertiary px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={saving || !form.title}
            className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════════════════
function SearchTab() {
  const { user } = useUser()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState([])

  useEffect(() => { api('/search/failed').then(d => setFailed(d.failed || [])).catch(() => {}) }, [results])

  const run = async (queryText) => {
    const term = queryText ?? q
    if (!term.trim()) return
    setLoading(true)
    try {
      const d = await api(`/search?q=${encodeURIComponent(term)}${user ? `&user=${encodeURIComponent(user.name)}` : ''}`)
      setResults(d.results || [])
    } finally { setLoading(false) }
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-6">
      <div className="max-w-[720px] mx-auto">
        <h2 className="font-display font-bold text-[22px] mb-1">Search everything</h2>
        <p className="text-[12px] text-text-tertiary mb-4">Articles, courses, lessons, playbooks, prompts.</p>
        <div className="flex gap-2 mb-6">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="What are you looking for?"
            className="flex-1 bg-surface border border-border rounded-md px-4 py-3 text-[14px] focus:border-accent focus:outline-none" />
          <button onClick={() => run()} disabled={loading || !q.trim()}
            className="bg-accent text-white font-semibold px-5 rounded-md text-[13px] disabled:opacity-50 flex items-center gap-1.5">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <SearchIcon size={13} />} Search
          </button>
        </div>

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map(r => (
              <div key={`${r.type}-${r.id}`} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-accent mb-1">
                  <span>{r.type}</span>
                  {r.category && <><span>·</span><span>{r.category}</span></>}
                </div>
                <h3 className="font-display font-semibold text-[14px] text-text-primary">{r.title}</h3>
                {r.snippet && <p className="text-[12px] text-text-secondary mt-1 line-clamp-2">{r.snippet}</p>}
              </div>
            ))}
          </div>
        ) : (
          failed.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle size={11} /> Recent failed searches
              </div>
              <div className="space-y-1.5">
                {failed.map(f => (
                  <button key={f.query} onClick={() => { setQ(f.query); run(f.query) }}
                    className="w-full text-left flex items-center justify-between gap-2 py-1 text-[12px] hover:text-accent">
                    <span className="text-text-secondary">{f.query}</span>
                    <span className="text-text-tertiary text-[11px]">{f.n}×</span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  COPILOT (RAG)
// ══════════════════════════════════════════════════════════════
function CopilotTab() {
  const { user } = useUser()
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  const loadSessions = useCallback(() => {
    api(`/copilot/sessions${user ? `?user=${encodeURIComponent(user.name)}` : ''}`).then(d => setSessions(d.sessions || []))
  }, [user])
  useEffect(() => { loadSessions() }, [loadSessions])

  const openSession = async (id) => {
    setSessionId(id)
    const d = await api(`/copilot/sessions/${id}`)
    setMessages(d.messages || [])
  }
  const newSession = () => { setSessionId(null); setMessages([]) }

  const ask = async () => {
    if (!q.trim()) return
    const question = q.trim(); setQ(''); setBusy(true)
    setMessages(m => [...m, { role: 'user', content: question, _local: true }])
    try {
      const r = await api('/copilot/ask', { method: 'POST', body: JSON.stringify({ question, session_id: sessionId, user: user?.name }) })
      setSessionId(r.session_id)
      setMessages(m => [...m.filter(x => !x._local), { role: 'user', content: question }, { role: 'assistant', content: r.answer, sources: r.sources }])
      loadSessions()
    } catch (e) {
      setMessages(m => [...m.filter(x => !x._local), { role: 'user', content: question }, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally { setBusy(false); setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50) }
  }

  return (
    <div className="flex h-full">
      <div className="w-[260px] shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-3 border-b border-border">
          <button onClick={newSession} className="w-full bg-accent text-white text-[12px] font-semibold py-1.5 rounded flex items-center justify-center gap-1.5">
            <Plus size={12} /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? <div className="text-[11px] text-text-tertiary px-2 py-3">No conversations yet.</div>
            : sessions.map(s => (
              <button key={s.id} onClick={() => openSession(s.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-[12px] mb-0.5 ${
                  sessionId === s.id ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-elevated'
                }`}>
                <div className="truncate">{s.title || 'Untitled'}</div>
                <div className="text-[10px] text-text-tertiary">{new Date(s.updated_at).toLocaleDateString()}</div>
              </button>
            ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-bg">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Bot size={36} className="mx-auto text-accent mb-3" />
                <h3 className="font-display font-semibold text-[16px] mb-1">Ask the Copilot</h3>
                <p className="text-[12px] text-text-tertiary max-w-md mx-auto">
                  It answers from your internal documentation — articles, playbooks, lessons. Citations included.
                </p>
                <div className="mt-5 max-w-md mx-auto space-y-1.5">
                  {['How do we handle overdue invoices?','Walk me through the redesign sales script.','What\'s in our 14-day onboarding rhythm?','Generate a checklist for launching a new client site.'].map(p => (
                    <button key={p} onClick={() => setQ(p)}
                      className="w-full text-left bg-surface border border-border hover:border-accent/30 rounded px-3 py-2 text-[12px] text-text-secondary">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`max-w-[680px] ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                <div className={`rounded-lg p-4 ${m.role === 'user' ? 'bg-accent text-white' : 'bg-surface border border-border'}`}>
                  {m.role === 'assistant' ? (
                    <article className="prose prose-invert max-w-none"><Markdown body={m.content} /></article>
                  ) : (
                    <p className="text-[13px] whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.sources?.length > 0 && (
                  <div className="mt-2 text-[10px] text-text-tertiary space-y-1">
                    <div className="uppercase tracking-wider font-semibold">Sources</div>
                    {m.sources.map((s, j) => (
                      <div key={j} className="bg-elevated rounded px-2 py-1.5">
                        <strong className="text-text-secondary">{s.ref}</strong> {s.doc_type} · {s.doc_title}
                        <div className="text-text-tertiary mt-0.5 line-clamp-2">{s.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-4 bg-surface">
          <div className="flex gap-2 max-w-[760px] mx-auto">
            <textarea value={q} onChange={e => setQ(e.target.value)} rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
              placeholder="Ask anything about how Cloz Digital operates…"
              className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none resize-none" />
            <button onClick={ask} disabled={busy || !q.trim()}
              className="bg-accent text-white px-4 rounded text-[12px] font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  PROMPTS
// ══════════════════════════════════════════════════════════════
function PromptsTab({ onChange }) {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      const d = await api(`/prompts?${params}`)
      setPrompts(d.prompts || [])
    } finally { setLoading(false) }
  }, [q, category])
  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-full">
      <div className="w-[360px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="p-3 border-b border-border sticky top-0 bg-surface z-10 space-y-2">
          <div className="flex items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search prompts…"
              className="flex-1 bg-elevated border border-border rounded px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none" />
            <button onClick={() => setShowNew(true)} className="bg-accent text-white text-[11px] font-semibold px-2.5 py-1.5 rounded flex items-center gap-1">
              <Plus size={11} /> New
            </button>
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-elevated border border-border rounded px-2 py-1 text-[11px]">
            <option value="">All categories</option>
            {['outreach','sales','seo','audit','proposals','content','internal','general'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {loading ? <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-accent" /></div>
          : prompts.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full text-left px-4 py-3 border-b border-border hover:bg-elevated ${selected?.id === p.id ? 'bg-accent-muted' : ''}`}>
              <div className="text-[13px] font-semibold text-text-primary truncate">{p.title}</div>
              <div className="text-[10px] text-text-tertiary mt-1">{p.category} · {p.use_count} uses</div>
            </button>
          ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-bg">
        {selected ? <PromptView prompt={selected} onChanged={load} />
          : <div className="h-full flex items-center justify-center text-[13px] text-text-tertiary">Pick a prompt.</div>}
      </div>
      {showNew && <PromptForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} />}
    </div>
  )
}
function PromptView({ prompt, onChanged }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(prompt.body)
    setCopied(true)
    api(`/prompts/${prompt.id}/use`, { method: 'POST' }).then(onChanged)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="max-w-[760px] mx-auto px-8 py-6">
      <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">{prompt.category}</div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="font-display font-bold text-[22px]">{prompt.title}</h1>
        <button onClick={copy}
          className="bg-accent text-white text-[11px] font-semibold px-3 py-1.5 rounded flex items-center gap-1.5">
          {copied ? <><CheckCircle2 size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      {prompt.variables?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {prompt.variables.map(v => <span key={v} className="text-[10px] bg-accent-muted text-accent px-2 py-0.5 rounded-full font-mono">{`{{${v}}}`}</span>)}
        </div>
      )}
      <pre className="bg-surface border border-border rounded-md p-4 text-[12px] font-mono whitespace-pre-wrap leading-relaxed">{prompt.body}</pre>
    </div>
  )
}
function PromptForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', category: 'general', body: '', variables: '' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      const variables = form.variables.split(',').map(v => v.trim()).filter(Boolean)
      await api('/prompts', { method: 'POST', body: JSON.stringify({ ...form, variables }) })
      onSaved()
    } finally { setSaving(false) }
  }
  return (
    <Modal title="New prompt" onClose={onClose}>
      <div className="space-y-3">
        <FormRow label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="form-input" /></FormRow>
        <div className="grid grid-cols-2 gap-2">
          <FormRow label="Category">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="form-input">
              {['outreach','sales','seo','audit','proposals','content','internal','general'].map(c => <option key={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Variables (comma)"><input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder="business_name, industry" className="form-input" /></FormRow>
        </div>
        <FormRow label="Prompt body"><textarea rows={8} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="form-input resize-none font-mono" /></FormRow>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-[12px] text-text-tertiary px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={saving || !form.title || !form.body}
            className="bg-accent text-white text-[12px] font-semibold px-3 py-1.5 rounded disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════
//  CERTIFICATIONS
// ══════════════════════════════════════════════════════════════
function CertificationsTab() {
  const [certs, setCerts] = useState([])
  const [enrolls, setEnrolls] = useState([])
  const { user } = useUser()
  useEffect(() => {
    api('/certificates').then(d => setCerts(d.certificates || []))
    if (user) api(`/enrollments?user=${encodeURIComponent(user.name)}`).then(d => setEnrolls(d.enrollments || []))
  }, [user])

  return (
    <div className="overflow-y-auto h-full px-6 py-6 space-y-6">
      <div>
        <h2 className="font-display font-semibold text-[16px] mb-3">Your enrollments</h2>
        {enrolls.length === 0
          ? <div className="bg-surface border border-border rounded-lg p-6 text-center text-[13px] text-text-tertiary">Enroll in a course from the Academy tab.</div>
          : (
          <div className="grid md:grid-cols-2 gap-3">
            {enrolls.map(e => (
              <div key={e.id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[20px]">{e.cover_emoji}</span>
                  <div className="text-[13px] font-semibold text-text-primary flex-1">{e.title}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    e.status === 'completed' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'
                  }`}>{e.status.replace('_',' ')}</span>
                </div>
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{e.category}</div>
                <div className="h-1.5 bg-elevated rounded overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${e.progress_pct}%` }} />
                </div>
                <div className="text-[10px] text-text-tertiary mt-1">{e.progress_pct}% complete</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display font-semibold text-[16px] mb-3">All certificates</h2>
        {certs.length === 0
          ? <div className="bg-surface border border-border rounded-lg p-6 text-center text-[13px] text-text-tertiary">Complete a course to earn a certificate.</div>
          : (
          <div className="space-y-2">
            {certs.map(c => (
              <div key={c.id} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
                <Award size={20} className="text-warning" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-text-primary">{c.course_title}</div>
                  <div className="text-[11px] text-text-tertiary">{c.user_name} · {new Date(c.issued_at).toLocaleDateString()}</div>
                </div>
                <div className="text-[14px] font-display font-bold text-accent">{c.score}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════════════
function AnalyticsTab({ stats }) {
  const [gap, setGap] = useState('')
  const [gapBusy, setGapBusy] = useState(false)
  const runGap = async () => {
    setGapBusy(true)
    try { const r = await api('/ai/gap-analysis', { method: 'POST' }); setGap(r.summary || '') }
    finally { setGapBusy(false) }
  }
  const reindex = async () => {
    if (!confirm('Re-index all articles, playbooks, and lessons for the Copilot?')) return
    const r = await api('/reindex-all', { method: 'POST' })
    alert(`Reindexed. ${r.chunks} chunks.`)
  }

  if (!stats) return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="overflow-y-auto h-full px-6 py-5 space-y-5">
      <div className="flex items-center justify-end gap-2">
        <button onClick={reindex} className="text-[11px] bg-elevated hover:bg-accent-muted text-text-secondary hover:text-accent px-2.5 py-1.5 rounded flex items-center gap-1">
          <RefreshCw size={11} /> Reindex Copilot
        </button>
        <button onClick={runGap} disabled={gapBusy} className="text-[11px] bg-accent text-white px-2.5 py-1.5 rounded font-semibold flex items-center gap-1 disabled:opacity-50">
          {gapBusy ? <Loader2 size={11} className="animate-spin" /> : <BrainCircuit size={11} />} AI gap analysis
        </button>
      </div>

      {gap && (
        <div className="bg-accent-muted/40 border border-accent/20 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-2">Knowledge gaps — AI proposal</div>
          <div className="text-[12px] text-text-primary whitespace-pre-wrap leading-relaxed">{gap}</div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        {Object.entries(stats.counts || {}).map(([k, v]) => (
          <div key={k} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">{k}</div>
            <div className="font-display font-bold text-[22px] text-accent">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Top searches" icon={SearchIcon}>
          {(stats.top_searches || []).length === 0 ? <Empty>No searches yet.</Empty>
            : stats.top_searches.map(s => <RowLine key={s.query} label={s.query} value={`${s.n}×`} />)}
        </Panel>
        <Panel title="Failed searches" icon={AlertTriangle}>
          {(stats.failed_searches || []).length === 0 ? <Empty>No gaps.</Empty>
            : stats.failed_searches.map(s => <RowLine key={s.query} label={s.query} value={`${s.n}×`} />)}
        </Panel>
        <Panel title="Top viewed articles" icon={BookOpen}>
          {(stats.top_viewed || []).length === 0 ? <Empty>No views yet.</Empty>
            : stats.top_viewed.map(a => <RowLine key={a.id} label={a.title} value={`${a.view_count}`} />)}
        </Panel>
        <Panel title="Enrollments per user" icon={GraduationCap}>
          {(stats.enrollments || []).length === 0 ? <Empty>No enrollments yet.</Empty>
            : stats.enrollments.map(e => <RowLine key={e.user_name} label={e.user_name} value={`${e.enrolled} (${e.completed} done)`} />)}
        </Panel>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHARED
// ══════════════════════════════════════════════════════════════
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-[640px] max-h-[88vh] overflow-y-auto bg-surface border border-border rounded-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <h3 className="font-display font-semibold text-[14px]">{title}</h3>
          <button onClick={onClose}><X size={15} className="text-text-tertiary hover:text-text-primary" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
function FormRow({ label, children }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-text-tertiary block mb-1">{label}</label>
      {children}
    </div>
  )
}
