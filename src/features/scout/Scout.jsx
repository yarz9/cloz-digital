import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, MapPin, Globe, AlertCircle, Star, ExternalLink, Phone, Mail,
  Sparkles, Target, TrendingUp, X, Send, Loader2, RefreshCw, CheckCircle,
  Play, Square, Pause, Zap, Eye, Copy, Users, Radar, Building2, BarChart3,
  AlertTriangle, Clock, DollarSign, ChevronDown, ChevronRight,
  MapPinned, Award, ArrowRight, MessageSquare, Code, FileCode, Flame
} from 'lucide-react'
import { scout } from '@/lib/api'

// ══════════════════════════════════════════════════════════════
//  CLIENT SCOUT — Lean AI-Powered Sales Engine
//  Find → Analyze → Outreach → Close
// ══════════════════════════════════════════════════════════════

const MODES = [
  { key: 'auto',              label: 'Auto',          icon: Zap,          desc: 'Priority industries first' },
  { key: 'no_website',        label: 'No Website',    icon: AlertCircle,  desc: 'Businesses without websites' },
  { key: 'bad_website',       label: 'Bad Website',   icon: AlertTriangle,desc: 'Outdated/poor websites' },
  { key: 'high_opportunity',  label: 'High Opp.',     icon: TrendingUp,   desc: 'Best conversion potential' },
  { key: 'premium_prospects', label: 'Premium',       icon: Award,        desc: 'Hotels, clinics, law firms' },
  { key: 'manual',            label: 'Manual',        icon: Search,       desc: 'Custom search' },
]

const STAGES = ['new', 'contacted', 'responded', 'proposal_sent', 'won', 'lost']

const STAGE_COLORS = {
  new:           'bg-blue-500/10 text-blue-400',
  contacted:     'bg-warning/10 text-warning',
  responded:     'bg-purple-500/10 text-purple-400',
  proposal_sent: 'bg-cyan-500/10 text-cyan-400',
  won:           'bg-success/10 text-success',
  lost:          'bg-error/10 text-error',
}

const TABS = [
  { key: 'discovery', label: 'Discovery',   icon: Radar },
  { key: 'leads',     label: 'Leads',       icon: Users },
  { key: 'pipeline',  label: 'Pipeline',    icon: TrendingUp },
]

function scoreColor(s) {
  if (s >= 75) return 'text-success'
  if (s >= 50) return 'text-warning'
  if (s > 0) return 'text-error'
  return 'text-text-tertiary'
}

