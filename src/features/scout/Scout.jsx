import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, MapPin, Globe, AlertCircle, Star, ExternalLink, Phone, Mail,
  Sparkles, Target, TrendingUp, X, Send, Loader2, RefreshCw, CheckCircle,
  Play, Square, Pause, Filter, Zap, Eye, Copy, ArrowRight, Users,
  Radar, Building2, BarChart3, AlertTriangle, Clock, MessageSquare
} from 'lucide-react'
import { scout } from '@/lib/api'

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const SCOUT_MODES = [
  { key: 'auto',             label: 'Auto',         icon: Zap,           desc: 'Rotate through all countries' },
  { key: 'no_website',       label: 'No Website',   icon: AlertCircle,   desc: 'Businesses without websites' },
  { key: 'worst_websites',   label: 'Worst Sites',  icon: AlertTriangle, desc: 'Poor quality websites' },
  { key: 'high_opportunity', label: 'High Opp.',    icon: TrendingUp,    desc: 'Strong business, weak web' },
  { key: 'low_reviews',      label: 'Low Reviews',  icon: Star,          desc: 'Weak online presence' },
]

const STATUS_COLORS = {
  new:               'bg-blue-500/10 text-blue-400',
  reviewed:          'bg-accent-muted text-accent',
  shortlisted:       'bg-purple-500/10 text-purple-400',
  contacted:         'bg-warning/10 text-warning',
  interested:        'bg-success/10 text-success',
  meeting_scheduled: 'bg-emerald-500/10 text-emerald-400',
  proposal_sent:     'bg-cyan-500/10 text-cyan-400',
  won:               'bg-success/10 text-success',
  lost:              'bg-error/10 text-error',
  archived:          'bg-elevated text-text-tertiary',
}

