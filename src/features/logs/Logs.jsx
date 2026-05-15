import { useState, useEffect, useCallback, useRef } from 'react'
import { activityLogs } from '../../lib/logger'
import {
  Activity, AlertTriangle, AlertCircle, CheckCircle, Shield, Brain, Mail,
  Globe, Search, Filter, Download, Trash2, RefreshCw, ChevronDown, ChevronRight,
  ChevronLeft, Clock, Zap, Eye, X, BarChart3, Sparkles, ArrowUpDown,
  Server, Users, FileText, Database, Bug, Info, Terminal, Layers,
} from 'lucide-react'

// ══════════════════════════════════════════════════════════════
//  LOGS DASHBOARD — Observability & Intelligence Platform
// ══════════════════════════════════════════════════════════════

const LEVEL_CONFIG = {
  debug:    { color: 'text-text-tertiary',  bg: 'bg-text-tertiary/10', icon: Terminal,      label: 'Debug' },
  info:     { color: 'text-info',           bg: 'bg-info/10',          icon: Info,          label: 'Info' },
  success:  { color: 'text-success',        bg: 'bg-success/10',       icon: CheckCircle,   label: 'Success' },
  warning:  { color: 'text-warning',        bg: 'bg-warning/10',       icon: AlertTriangle, label: 'Warning' },
  error:    { color: 'text-error',          bg: 'bg-error/10',         icon: AlertCircle,   label: 'Error' },
  critical: { color: 'text-error',          bg: 'bg-error/15',         icon: Bug,           label: 'Critical' },
  security: { color: 'text-warning',        bg: 'bg-warning/10',       icon: Shield,        label: 'Security' },
  audit:    { color: 'text-accent',         bg: 'bg-accent/10',        icon: Eye,           label: 'Audit' },
}

const CATEGORY_ICONS = {
  system: Server, auth: Shield, ai: Brain, mail: Mail, scout: Search,
  billing: FileText, client: Users, audit_lab: Eye, database: Database,
  api: Globe, ui: Layers, job: Zap, security: Shield,
}