function fmtEur(n) { return n ? `€${n.toLocaleString()}` : '—' }

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function Scout() {
  const [meta, setMeta] = useState({ countries: [], categories: [], statuses: [], modes: [], priorityCategories: [] })
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({})
  const [selectedLead, setSelectedLead] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('discovery')

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
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState('score')
  // Synthetic-lead visibility — defaults to OFF (real OSM leads only)
  const [showSynthetic, setShowSynthetic] = useState(false)

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
      const params = { sort, limit: 200 }
      if (filterStatus) params.status = filterStatus
      if (filterNoWebsite) params.hasWebsite = 'false'
      if (searchQuery) params.search = searchQuery
      if (showSynthetic) params.onlySynthetic = 'true'
      const data = await scout.leads(params)
      setLeads(data.leads || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [filterStatus, filterNoWebsite, sort, searchQuery, showSynthetic])

  const loadStats = async () => {
    try { setStats(await scout.stats()) } catch {}
  }

  useEffect(() => { loadLeads() }, [filterStatus, filterNoWebsite, sort, searchQuery, showSynthetic])

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
      if (pause) await scout.pause()
      else await scout.scanStop()
      pollScan()
      loadLeads()
      loadStats()
    } catch (e) { setError(e.message) }
  }

  const quickDiscover = async () => {
    if (!category) return setError('Select a business category')
    setError('')
    setLoading(true)
    try {
      await scout.discover({ country, city: city || undefined, category, mode })
      loadLeads()
      loadStats()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const analyzeLead = async (lead) => {
    setSelectedLead({ ...lead, _analyzing: true })
    try {
      const result = await scout.analyze(lead.id)
      const updated = { ...lead, ...result.analysis, _analyzing: false }
      setSelectedLead(updated)
      loadLeads()
      loadStats()
    } catch (e) {
      setError(e.message)
      setSelectedLead(prev => prev ? { ...prev, _analyzing: false } : null)
    }
  }

  const countryData = meta.countries?.find(c => c.key === country)
  const cities = countryData?.cities || []

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══ LEFT PANEL ══ */}
      <div className={`${selectedLead ? 'w-[440px]' : 'flex-1 max-w-[960px]'} flex flex-col border-r border-border bg-bg overflow-hidden transition-all`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Radar size={18} className="text-accent" />
              <h1 className="font-display font-bold text-[18px]">Client Scout</h1>
              <span className="text-[8px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded" title="All leads sourced from OpenStreetMap — verified real businesses only">
                OSM VERIFIED
              </span>
              {scanStatus.running && (
                <span className="text-[9px] font-bold bg-success/10 text-success px-2 py-0.5 rounded animate-pulse">SCANNING</span>
              )}
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  activeTab === t.key ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
                }`}>
                <t.icon size={13} />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── DISCOVERY TAB ── */}
        {activeTab === 'discovery' && (
          <>
            <div className="p-4 space-y-3 border-b border-border shrink-0">
              {/* Selectors */}
              <div className="grid grid-cols-3 gap-2">
                <select value={country} onChange={e => { setCountry(e.target.value); setCity('') }}
                  className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
                  {(meta.countries || []).map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
                <select value={city} onChange={e => setCity(e.target.value)}
                  className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
                  <option value="">All cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
                  <option value="">All categories</option>
                  {(meta.categories || []).map(c => {
                    const isPriority = meta.priorityCategories?.includes(c)
                    return <option key={c} value={c}>{isPriority ? '★ ' : ''}{c}</option>
                  })}
                </select>
              </div>

              {/* Modes */}
              <div className="flex gap-1.5 flex-wrap">
                {MODES.map(m => (
                  <button key={m.key} onClick={() => setMode(m.key)} title={m.desc}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                      mode === m.key ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                    }`}>
                    <m.icon size={11} />{m.label}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {!scanStatus.running ? (
                  <>
                    <button onClick={quickDiscover} disabled={loading || !category}
                      className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border text-text-secondary disabled:opacity-40 px-3 py-2 rounded-md text-[12px] font-medium transition-colors flex-1">
                      <Search size={13} />Quick Scan
                    </button>
                    <button onClick={startScan}
                      className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-semibold transition-colors flex-1">
                      <Play size={13} />Start Full Scan
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => stopScan(true)}
                      className="flex items-center gap-1.5 bg-warning/10 text-warning px-3 py-2 rounded-md text-[12px] font-medium flex-1">
                      <Pause size={13} />Pause
                    </button>
                    <button onClick={() => stopScan(false)}
                      className="flex items-center gap-1.5 bg-error/10 text-error px-3 py-2 rounded-md text-[12px] font-medium flex-1">
                      <Square size={12} />Stop
                    </button>
                  </>
                )}
              </div>

              {/* Scan progress */}
              {scanStatus.running && scanStatus.progress?.currentTask && (
                <div className="px-3 py-2 bg-accent/5 border border-accent/20 rounded-md text-[11px] text-accent flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin shrink-0" />
                  <span className="truncate">{scanStatus.progress.currentTask}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px]">
                    {scanStatus.progress.created || 0} new / {scanStatus.progress.scanned || 0} scanned
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

            {/* Dashboard widgets */}
            <DashboardWidgets stats={stats} onSelectLead={(lead) => { setSelectedLead(lead); setActiveTab('leads') }} />
          </>
        )}

        {/* ── LEADS TAB ── */}
        {activeTab === 'leads' && (
          <>
            {/* Search + filters */}
            <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search businesses..."
                  className="w-full bg-surface border border-border rounded-md pl-8 pr-3 py-1.5 text-[12px] placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-surface border border-border rounded-md px-2 py-1.5 text-[11px] focus:border-accent focus:outline-none">
                <option value="score">Score</option>
                <option value="newest">Newest</option>
                <option value="revenue">Revenue</option>
                <option value="urgency">Urgency</option>
                <option value="rating">Rating</option>
                <option value="name">Name</option>
              </select>
              <button onClick={() => { loadLeads(); loadStats() }} className="p-1.5 hover:bg-elevated rounded-md text-text-tertiary">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Stage filters */}
            <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1 shrink-0">
              {['', ...STAGES].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize transition-colors ${
                    filterStatus === s ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                  }`}>
                  {s ? s.replace('_', ' ') : 'All'}
                  {s && stats.byStatus?.[s] ? ` (${stats.byStatus[s]})` : ''}
                </button>
              ))}
              <span className="text-border">|</span>
              <button onClick={() => setFilterNoWebsite(!filterNoWebsite)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                  filterNoWebsite ? 'bg-error/10 text-error' : 'bg-elevated text-text-tertiary'
                }`}>No Website{stats.noWebsite ? ` (${stats.noWebsite})` : ''}</button>
              {stats.syntheticCount > 0 && (
                <button onClick={() => setShowSynthetic(!showSynthetic)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ml-auto ${
                    showSynthetic ? 'bg-warning/15 text-warning' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
                  }`}
                  title="Synthetic leads were generated by AI in earlier versions and are not verified businesses">
                  {showSynthetic ? '★ Synthetic only' : `${stats.syntheticCount} synthetic hidden`}
                </button>
              )}
            </div>

            {/* Synthetic-mode banner */}
            {showSynthetic && (
              <div className="px-3 py-2 border-b border-warning/20 bg-warning/5 text-[11px] text-warning flex items-center gap-2 shrink-0">
                <AlertCircle size={12} />
                <span className="flex-1">Viewing synthetic (AI-generated) leads. These are NOT real businesses and should not be contacted.</span>
                <button onClick={() => setShowSynthetic(false)} className="underline hover:no-underline">Back to real leads</button>
              </div>
            )}

            {/* Lead list */}
            <LeadList leads={leads} loading={loading} selectedId={selectedLead?.id} onSelect={setSelectedLead} showSynthetic={showSynthetic} />
          </>
        )}

        {/* ── PIPELINE TAB ── */}
        {activeTab === 'pipeline' && (
          <PipelineView leads={leads} stats={stats} onSelect={setSelectedLead} />
        )}
      </div>

      {/* ══ RIGHT: Lead Detail ══ */}
      {selectedLead && (
        <div className="flex-1 overflow-y-auto bg-bg">
          <LeadDetail
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onAnalyze={() => analyzeLead(selectedLead)}
            onUpdate={(updated) => { setSelectedLead(updated); loadLeads(); loadStats() }}
          />
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD WIDGETS
// ══════════════════════════════════════════════════════════════

function DashboardWidgets({ stats, onSelectLead }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatCard icon={Users} label="Total Leads" value={stats.total || 0} />
        <StatCard icon={AlertCircle} label="No Website" value={stats.noWebsite || 0} color="text-error" />
        <StatCard icon={TrendingUp} label="High Opp." value={stats.highOpp || 0} color="text-success" />
        <StatCard icon={Send} label="Contacted" value={stats.contacted || 0} color="text-warning" />
        <StatCard icon={DollarSign} label="Pipeline" value={fmtEur(stats.pipelineValue)} color="text-accent" small />
        <StatCard icon={DollarSign} label="Expected MRR" value={fmtEur(stats.expectedMRR)} color="text-success" small />
      </div>

      {/* Revenue summary */}
      {(stats.wonRevenue > 0 || stats.pipelineValue > 0) && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium mb-3">Revenue</h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-text-tertiary block">Won Revenue</span>
              <span className="text-[16px] font-bold text-success font-display">{fmtEur(stats.wonRevenue)}</span>
            </div>
            <div>
              <span className="text-[10px] text-text-tertiary block">Won MRR</span>
              <span className="text-[16px] font-bold text-success font-display">{fmtEur(stats.wonMRR)}</span>
            </div>
            <div>
              <span className="text-[10px] text-text-tertiary block">Pipeline Value</span>
              <span className="text-[16px] font-bold text-accent font-display">{fmtEur(stats.pipelineValue)}</span>
            </div>
            <div>
              <span className="text-[10px] text-text-tertiary block">Expected MRR</span>
              <span className="text-[16px] font-bold text-accent font-display">{fmtEur(stats.expectedMRR)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Best leads today */}
      {stats.bestToday?.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
            <Sparkles size={11} className="text-accent" /> Best Leads Today
          </h3>
          <div className="space-y-2">
            {stats.bestToday.map(l => (
              <button key={l.id} onClick={() => onSelectLead(l)}
                className="w-full flex items-center justify-between px-3 py-2 bg-elevated hover:bg-raised rounded-md transition-colors text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium truncate">{l.business_name}</span>
                    {!l.has_website && <span className="text-[8px] font-bold px-1 py-0.5 bg-error/10 text-error rounded shrink-0">NO SITE</span>}
                  </div>
                  <span className="text-[10px] text-text-tertiary capitalize">{l.category} &middot; {l.city}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {l.suggested_package && <span className="text-[9px] text-accent bg-accent-muted px-1.5 py-0.5 rounded">{l.suggested_package}</span>}
                  <span className={`text-[14px] font-mono font-bold ${scoreColor(l.opportunity_score)}`}>{l.opportunity_score}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups due */}
      {stats.followUpsDue?.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
          <h3 className="text-[11px] text-warning uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
            <Clock size={11} /> Follow-Ups Due
          </h3>
          <div className="space-y-2">
            {stats.followUpsDue.map(l => (
              <button key={l.id} onClick={() => onSelectLead(l)}
                className="w-full flex items-center justify-between px-3 py-2 bg-elevated hover:bg-raised rounded-md transition-colors text-left">
                <div>
                  <span className="text-[12px] font-medium">{l.business_name}</span>
                  <span className="text-[10px] text-text-tertiary ml-2 capitalize">{l.category} &middot; {l.city}</span>
                </div>
                <span className="text-[10px] text-warning font-mono">
                  {l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category distribution */}
      {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium mb-3">By Category</h3>
          <div className="space-y-1.5">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[11px] text-text-secondary capitalize flex-1 truncate">{cat}</span>
                <div className="w-24 h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((count / (stats.total || 1)) * 100, 100)}%` }} />
                </div>
                <span className="text-[10px] text-text-tertiary font-mono w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  LEAD LIST
// ══════════════════════════════════════════════════════════════

function LeadList({ leads, loading, selectedId, onSelect }) {
  if (loading && leads.length === 0) {
    return <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-text-tertiary" /></div>
  }
  if (leads.length === 0) {
    return (
      <div className="p-8 text-center flex-1">
        <Radar size={28} className="text-text-tertiary mx-auto mb-3 opacity-30" />
        <p className="text-[13px] text-text-tertiary mb-1">No leads found</p>
        <p className="text-[11px] text-text-tertiary">Go to Discovery to scan for businesses</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {leads.map(lead => (
        <button key={lead.id} onClick={() => onSelect(lead)}
          className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-surface/60 transition-colors ${selectedId === lead.id ? 'bg-surface' : ''}`}>
          <div className="flex items-start justify-between mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-medium truncate">{lead.business_name}</span>
              {lead.synthetic ? (
                <span className="text-[8px] font-bold px-1 py-0.5 bg-warning/15 text-warning rounded shrink-0" title="AI-generated — not a real business">SYNTHETIC</span>
              ) : lead.source === 'osm' || lead.verified ? (
                <MapPinned size={10} className="text-success shrink-0" title="OSM verified — real business" />
              ) : lead.place_id ? (
                <MapPinned size={10} className="text-success shrink-0" title="Google verified" />
              ) : null}
              {!lead.has_website && <span className="text-[8px] font-bold px-1 py-0.5 bg-error/10 text-error rounded shrink-0">NO SITE</span>}
            </div>
            {lead.opportunity_score > 0 && (
              <span className={`text-[14px] font-mono font-bold ${scoreColor(lead.opportunity_score)} shrink-0`}>{lead.opportunity_score}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-0.5"><MapPin size={9} />{lead.city}</span>
            <span>&middot;</span>
            <span className="capitalize">{lead.category}</span>
            {lead.rating > 0 && <><span>&middot;</span><Star size={9} className="text-warning" /><span>{lead.rating}</span></>}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ${STAGE_COLORS[lead.status] || STAGE_COLORS.new}`}>
              {lead.status?.replace('_', ' ')}
            </span>
            {lead.suggested_package && <span className="text-[9px] text-accent bg-accent-muted px-1.5 py-0.5 rounded">{lead.suggested_package}</span>}
            {lead.revenue_potential?.project_value > 0 && (
              <span className="text-[9px] text-success bg-success/10 px-1.5 py-0.5 rounded">{fmtEur(lead.revenue_potential.project_value)}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  PIPELINE VIEW
// ══════════════════════════════════════════════════════════════

function PipelineView({ leads, stats, onSelect }) {
  const stageLabels = { new: 'New', contacted: 'Contacted', responded: 'Responded', proposal_sent: 'Proposal', won: 'Won', lost: 'Lost' }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {/* Pipeline summary */}
      <div className="grid grid-cols-6 gap-2">
        {STAGES.map(s => {
          const count = stats.byStatus?.[s] || 0
          const isActive = s !== 'won' && s !== 'lost'
          return (
            <div key={s} className={`rounded-lg p-3 text-center border ${
              s === 'won' ? 'bg-success/5 border-success/20' :
              s === 'lost' ? 'bg-error/5 border-error/20' :
              'bg-surface border-border'
            }`}>
              <div className="text-[18px] font-bold font-display">{count}</div>
              <div className="text-[9px] text-text-tertiary uppercase tracking-wider">{stageLabels[s]}</div>
            </div>
          )
        })}
      </div>

      {/* Pipeline columns */}
      {STAGES.filter(s => s !== 'lost').map(stage => {
        const stageLeads = leads.filter(l => l.status === stage)
        if (stageLeads.length === 0) return null

        return (
          <div key={stage} className="bg-surface border border-border rounded-lg">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-[12px] font-semibold capitalize flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  stage === 'won' ? 'bg-success' : stage === 'contacted' ? 'bg-warning' : stage === 'responded' ? 'bg-purple-400' : stage === 'proposal_sent' ? 'bg-cyan-400' : 'bg-blue-400'
                }`} />
                {stageLabels[stage]}
              </h3>
              <span className="text-[10px] text-text-tertiary">{stageLeads.length} leads</span>
            </div>
            <div className="divide-y divide-border">
              {stageLeads.slice(0, 10).map(lead => (
                <button key={lead.id} onClick={() => onSelect(lead)}
                  className="w-full text-left px-4 py-2.5 hover:bg-elevated transition-colors flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium truncate">{lead.business_name}</div>
                    <div className="text-[10px] text-text-tertiary capitalize">{lead.category} &middot; {lead.city}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.revenue_potential?.project_value > 0 && (
                      <span className="text-[10px] text-success font-mono">{fmtEur(lead.revenue_potential.project_value)}</span>
                    )}
                    {lead.opportunity_score > 0 && (
                      <span className={`text-[12px] font-mono font-bold ${scoreColor(lead.opportunity_score)}`}>{lead.opportunity_score}</span>
                    )}
                    <ChevronRight size={12} className="text-text-tertiary" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  LEAD DETAIL PANEL
// ══════════════════════════════════════════════════════════════

function LeadDetail({ lead, onClose, onAnalyze, onUpdate }) {
  const [tab, setTab] = useState('overview')
  const [outreach, setOutreach] = useState(null)
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [style, setStyle] = useState('professional')
  const [copied, setCopied] = useState('')
  const [websiteReview, setWebsiteReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [rebuildPrompt, setRebuildPrompt] = useState(null)
  const [promptVariant, setPromptVariant] = useState('detailed')
  const [promptLoading, setPromptLoading] = useState(false)

  const tabs = [
    { key: 'overview', label: 'Overview',    icon: Eye },
    { key: 'outreach', label: 'Outreach',    icon: Send },
    { key: 'website',  label: 'Website',     icon: Globe },
  ]

  useEffect(() => {
    setOutreach(null)
    setWebsiteReview(null)
    setRebuildPrompt(null)
    setTab('overview')
  }, [lead.id])

  const changeStage = async (newStatus) => {
    try {
      await scout.changeStage(lead.id, { stage: newStatus })
      onUpdate({ ...lead, status: newStatus })
    } catch {}
  }

  const generateOutreach = async () => {
    setOutreachLoading(true)
    try {
      const result = await scout.generateOutreach(lead.id, { style })
      setOutreach(result.outreach || result)
    } catch {}
    setOutreachLoading(false)
  }

  const runWebsiteReview = async () => {
    if (!lead.website_url) return
    setReviewLoading(true)
    try {
      const result = await scout.websiteReview(lead.id)
      setWebsiteReview(result.review || result)
    } catch {}
    setReviewLoading(false)
  }

  const generateRebuildPrompt = async () => {
    setPromptLoading(true)
    try {
      const result = await scout.rebuildPrompt(lead.id, { variant: promptVariant })
      setRebuildPrompt(result.prompt || result)
    } catch {}
    setPromptLoading(false)
  }

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const painPoints = Array.isArray(lead.pain_points) ? lead.pain_points : safeArr(lead.pain_points)
  const riskFactors = Array.isArray(lead.risk_factors) ? lead.risk_factors : safeArr(lead.risk_factors)
  const issues = Array.isArray(lead.website_issues) ? lead.website_issues : safeArr(lead.website_issues)
  const channels = Array.isArray(lead.contact_channels) ? lead.contact_channels : safeArr(lead.contact_channels)
  const revPotential = typeof lead.revenue_potential === 'object' ? lead.revenue_potential : safeObj(lead.revenue_potential)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-[20px]">{lead.business_name}</h2>
            {lead.synthetic ? (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-warning/15 text-warning rounded" title="AI-generated — not a real business">SYNTHETIC</span>
            ) : (lead.source === 'osm' || lead.verified) ? (
              <MapPinned size={14} className="text-success" title="OSM verified — real business" />
            ) : lead.place_id ? (
              <MapPinned size={14} className="text-success" title="Google verified" />
            ) : null}
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

      {/* Pipeline stages */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-text-tertiary mr-1">Stage:</span>
        {STAGES.map(s => (
          <button key={s} onClick={() => changeStage(s)}
            className={`text-[9px] font-medium px-2 py-1 rounded capitalize transition-colors ${
              lead.status === s ? 'bg-accent text-white' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
            }`}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-4 gap-2">
        <InfoCard label="Website" value={lead.has_website ? 'Has Site' : 'No Website'} color={lead.has_website ? 'default' : 'error'} />
        <InfoCard label="Package" value={lead.suggested_package || '—'} color="accent" />
        <InfoCard label="Project" value={revPotential.project_value ? `€${revPotential.project_value}` : '—'} color="success" />
        <InfoCard label="Monthly" value={revPotential.monthly_value ? `€${revPotential.monthly_value}/mo` : '—'} color="success" />
      </div>

      {/* Contact */}
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
      {!lead.opportunity_score && (
        <button onClick={onAnalyze} disabled={lead._analyzing}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white py-3 rounded-lg text-[13px] font-semibold transition-colors">
          {lead._analyzing ? <><Loader2 size={14} className="animate-spin" />Analyzing...</> : <><Sparkles size={14} />Analyze Opportunity</>}
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

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Executive summary */}
          {lead.reasoning && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Sparkles size={13} className="text-accent" /><span className="text-[12px] font-semibold text-accent">Opportunity Summary</span></div>
              <p className="text-[13px] text-text-secondary leading-relaxed">{lead.reasoning}</p>
            </div>
          )}

          {/* Sales angle */}
          {lead.best_sales_angle && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Target size={13} className="text-accent" /><span className="text-[12px] font-semibold">Best Sales Angle</span></div>
              <p className="text-[13px] text-text-secondary leading-relaxed">{lead.best_sales_angle}</p>
            </div>
          )}

          {/* Pain points */}
          {painPoints.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={12} className="text-warning" />Pain Points</h3>
              <div className="space-y-1.5">{painPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-text-secondary"><span className="text-warning shrink-0">&rarr;</span>{p}</div>
              ))}</div>
            </div>
          )}

          {/* Revenue */}
          {revPotential.project_value > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><DollarSign size={13} className="text-success" /><span className="text-[12px] font-semibold text-success">Revenue Potential</span></div>
              <div className="grid grid-cols-4 gap-3">
                <div><span className="text-[10px] text-text-tertiary block">Project</span><span className="text-[14px] font-bold">{fmtEur(revPotential.project_value)}</span></div>
                <div><span className="text-[10px] text-text-tertiary block">Monthly</span><span className="text-[14px] font-bold">{fmtEur(revPotential.monthly_value)}</span></div>
                <div><span className="text-[10px] text-text-tertiary block">Lifetime</span><span className="text-[14px] font-bold">{fmtEur(revPotential.lifetime_value)}</span></div>
                <div><span className="text-[10px] text-text-tertiary block">Close %</span><span className="text-[14px] font-bold">{Math.round((revPotential.close_probability || 0) * 100)}%</span></div>
              </div>
            </div>
          )}

          {/* Objection prediction */}
          {lead.objection_prediction && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle size={13} className="text-warning" /><span className="text-[12px] font-semibold text-warning">Expected Objection</span></div>
              <p className="text-[13px] text-text-secondary">{lead.objection_prediction}</p>
            </div>
          )}

          {/* Score breakdown */}
          {lead.opportunity_score > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold mb-3">Score Breakdown</h3>
              <div className="space-y-2">
                <ScoreBar label="Opportunity" value={lead.opportunity_score} />
                <ScoreBar label="Trust" value={lead.trust_score || 0} />
                <ScoreBar label="Urgency" value={lead.urgency_score || 0} />
                <ScoreBar label="Website" value={lead.website_score || 0} />
                <ScoreBar label="SEO" value={lead.seo_score || 0} />
                <ScoreBar label="Conversion" value={lead.conversion_score || 0} />
              </div>
            </div>
          )}

          {/* Risk factors */}
          {riskFactors.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold mb-2 flex items-center gap-2"><AlertCircle size={12} className="text-error" />Risk Factors</h3>
              <div className="space-y-1">{riskFactors.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-text-secondary"><span className="text-error shrink-0">&bull;</span>{r}</div>
              ))}</div>
            </div>
          )}

          {/* Contact channels */}
          {channels.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Best contact:</span>
              {channels.map((c, i) => <span key={i} className="text-[11px] bg-accent-muted text-accent px-2 py-0.5 rounded capitalize">{c}</span>)}
            </div>
          )}

          {/* Empty state */}
          {!lead.reasoning && !lead.opportunity_score && (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <Sparkles size={24} className="text-text-tertiary mx-auto mb-2 opacity-30" />
              <p className="text-[12px] text-text-tertiary">Click "Analyze Opportunity" to get AI intelligence</p>
            </div>
          )}
        </div>
      )}

      {/* ── Outreach Tab ── */}
      {tab === 'outreach' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select value={style} onChange={e => setStyle(e.target.value)}
              className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[12px] focus:border-accent focus:outline-none">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="direct">Direct</option>
              <option value="consultative">Consultative</option>
            </select>
            <button onClick={generateOutreach} disabled={outreachLoading}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-[12px] font-medium ml-auto">
              {outreachLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {outreachLoading ? 'Generating...' : outreach ? 'Regenerate' : 'Generate Outreach'}
            </button>
          </div>

          {outreach ? (
            <div className="space-y-3">
              {outreach.subject && (
                <OutreachBlock label="Subject" icon={Mail} text={outreach.subject} copied={copied} onCopy={copyText} />
              )}
              {outreach.message && (
                <OutreachBlock label="Email" icon={Mail} text={outreach.message} copied={copied} onCopy={copyText} multiline />
              )}
              {outreach.viber_message && (
                <OutreachBlock label="Viber" icon={MessageSquare} text={outreach.viber_message} copied={copied} onCopy={copyText} multiline />
              )}
              {outreach.followUp1 && (
                <OutreachBlock label="Follow-Up (5 days)" icon={Clock} text={outreach.followUp1} copied={copied} onCopy={copyText} multiline muted />
              )}
            </div>
          ) : !outreachLoading ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <Send size={24} className="text-text-tertiary mx-auto mb-2 opacity-30" />
              <p className="text-[12px] text-text-tertiary">Generate personalized email, Viber, and follow-up messages</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Website Tab ── */}
      {tab === 'website' && (
        <div className="space-y-4">
          {!lead.website_url ? (
            <div className="bg-error/5 border border-error/20 rounded-lg p-6 text-center">
              <Globe size={24} className="text-error mx-auto mb-2 opacity-50" />
              <p className="text-[13px] text-error font-medium mb-1">No Website Detected</p>
              <p className="text-[11px] text-text-tertiary">This is a prime candidate for Launch Care (new website build)</p>
            </div>
          ) : (
            <>
              {/* Website Review */}
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold flex items-center gap-2"><Eye size={13} className="text-accent" />Website Review</h3>
                <button onClick={runWebsiteReview} disabled={reviewLoading}
                  className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border px-2.5 py-1.5 rounded-md text-[11px] font-medium">
                  {reviewLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {reviewLoading ? 'Reviewing...' : websiteReview ? 'Re-review' : 'Run Review'}
                </button>
              </div>

              {websiteReview && (
                <div className="space-y-3">
                  <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] font-semibold">Overall Score</span>
                      <span className={`text-[18px] font-mono font-bold ${scoreColor(websiteReview.overall_score)}`}>{websiteReview.overall_score}/100</span>
                    </div>
                    <div className="space-y-1.5">
                      {websiteReview.design_score != null && <ScoreBar label="Design" value={websiteReview.design_score} />}
                      {websiteReview.mobile_score != null && <ScoreBar label="Mobile" value={websiteReview.mobile_score} />}
                      {websiteReview.seo_score != null && <ScoreBar label="SEO" value={websiteReview.seo_score} />}
                      {websiteReview.conversion_score != null && <ScoreBar label="Conversion" value={websiteReview.conversion_score} />}
                      {websiteReview.trust_score != null && <ScoreBar label="Trust" value={websiteReview.trust_score} />}
                    </div>
                  </div>

                  {websiteReview.executive_summary && (
                    <div className="bg-surface border border-border rounded-lg p-4">
                      <h4 className="text-[12px] font-semibold mb-2">Summary</h4>
                      <p className="text-[12px] text-text-secondary leading-relaxed">{websiteReview.executive_summary}</p>
                    </div>
                  )}

                  {websiteReview.weaknesses?.length > 0 && (
                    <div className="bg-surface border border-border rounded-lg p-4">
                      <h4 className="text-[12px] font-semibold mb-2">Weaknesses</h4>
                      <div className="space-y-1">{websiteReview.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px] text-text-secondary"><span className="text-error shrink-0">&bull;</span>{w}</div>
                      ))}</div>
                    </div>
                  )}

                  {websiteReview.sales_talking_points?.length > 0 && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                      <h4 className="text-[12px] font-semibold text-accent mb-2">Sales Talking Points</h4>
                      <div className="space-y-1">{websiteReview.sales_talking_points.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px] text-text-secondary"><span className="text-accent shrink-0">{i + 1}.</span>{p}</div>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Rebuild Prompt */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold flex items-center gap-2"><FileCode size={13} className="text-accent" />Rebuild Prompt</h3>
                  <div className="flex items-center gap-2">
                    <select value={promptVariant} onChange={e => setPromptVariant(e.target.value)}
                      className="bg-surface border border-border rounded-md px-2 py-1 text-[11px] focus:border-accent focus:outline-none">
                      <option value="short">Short</option>
                      <option value="detailed">Detailed</option>
                      <option value="full">Full Spec</option>
                    </select>
                    <button onClick={generateRebuildPrompt} disabled={promptLoading}
                      className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-2.5 py-1.5 rounded-md text-[11px] font-medium">
                      {promptLoading ? <Loader2 size={11} className="animate-spin" /> : <Code size={11} />}
                      Generate
                    </button>
                  </div>
                </div>

                {rebuildPrompt && (
                  <div className="bg-elevated border border-border rounded-lg">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                      <span className="text-[11px] font-medium text-accent capitalize">{promptVariant} prompt</span>
                      <CopyBtn text={typeof rebuildPrompt === 'string' ? rebuildPrompt : rebuildPrompt.prompt || ''} label="prompt" copied={copied} onCopy={copyText} />
                    </div>
                    <pre className="p-4 text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono">
                      {typeof rebuildPrompt === 'string' ? rebuildPrompt : rebuildPrompt.prompt || ''}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, color = 'text-text-primary', small }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <Icon size={13} className={`${color} mb-1.5`} />
      <div className={`${small ? 'text-[13px]' : 'text-[16px]'} font-bold font-display leading-none ${color}`}>{value}</div>
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider mt-1">{label}</div>
    </div>
  )
}

function InfoCard({ label, value, color }) {
  const c = color === 'error' ? 'text-error' : color === 'accent' ? 'text-accent' : color === 'success' ? 'text-success' : 'text-text-primary'
  return (
    <div className="bg-surface border border-border rounded-md p-2.5">
      <span className="text-[9px] text-text-tertiary uppercase tracking-wider block">{label}</span>
      <span className={`text-[11px] font-medium mt-0.5 block truncate ${c}`}>{value}</span>
    </div>
  )
}

function ScoreBar({ label, value, max = 100 }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-text-tertiary w-24 shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error'}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-[11px] font-mono font-bold w-8 text-right ${scoreColor(value)}`}>{value}</span>
    </div>
  )
}

function OutreachBlock({ label, icon: Icon, text, copied, onCopy, multiline, muted }) {
  return (
    <div className={`${muted ? 'bg-elevated' : 'bg-surface'} border border-border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1"><Icon size={10} />{label}</span>
        <CopyBtn text={text} label={label} copied={copied} onCopy={onCopy} />
      </div>
      <div className={`text-[${multiline ? '12' : '13'}px] ${multiline ? 'text-text-secondary leading-relaxed whitespace-pre-line' : 'font-medium'}`}>{text}</div>
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

function safeArr(v) { try { return JSON.parse(v || '[]') } catch { return [] } }
function safeObj(v) { try { return JSON.parse(v || '{}') } catch { return {} } }