function scoreColor(s) {
  if (s >= 80) return 'text-success'
  if (s >= 60) return 'text-warning'
  return 'text-text-tertiary'
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function Scout() {
  const [meta, setMeta] = useState({ countries: [], categories: [], statuses: [] })
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({})
  const [selectedLead, setSelectedLead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Scan
  const [scanStatus, setScanStatus] = useState({ running: false, paused: false, progress: {} })
  const [mode, setMode] = useState('auto')
  const [country, setCountry] = useState('bosnia')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const pollRef = useRef(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterNoWebsite, setFilterNoWebsite] = useState(false)
  const [filterMinScore, setFilterMinScore] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState('score')

  // Init
  useEffect(() => {
    scout.meta().then(setMeta).catch(() => {})
    loadLeads()
    loadStats()
    return () => clearInterval(pollRef.current)
  }, [])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = { sort }
      if (filterStatus) params.status = filterStatus
      if (filterNoWebsite) params.hasWebsite = 'false'
      if (filterMinScore > 0) params.minScore = filterMinScore
      const data = await scout.leads(params)
      setLeads(data.leads || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [filterStatus, filterNoWebsite, filterMinScore, sort])

  const loadStats = async () => {
    try { setStats(await scout.stats()) } catch {}
  }

  useEffect(() => { loadLeads() }, [filterStatus, filterNoWebsite, filterMinScore, sort])

  // Scan polling
  const pollScan = useCallback(async () => {
    try {
      const s = await scout.scanStatus()
      setScanStatus(s)
      if (!s.running && !s.paused) {
        clearInterval(pollRef.current)
        pollRef.current = null
        loadLeads()
        loadStats()
      }
    } catch {}
  }, [])

  const startScan = async () => {
    setError('')
    try {
      await scout.scanStart({ mode, country, city: city || undefined, category: category || undefined })
      pollRef.current = setInterval(pollScan, 3000)
      pollScan()
    } catch (e) { setError(e.message) }
  }

  const stopScan = async (pause) => {
    try {
      await scout.scanStop(pause ? { pause: true } : {})
      pollScan()
      loadLeads()
      loadStats()
    } catch (e) { setError(e.message) }
  }

  // Manual discover
  const manualDiscover = async () => {
    if (!category) return setError('Select a business category')
    setError('')
    setLoading(true)
    try {
      const result = await scout.discover({ country, city: city || undefined, category, mode })
      loadLeads()
      loadStats()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Analyze
  const analyzeLead = async (lead) => {
    setSelectedLead({ ...lead, _analyzing: true })
    try {
      const result = await scout.analyze(lead.id)
      const updated = { ...lead, ...result.analysis, status: lead.status === 'new' ? 'reviewed' : lead.status, _analyzing: false }
      setSelectedLead(updated)
      loadLeads()
      loadStats()
    } catch (e) {
      setError(e.message)
      setSelectedLead(prev => prev ? { ...prev, _analyzing: false } : null)
    }
  }

  // Local search filter
  const filtered = leads.filter(l => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return l.business_name?.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q)
  })

  const countryData = meta.countries.find(c => c.key === country)
  const cities = countryData?.cities || []

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT PANEL */}
      <div className={`${selectedLead ? 'w-[420px]' : 'flex-1 max-w-[920px]'} flex flex-col border-r border-border bg-bg overflow-hidden`}>

        {/* Header + controls */}
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radar size={18} className="text-accent" />
              <h1 className="font-display font-bold text-[20px]">Client Scout</h1>
              {scanStatus.running && (
                <span className="text-[9px] font-bold bg-success/10 text-success px-2 py-0.5 rounded animate-pulse">SCANNING</span>
              )}
              {scanStatus.paused && (
                <span className="text-[9px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded">PAUSED</span>
              )}
            </div>
            <div className="flex gap-1.5">
              {!scanStatus.running ? (
                <>
                  <button onClick={manualDiscover} disabled={loading || !category}
                    className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border text-text-secondary disabled:opacity-40 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors">
                    <Search size={12} />Quick Scan
                  </button>
                  <button onClick={startScan}
                    className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors">
                    <Play size={12} />Start Scan
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => stopScan(true)}
                    className="flex items-center gap-1.5 bg-warning/10 text-warning px-2.5 py-1.5 rounded-md text-[11px] font-medium">
                    <Pause size={12} />Pause
                  </button>
                  <button onClick={() => stopScan(false)}
                    className="flex items-center gap-1.5 bg-error/10 text-error px-2.5 py-1.5 rounded-md text-[11px] font-medium">
                    <Square size={11} />Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-3 gap-2">
            <select value={country} onChange={e => { setCountry(e.target.value); setCity('') }}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
              {meta.countries.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
              <option value="">All cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
              <option value="">All categories</option>
              {meta.categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>

          {/* Modes */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {SCOUT_MODES.map(m => (
              <button key={m.key} onClick={() => setMode(m.key)} title={m.desc}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  mode === m.key ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                }`}>
                <m.icon size={11} />{m.label}
              </button>
            ))}
          </div>

          {/* Scan progress */}
          {scanStatus.running && scanStatus.progress?.currentTask && (
            <div className="px-3 py-2 bg-accent/5 border border-accent/20 rounded-md text-[11px] text-accent flex items-center gap-2">
              <Loader2 size={12} className="animate-spin shrink-0" />
              <span className="truncate">{scanStatus.progress.currentTask}</span>
              <span className="ml-auto shrink-0 font-mono">
                {scanStatus.progress.created} leads &middot; {scanStatus.remaining} left
              </span>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-error/5 border border-error/20 rounded-md text-[11px] text-error flex items-center gap-2">
              <AlertCircle size={12} /><span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><X size={12} /></button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-px bg-border border-b border-border shrink-0">
          {[
            { label: 'Total', value: stats.total || 0, icon: Users },
            { label: 'High Priority', value: stats.highPriority || 0, icon: TrendingUp },
            { label: 'No Website', value: stats.noWebsite || 0, icon: AlertCircle },
            { label: 'Avg Score', value: stats.avgScore || 0, icon: BarChart3 },
          ].map(s => (
            <div key={s.label} className="bg-surface px-3 py-2 flex items-center gap-2">
              <s.icon size={12} className="text-text-tertiary shrink-0" />
              <div>
                <div className="text-[14px] font-bold font-mono">{s.value}</div>
                <div className="text-[9px] text-text-tertiary uppercase tracking-wider">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..."
              className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-1.5 text-[12px] placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-surface border border-border rounded-md px-2 py-1.5 text-[11px] focus:border-accent focus:outline-none">
            <option value="score">By Score</option>
            <option value="newest">Newest</option>
            <option value="rating">By Rating</option>
            <option value="name">By Name</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-accent-muted text-accent' : 'hover:bg-elevated text-text-tertiary'}`}>
            <Filter size={13} />
          </button>
          <button onClick={() => { loadLeads(); loadStats() }} className="p-1.5 hover:bg-elevated rounded-md text-text-tertiary">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1 shrink-0">
            {['', 'new', 'reviewed', 'shortlisted', 'contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'won', 'lost', 'archived'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize transition-colors ${
                  filterStatus === s ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                }`}>
                {s ? s.replace('_', ' ') : 'All'}
              </button>
            ))}
            <span className="text-border">|</span>
            <button onClick={() => setFilterNoWebsite(!filterNoWebsite)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                filterNoWebsite ? 'bg-error/10 text-error' : 'bg-elevated text-text-tertiary'
              }`}>No Website</button>
          </div>
        )}

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto">
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-text-tertiary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Radar size={28} className="text-text-tertiary mx-auto mb-3 opacity-30" />
              <p className="text-[13px] text-text-tertiary mb-1">No leads found</p>
              <p className="text-[11px] text-text-tertiary">Select a category and start scanning</p>
            </div>
          ) : filtered.map(lead => (
            <button key={lead.id} onClick={() => setSelectedLead(lead)}
              className={`w-full text-left p-3 border-b border-border hover:bg-surface/60 transition-colors ${selectedLead?.id === lead.id ? 'bg-surface' : ''}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-medium truncate">{lead.business_name}</span>
                  {!lead.has_website && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-error/10 text-error rounded shrink-0">NO SITE</span>}
                </div>
                {lead.opportunity_score > 0 && (
                  <span className={`text-[13px] font-mono font-bold shrink-0 ${scoreColor(lead.opportunity_score)}`}>{lead.opportunity_score}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary flex-wrap">
                <span className="flex items-center gap-0.5"><MapPin size={9} />{lead.city}</span>
                <span>&middot;</span>
                <span className="capitalize">{lead.category}</span>
                {lead.rating > 0 && (
                  <><span>&middot;</span><Star size={9} className="text-warning" /><span>{lead.rating} ({lead.review_count})</span></>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                  {lead.status?.replace('_', ' ')}
                </span>
                {lead.suggested_package && <span className="text-[9px] text-accent bg-accent-muted px-1.5 py-0.5 rounded">{lead.suggested_package}</span>}
                {lead.outreach_priority && lead.outreach_priority !== '' && (
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    lead.outreach_priority === 'critical' ? 'bg-error/10 text-error' : lead.outreach_priority === 'high' ? 'bg-warning/10 text-warning' : 'bg-elevated text-text-tertiary'
                  }`}>{lead.outreach_priority}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: Detail */}
      {selectedLead && (
        <div className="flex-1 overflow-y-auto bg-bg">
          <LeadDetail
            lead={selectedLead}
            statuses={meta.statuses || []}
            onClose={() => setSelectedLead(null)}
            onAnalyze={() => analyzeLead(selectedLead)}
            onUpdate={(updated) => { setSelectedLead(updated); loadLeads(); loadStats() }}
          />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// LEAD DETAIL PANEL
// ═══════════════════════════════════════════════
function LeadDetail({ lead, statuses, onClose, onAnalyze, onUpdate }) {
  const [tab, setTab] = useState('overview')
  const [outreach, setOutreach] = useState(lead.outreach_email || null)
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [channel, setChannel] = useState('email')
  const [style, setStyle] = useState('professional')
  const [copied, setCopied] = useState('')

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'analysis', label: 'Analysis', icon: Sparkles },
    { key: 'outreach', label: 'Outreach', icon: Send },
  ]

  useEffect(() => {
    setOutreach(lead.outreach_email || null)
  }, [lead.id])

  const updateStatus = async (newStatus) => {
    try {
      await scout.updateStatus(lead.id, { status: newStatus })
      onUpdate({ ...lead, status: newStatus })
    } catch {}
  }

  const generateOutreach = async () => {
    setOutreachLoading(true)
    try {
      const result = await scout.generateOutreach(lead.id, { channel, style })
      setOutreach(result.outreach)
    } catch {}
    setOutreachLoading(false)
  }

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const issues = Array.isArray(lead.website_issues) ? lead.website_issues : []
  const painPoints = Array.isArray(lead.pain_points) ? lead.pain_points : []
  const channels = Array.isArray(lead.contact_channels) ? lead.contact_channels : []

  const allStatuses = statuses.length ? statuses : ['new','reviewed','shortlisted','contacted','interested','meeting_scheduled','proposal_sent','won','lost','archived']

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-[20px]">{lead.business_name}</h2>
            {lead.opportunity_score > 0 && (
              <span className={`text-[16px] font-mono font-bold ${scoreColor(lead.opportunity_score)}`}>{lead.opportunity_score}</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-1 text-[12px] text-text-secondary flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={11} />{lead.city}, {lead.country}</span>
            <span className="capitalize">{lead.category}</span>
            {lead.rating > 0 && <span className="flex items-center gap-1"><Star size={11} className="text-warning" />{lead.rating} ({lead.review_count})</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-elevated rounded-md"><X size={16} className="text-text-tertiary" /></button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-text-tertiary mr-1">Status:</span>
        {allStatuses.map(s => (
          <button key={s} onClick={() => updateStatus(s)}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize transition-colors ${
              lead.status === s ? 'bg-accent text-white' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
            }`}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-4 gap-2">
        <InfoCard label="Website" value={lead.has_website ? (lead.website_url || 'Yes') : 'None'} color={lead.has_website ? 'accent' : 'error'} />
        <InfoCard label="Package" value={lead.suggested_package || '---'} color="accent" />
        <InfoCard label="Priority" value={lead.outreach_priority || '---'} color={lead.outreach_priority === 'critical' ? 'error' : lead.outreach_priority === 'high' ? 'warning' : 'default'} />
        <InfoCard label="Mode" value={lead.scouting_mode || 'manual'} />
      </div>

      {/* Contact row */}
      {(lead.phone || lead.email || lead.website_url) && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-surface border border-border rounded-lg flex-wrap">
          {lead.phone && <span className="flex items-center gap-1.5 text-[12px] text-text-secondary"><Phone size={12} className="text-text-tertiary" />{lead.phone}</span>}
          {lead.email && <span className="flex items-center gap-1.5 text-[12px] text-text-secondary"><Mail size={12} className="text-text-tertiary" />{lead.email}</span>}
          {lead.website_url && (
            <a href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] text-accent hover:text-accent-hover ml-auto">
              <Globe size={12} />Visit <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      {/* Analyze CTA */}
      {(lead.status === 'new' || !lead.opportunity_score) && (
        <button onClick={onAnalyze} disabled={lead._analyzing}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white py-3 rounded-lg text-[13px] font-semibold transition-colors">
          {lead._analyzing ? <><Loader2 size={14} className="animate-spin" />Analyzing...</> : <><Sparkles size={14} />Analyze This Lead</>}
        </button>
      )}

      {/* Tabs */}
      <div className="border-b border-border flex gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-[12px] font-medium border-b-2 transition-colors ${
              tab === t.key ? 'text-accent border-accent' : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}>
            <t.icon size={12} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {lead.reasoning && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Target size={13} className="text-accent" /><span className="text-[12px] font-semibold text-accent">Why This Lead</span></div>
              <p className="text-[13px] text-text-secondary leading-relaxed">{lead.reasoning}</p>
            </div>
          )}
          {lead.what_to_sell && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Building2 size={13} className="text-accent" /><span className="text-[12px] font-semibold">What to Sell</span></div>
              <p className="text-[13px] text-text-secondary leading-relaxed">{lead.what_to_sell}</p>
            </div>
          )}
          {lead.opportunity_score > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold mb-3">Score Breakdown</h3>
              <div className="space-y-2">
                <ScoreBar label="Opportunity" value={lead.opportunity_score} max={100} />
                <ScoreBar label="Website" value={lead.website_score || 0} max={10} />
                <ScoreBar label="SEO" value={lead.seo_score || 0} max={10} />
                <ScoreBar label="Mobile" value={lead.mobile_score || 0} max={10} />
                <ScoreBar label="Conversion" value={lead.conversion_score || 0} max={10} />
              </div>
            </div>
          )}
          {channels.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold mb-2">Suggested Contact Channels</h3>
              <div className="flex gap-1.5 flex-wrap">{channels.map((c, i) => <span key={i} className="text-[11px] bg-accent-muted text-accent px-2 py-0.5 rounded capitalize">{c}</span>)}</div>
            </div>
          )}
          {!lead.reasoning && !lead.opportunity_score && (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <Sparkles size={24} className="text-text-tertiary mx-auto mb-2 opacity-30" />
              <p className="text-[12px] text-text-tertiary">Click "Analyze This Lead" to get AI insights</p>
            </div>
          )}
        </div>
      )}

      {tab === 'analysis' && (
        <div className="space-y-4">
          {!lead.opportunity_score ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <Sparkles size={24} className="text-text-tertiary mx-auto mb-2 opacity-30" />
              <p className="text-[12px] text-text-tertiary">Run analysis first</p>
            </div>
          ) : (
            <>
              {issues.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <h3 className="text-[12px] font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={13} className="text-warning" />Website Issues</h3>
                  <div className="space-y-1.5">{issues.map((issue, i) => <div key={i} className="flex items-start gap-2 text-[12px] text-text-secondary"><span className="text-error mt-0.5 shrink-0">&bull;</span><span>{issue}</span></div>)}</div>
                </div>
              )}
              {painPoints.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <h3 className="text-[12px] font-semibold mb-3 flex items-center gap-2"><Target size={13} className="text-accent" />Pain Points</h3>
                  <div className="space-y-1.5">{painPoints.map((p, i) => <div key={i} className="flex items-start gap-2 text-[12px] text-text-secondary"><span className="text-accent shrink-0">&rarr;</span><span>{p}</span></div>)}</div>
                </div>
              )}
              {lead.suggested_package && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                  <h3 className="text-[12px] font-semibold mb-1 text-accent">Recommended Package</h3>
                  <p className="text-[14px] font-bold">{lead.suggested_package}</p>
                  {lead.what_to_sell && <p className="text-[12px] text-text-secondary mt-1">{lead.what_to_sell}</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'outreach' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select value={channel} onChange={e => setChannel(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
              <option value="email">Email</option>
              <option value="viber">Viber</option>
            </select>
            <select value={style} onChange={e => setStyle(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="direct">Direct</option>
            </select>
            <button onClick={generateOutreach} disabled={outreachLoading}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-[12px] font-medium ml-auto">
              {outreachLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {outreachLoading ? 'Generating...' : outreach ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          {outreach ? (
            <div className="space-y-3">
              {outreach.subject && (
                <div className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Subject</span>
                    <CopyBtn text={outreach.subject} label="subject" copied={copied} onCopy={copyText} />
                  </div>
                  <p className="text-[13px] font-medium">{outreach.subject}</p>
                </div>
              )}
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1"><MessageSquare size={10} />Email</span>
                  <CopyBtn text={outreach.message} label="message" copied={copied} onCopy={copyText} />
                </div>
                <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">{outreach.message}</div>
              </div>
              {outreach.viber_message && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1"><MessageSquare size={10} />Viber</span>
                    <CopyBtn text={outreach.viber_message} label="viber" copied={copied} onCopy={copyText} />
                  </div>
                  <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">{outreach.viber_message}</div>
                </div>
              )}
              {outreach.followUp && (
                <div className="bg-elevated border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1"><Clock size={10} />Follow-Up (5 days)</span>
                    <CopyBtn text={outreach.followUp} label="followup" copied={copied} onCopy={copyText} />
                  </div>
                  <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">{outreach.followUp}</div>
                </div>
              )}
            </div>
          ) : !outreachLoading ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <Send size={24} className="text-text-tertiary mx-auto mb-2 opacity-30" />
              <p className="text-[12px] text-text-tertiary">Generate a personalized outreach message</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════
function InfoCard({ label, value, color }) {
  const c = color === 'error' ? 'text-error' : color === 'warning' ? 'text-warning' : color === 'accent' ? 'text-accent' : 'text-text-primary'
  return (
    <div className="bg-surface border border-border rounded-md p-2.5">
      <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">{label}</span>
      <span className={`text-[11px] font-medium mt-0.5 block truncate capitalize ${c}`}>{value}</span>
    </div>
  )
}

function ScoreBar({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-text-tertiary w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error'}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-[11px] font-mono font-bold w-8 text-right ${scoreColor(pct)}`}>{value}/{max}</span>
    </div>
  )
}

function CopyBtn({ text, label, copied, onCopy }) {
  return (
    <button onClick={() => onCopy(text, label)} className="text-[10px] text-accent hover:text-accent-hover flex items-center gap-1">
      {copied === label ? <><CheckCircle size={10} />Copied</> : <><Copy size={10} />Copy</>}
    </button>
  )
}