const SAVED_VIEWS = [
  { label: 'All Logs',       filters: {} },
  { label: 'Errors Only',    filters: { level: 'error' } },
  { label: 'Critical',       filters: { level: 'critical' } },
  { label: 'Security',       filters: { level: 'security' } },
  { label: 'AI Activity',    filters: { category: 'ai' } },
  { label: 'Email Activity', filters: { category: 'mail' } },
  { label: 'API Requests',   filters: { event_type: 'api_request' } },
  { label: 'Warnings',       filters: { level: 'warning' } },
]

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeView, setActiveView] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [sortDir, setSortDir] = useState('desc')

  // Filters
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [eventType, setEventType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50
  const searchRef = useRef(null)

  // ── Fetch logs ──
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit, offset: page * limit, sort: sortDir }
      if (search) params.search = search
      if (level) params.level = level
      if (category) params.category = category
      if (eventType) params.event_type = eventType
      if (from) params.from = from
      if (to) params.to = to
      const data = await activityLogs.list(params)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }, [search, level, category, eventType, from, to, page, sortDir])

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await activityLogs.stats()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Apply saved view ──
  const applyView = (idx) => {
    const view = SAVED_VIEWS[idx]
    setActiveView(idx)
    setLevel(view.filters.level || '')
    setCategory(view.filters.category || '')
    setEventType(view.filters.event_type || '')
    setSearch('')
    setFrom('')
    setTo('')
    setPage(0)
  }

  // ── AI Analyze ──
  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const data = await activityLogs.analyze({ hours: 24 })
      setAnalysis(data.analysis)
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Export ──
  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (level) params.set('level', level)
      if (category) params.set('category', category)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const url = `/api/activity-logs/export/json${params.toString() ? '?' + params.toString() : ''}`
      window.open(url, '_blank')
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            Activity Logs
          </h1>
          <p className="text-[12px] text-text-tertiary mt-0.5">
            Real-time observability, audit trail, and AI intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-md text-[12px] font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            <Sparkles size={13} className={analyzing ? 'animate-spin' : ''} />
            {analyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated text-text-secondary rounded-md text-[12px] font-medium hover:bg-raised transition-colors"
          >
            <Download size={13} />
            Export
          </button>
          <button
            onClick={() => { fetchLogs(); fetchStats() }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated text-text-secondary rounded-md text-[12px] font-medium hover:bg-raised transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      {stats && <StatsGrid stats={stats.stats} />}

      {/* ── AI Analysis Panel ── */}
      {analysis && <AnalysisPanel analysis={analysis} onClose={() => setAnalysis(null)} />}

      {/* ── Saved Views ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SAVED_VIEWS.map((v, i) => (
          <button
            key={v.label}
            onClick={() => applyView(i)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              activeView === i
                ? 'bg-accent text-white'
                : 'bg-elevated text-text-secondary hover:bg-raised'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            onKeyDown={e => e.key === 'Enter' && fetchLogs()}
            placeholder="Search messages, actions, details..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/40"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors ${
            showFilters ? 'bg-accent/10 text-accent border-accent/30' : 'bg-surface text-text-secondary border-border hover:bg-elevated'
          }`}
        >
          <Filter size={13} />
          Filters
          {(level || category || eventType || from || to) && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>
        <button
          onClick={() => { setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); setPage(0) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-lg text-[12px] text-text-secondary hover:bg-elevated transition-colors"
        >
          <ArrowUpDown size={13} />
          {sortDir === 'desc' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      {/* ── Advanced Filters ── */}
      {showFilters && (
        <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg flex-wrap">
          <FilterSelect label="Level" value={level} onChange={v => { setLevel(v); setPage(0) }}
            options={['', 'debug', 'info', 'success', 'warning', 'error', 'critical', 'security', 'audit']}
          />
          <FilterSelect label="Category" value={category} onChange={v => { setCategory(v); setPage(0) }}
            options={['', 'system', 'auth', 'ai', 'mail', 'scout', 'billing', 'client', 'audit_lab', 'database', 'api', 'ui', 'job', 'security']}
          />
          <FilterSelect label="Event Type" value={eventType} onChange={v => { setEventType(v); setPage(0) }}
            options={['', 'api_request', 'ai_operation', 'mail_activity', 'scout_activity', 'billing_activity', 'client_activity', 'auth_event', 'background_job', 'ui_event', 'unhandled_error']}
          />
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider">From</label>
            <input type="datetime-local" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }}
              className="bg-elevated border border-border rounded px-2 py-1 text-[11px] text-text-primary focus:outline-none focus:border-accent/40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider">To</label>
            <input type="datetime-local" value={to} onChange={e => { setTo(e.target.value); setPage(0) }}
              className="bg-elevated border border-border rounded px-2 py-1 text-[11px] text-text-primary focus:outline-none focus:border-accent/40"
            />
          </div>
          <button
            onClick={() => { setLevel(''); setCategory(''); setEventType(''); setFrom(''); setTo(''); setSearch(''); setPage(0); setActiveView(0) }}
            className="text-[11px] text-text-tertiary hover:text-error transition-colors ml-auto"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── Distribution Charts ── */}
      {stats && <DistributionBar byLevel={stats.byLevel} byCategory={stats.byCategory} />}

      {/* ── Logs Table ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[140px_70px_80px_1fr_80px_40px] gap-2 px-4 py-2.5 bg-elevated border-b border-border text-[10px] text-text-tertiary uppercase tracking-wider font-medium">
          <span>Timestamp</span>
          <span>Level</span>
          <span>Category</span>
          <span>Message</span>
          <span>Duration</span>
          <span></span>
        </div>

        {/* Rows */}
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-text-tertiary text-[13px]">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
            <Database size={28} className="mb-2 opacity-40" />
            <p className="text-[13px]">No logs found</p>
            <p className="text-[11px] mt-1">Adjust your filters or wait for activity</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map(log => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-elevated border-t border-border">
          <span className="text-[11px] text-text-tertiary">
            {total > 0 ? `${page * limit + 1}–${Math.min((page + 1) * limit, total)} of ${total.toLocaleString()} logs` : 'No results'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded text-text-tertiary hover:text-text-secondary disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-text-secondary px-2">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded text-text-tertiary hover:text-text-secondary disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  STATS GRID
// ══════════════════════════════════════════════════════════════

function StatsGrid({ stats }) {
  const cards = [
    { label: 'Total Logs',    value: stats.total,        today: stats.today,       icon: Database,      color: 'text-accent' },
    { label: 'Errors',        value: stats.errors,       today: stats.errorsToday, icon: AlertCircle,   color: 'text-error' },
    { label: 'Warnings',      value: stats.warnings,     today: null,              icon: AlertTriangle, color: 'text-warning' },
    { label: 'Security',      value: stats.security,     today: null,              icon: Shield,        color: 'text-warning' },
    { label: 'AI Operations', value: stats.aiOperations, today: stats.aiToday,     icon: Brain,         color: 'text-info' },
    { label: 'Mail Activity', value: stats.mailActivity, today: stats.mailToday,   icon: Mail,          color: 'text-success' },
    { label: 'API Requests',  value: stats.apiRequests,  today: stats.apiToday,    icon: Globe,         color: 'text-accent' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {cards.map(c => (
        <div key={c.label} className="bg-surface border border-border rounded-lg p-3 hover:border-border-strong transition-colors">
          <div className="flex items-center justify-between mb-2">
            <c.icon size={14} className={c.color} />
            {c.today !== null && c.today !== undefined && (
              <span className="text-[9px] text-text-tertiary bg-elevated rounded px-1.5 py-0.5">
                +{c.today} today
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-text-primary font-display leading-none">
            {(c.value || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-text-tertiary mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  DISTRIBUTION BAR
// ══════════════════════════════════════════════════════════════

function DistributionBar({ byLevel = [], byCategory = [] }) {
  const levelColors = {
    debug: '#52525B', info: '#60A5FA', success: '#4ADE80', warning: '#FBBF24',
    error: '#EF4444', critical: '#DC2626', security: '#F59E0B', audit: '#5E8DB5',
  }

  const totalLevel = byLevel.reduce((s, b) => s + b.count, 0) || 1
  const totalCat = byCategory.reduce((s, b) => s + b.count, 0) || 1

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* By Level */}
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-2">By Level</div>
        <div className="flex h-3 rounded-full overflow-hidden bg-elevated">
          {byLevel.map(b => (
            <div
              key={b.level}
              style={{ width: `${(b.count / totalLevel) * 100}%`, backgroundColor: levelColors[b.level] || '#52525B' }}
              title={`${b.level}: ${b.count}`}
              className="transition-all duration-300"
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {byLevel.map(b => (
            <div key={b.level} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: levelColors[b.level] || '#52525B' }} />
              {b.level} ({b.count})
            </div>
          ))}
        </div>
      </div>

      {/* By Category */}
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-2">By Category</div>
        <div className="flex h-3 rounded-full overflow-hidden bg-elevated">
          {byCategory.slice(0, 8).map((b, i) => {
            const catColors = ['#5E8DB5', '#4ADE80', '#FBBF24', '#60A5FA', '#EF4444', '#A78BFA', '#F472B6', '#34D399']
            return (
              <div
                key={b.category}
                style={{ width: `${(b.count / totalCat) * 100}%`, backgroundColor: catColors[i % catColors.length] }}
                title={`${b.category}: ${b.count}`}
                className="transition-all duration-300"
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {byCategory.slice(0, 8).map((b, i) => {
            const catColors = ['#5E8DB5', '#4ADE80', '#FBBF24', '#60A5FA', '#EF4444', '#A78BFA', '#F472B6', '#34D399']
            return (
              <div key={b.category} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColors[i % catColors.length] }} />
                {b.category} ({b.count})
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  LOG ROW
// ══════════════════════════════════════════════════════════════

function LogRow({ log, expanded, onToggle }) {
  const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
  const LevelIcon = cfg.icon
  const CatIcon = CATEGORY_ICONS[log.category] || Server
  const ts = log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—'

  return (
    <div className={`transition-colors ${expanded ? 'bg-elevated/50' : 'hover:bg-elevated/30'}`}>
      <div
        className="grid grid-cols-[140px_70px_80px_1fr_80px_40px] gap-2 px-4 py-2.5 items-center cursor-pointer"
        onClick={onToggle}
      >
        {/* Timestamp */}
        <span className="text-[11px] text-text-tertiary font-mono truncate">{ts}</span>

        {/* Level */}
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
          <LevelIcon size={11} />
          {cfg.label}
        </span>

        {/* Category */}
        <span className="inline-flex items-center gap-1 text-[10px] text-text-secondary">
          <CatIcon size={11} className="text-text-tertiary" />
          {log.category}
        </span>

        {/* Message */}
        <span className="text-[12px] text-text-primary truncate" title={log.message}>
          {log.action && <span className="text-text-tertiary mr-1">[{log.action}]</span>}
          {log.message}
        </span>

        {/* Duration */}
        <span className="text-[10px] text-text-tertiary font-mono text-right">
          {log.duration_ms > 0 ? `${log.duration_ms}ms` : '—'}
        </span>

        {/* Expand arrow */}
        <span className="text-text-tertiary flex justify-center">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <DetailField label="ID" value={log.id} mono />
            <DetailField label="Event Type" value={log.event_type} />
            <DetailField label="Entity" value={log.entity_type ? `${log.entity_type}:${log.entity_id}` : '—'} />
            <DetailField label="Status Code" value={log.status_code || '—'} />
            <DetailField label="Route" value={log.route} mono />
            <DetailField label="Method" value={log.method} />
            <DetailField label="IP Address" value={log.ip_address || '—'} mono />
            <DetailField label="Success" value={log.success ? 'Yes' : 'No'} />
            {log.model && <DetailField label="AI Model" value={log.model} />}
            {log.provider && <DetailField label="Provider" value={log.provider} />}
            {log.tokens_used > 0 && <DetailField label="Tokens" value={log.tokens_used.toLocaleString()} />}
            {log.cost_estimate > 0 && <DetailField label="Cost" value={`$${log.cost_estimate.toFixed(4)}`} />}
          </div>

          {/* Details JSON */}
          {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Details</div>
              <pre className="bg-bg rounded-lg p-3 text-[11px] text-text-secondary font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Stack Trace */}
          {log.stack_trace && (
            <div>
              <div className="text-[10px] text-error uppercase tracking-wider mb-1">Stack Trace</div>
              <pre className="bg-error/5 border border-error/10 rounded-lg p-3 text-[10px] text-error/80 font-mono overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                {log.stack_trace}
              </pre>
            </div>
          )}

          {/* User Agent */}
          {log.user_agent && (
            <div className="mt-2 text-[10px] text-text-tertiary truncate" title={log.user_agent}>
              UA: {log.user_agent}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  ANALYSIS PANEL
// ══════════════════════════════════════════════════════════════

function AnalysisPanel({ analysis, onClose }) {
  if (!analysis) return null

  return (
    <div className="bg-surface border border-accent/20 rounded-xl p-4 relative">
      <button onClick={onClose} className="absolute top-3 right-3 text-text-tertiary hover:text-text-secondary">
        <X size={14} />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-accent" />
        <h3 className="text-[14px] font-semibold text-text-primary font-display">AI Analysis</h3>
        {analysis.healthScore !== undefined && (
          <span className={`ml-auto text-lg font-bold font-display ${
            analysis.healthScore >= 80 ? 'text-success' : analysis.healthScore >= 50 ? 'text-warning' : 'text-error'
          }`}>
            {analysis.healthScore}/100
          </span>
        )}
      </div>

      {analysis.executiveBrief && (
        <p className="text-[12px] text-text-secondary mb-3 leading-relaxed">{analysis.executiveBrief}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {analysis.criticalIssues?.length > 0 && (
          <AnalysisCard title="Critical Issues" items={analysis.criticalIssues} color="text-error" icon={AlertCircle} />
        )}
        {analysis.warnings?.length > 0 && (
          <AnalysisCard title="Warnings" items={analysis.warnings} color="text-warning" icon={AlertTriangle} />
        )}
        {analysis.securityAlerts?.length > 0 && (
          <AnalysisCard title="Security Alerts" items={analysis.securityAlerts} color="text-warning" icon={Shield} />
        )}
        {analysis.recommendedActions?.length > 0 && (
          <AnalysisCard title="Recommendations" items={analysis.recommendedActions} color="text-accent" icon={CheckCircle} />
        )}
      </div>

      {analysis.trendAnalysis && (
        <div className="mt-3 p-3 bg-elevated rounded-lg">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Trend Analysis</div>
          <p className="text-[11px] text-text-secondary leading-relaxed">{analysis.trendAnalysis}</p>
        </div>
      )}
    </div>
  )
}

function AnalysisCard({ title, items, color, icon: Icon }) {
  return (
    <div className="bg-elevated rounded-lg p-3">
      <div className={`flex items-center gap-1.5 text-[11px] font-medium ${color} mb-2`}>
        <Icon size={12} />
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-text-secondary leading-relaxed flex items-start gap-1.5">
            <span className="text-text-tertiary mt-0.5">-</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

function DetailField({ label, value, mono }) {
  return (
    <div>
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] text-text-secondary truncate ${mono ? 'font-mono' : ''}`} title={String(value)}>
        {value || '—'}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-text-tertiary uppercase tracking-wider whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-elevated border border-border rounded px-2 py-1 text-[11px] text-text-primary focus:outline-none focus:border-accent/40 min-w-[100px]"
      >
        {options.map(o => (
          <option key={o} value={o}>{o || 'All'}</option>
        ))}
      </select>
    </div>
  )
}
