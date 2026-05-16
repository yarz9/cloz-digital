import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, Search, Hash, FileText, Megaphone, BarChart3, Eye, FileBarChart,
  Sparkles, Loader2, MapPin, Globe, Target, Lightbulb, Copy, Check, Mail,
  ExternalLink, Send, AlertCircle, RefreshCw, ArrowRight,
} from 'lucide-react'
import { marketing } from '@/lib/api'
import { useStore } from '@/stores/management'
import { useUser, greetingForHour } from '@/contexts/UserContext'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  MARKETING — Growth & SEO Operating System
// ══════════════════════════════════════════════════════════════

const TABS = [
  { key: 'overview',    label: 'Overview',    icon: TrendingUp },
  { key: 'seo',         label: 'SEO',         icon: Search },
  { key: 'keywords',    label: 'Keywords',    icon: Hash },
  { key: 'content',     label: 'Content',     icon: FileText },
  { key: 'ads',         label: 'Ads',         icon: Megaphone },
  { key: 'local',       label: 'Local',       icon: MapPin },
  { key: 'competitors', label: 'Competitors', icon: Eye },
  { key: 'analytics',   label: 'Analytics',   icon: BarChart3 },
  { key: 'ai',          label: 'AI Insights', icon: Sparkles },
  { key: 'reports',     label: 'Reports',     icon: FileBarChart },
]

export default function Marketing() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="flex h-full overflow-hidden">
      {/* Vertical tab nav */}
      <div className="w-[200px] shrink-0 bg-surface border-r border-border overflow-y-auto p-3">
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.15em] mb-3 px-2">Marketing</div>
        <nav className="space-y-0.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium transition-colors ${
                tab === t.key
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`}>
              <t.icon size={13} className={tab === t.key ? 'text-accent' : 'text-text-tertiary'} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active tab */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview'    && <OverviewTab />}
        {tab === 'seo'         && <SEOTab />}
        {tab === 'keywords'    && <KeywordsTab />}
        {tab === 'content'     && <ContentTab />}
        {tab === 'ads'         && <AdsTab />}
        {tab === 'local'       && <LocalTab />}
        {tab === 'competitors' && <CompetitorsTab />}
        {tab === 'analytics'   && <AnalyticsTab />}
        {tab === 'ai'          && <AIInsightsTab />}
        {tab === 'reports'     && <ReportsTab />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: OVERVIEW (personalized welcome + AI briefing)
// ══════════════════════════════════════════════════════════════

function OverviewTab() {
  const { user } = useUser()
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const leads = useStore(s => s.leads)
  const deals = useStore(s => s.deals)
  const tasks = useStore(s => s.tasks)
  const activity = useStore(s => s.activity)

  const stats = useMemo(() => ({
    clients: clients.length,
    mrr: clients.reduce((s, c) => s + (c.mrr || 0), 0),
    openInvoices: invoices.filter(i => i.status !== 'paid').length,
    pipelineValue: deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0),
    leads: leads.length,
    openTasks: tasks.filter(t => t.status !== 'done').length,
  }), [clients, invoices, deals, leads, tasks])

  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runBriefing = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await marketing.dailyBriefing({
        operator: user?.id || 'team',
        context: {
          ...stats,
          recentActivity: activity.slice(0, 5).map(a => a.text).join('; '),
        },
      })
      setBriefing(result.text || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-accent-muted via-surface to-surface border border-accent/20 rounded-xl p-6">
        <div className="flex items-center gap-4">
          {user && (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-display font-bold text-white"
              style={{ background: user.color }}>
              {user.avatar}
            </div>
          )}
          <div>
            <h1 className="font-display font-bold text-[22px]">
              {greetingForHour()}{user ? `, ${user.name}` : ''}.
            </h1>
            <p className="text-[12px] text-text-secondary mt-1">
              {user?.title || 'Cloz Digital Operator'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {user && (
          <p className="text-[12px] text-text-tertiary mt-4 leading-relaxed">
            <strong className="text-text-secondary">Focus areas:</strong>{' '}
            {user.responsibilities.slice(0, 4).join(' · ')}
          </p>
        )}
      </div>

      {/* KPI snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Clients"      value={stats.clients} />
        <KPI label="MRR"          value={`${stats.mrr.toLocaleString()} BAM`} color="text-success" />
        <KPI label="Pipeline"     value={`${stats.pipelineValue.toLocaleString()} BAM`} color="text-accent" />
        <KPI label="Open Invoices"value={stats.openInvoices} color={stats.openInvoices > 0 ? 'text-warning' : 'text-success'} />
        <KPI label="Leads"        value={stats.leads} />
        <KPI label="Open Tasks"   value={stats.openTasks} color={stats.openTasks > 5 ? 'text-warning' : 'text-text-primary'} />
      </div>

      {/* Personalized AI brief */}
      <div className="bg-surface border border-accent/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={15} className="text-accent" />
          <h2 className="font-display font-semibold text-[15px]">
            {user ? `Your briefing, ${user.name}` : 'Daily Briefing'}
          </h2>
          <button onClick={runBriefing} disabled={loading}
            className="ml-auto text-[10px] text-text-tertiary hover:text-accent bg-elevated px-2 py-0.5 rounded flex items-center gap-1">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            {loading ? 'Generating…' : 'Refresh'}
          </button>
        </div>
        {loading && !briefing ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={14} className="animate-spin text-accent" />
            <span className="text-[12px] text-text-tertiary">Building your personalized briefing…</span>
          </div>
        ) : error ? (
          <div className="text-[12px] text-error py-2">{error}</div>
        ) : briefing ? (
          <FormattedText text={briefing} />
        ) : (
          <p className="text-[12px] text-text-tertiary">Click Refresh to generate a briefing.</p>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: SEO AUDIT
// ══════════════════════════════════════════════════════════════

function SEOTab() {
  const [url, setUrl] = useState('')
  const [context, setContext] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!url.trim()) return setError('Enter a URL')
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await marketing.seoAudit({ url: url.trim(), businessContext: context.trim() })
      setResult(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="SEO Audit" subtitle="AI-generated technical SEO action plan for any URL" />

      <div className="bg-surface border border-border rounded-lg p-5">
        <Field label="URL">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" type="url" />
        </Field>
        <div className="mt-3">
          <Field label="Business context (optional)">
            <Input value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. Dental clinic in Sarajevo, has Google Business Profile, no blog" />
          </Field>
        </div>
        <RunButton onClick={run} loading={loading}>Run SEO Audit</RunButton>
        {error && <ErrorBox message={error} />}
      </div>

      {result && (
        <div className="space-y-4">
          {result.executive_summary && (
            <Card title="Executive Summary"><p className="text-[13px] text-text-secondary leading-relaxed">{result.executive_summary}</p></Card>
          )}
          {result.priority_issues?.length > 0 && (
            <Card title={`Priority Issues (${result.priority_issues.length})`}>
              <div className="space-y-2">
                {result.priority_issues.map((iss, i) => (
                  <div key={i} className="flex items-start gap-3 bg-elevated p-3 rounded-md">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      iss.impact === 'critical' ? 'bg-error/15 text-error' :
                      iss.impact === 'high' ? 'bg-warning/15 text-warning' :
                      'bg-elevated text-text-tertiary'
                    }`}>{iss.impact}</span>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium">{iss.category}: {iss.issue}</div>
                      <div className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{iss.fix}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {result.quick_wins?.length > 0 && <BulletCard title="Quick Wins" items={result.quick_wins} color="text-success" />}
          {result.schema_recommendations?.length > 0 && <BulletCard title="Schema Recommendations" items={result.schema_recommendations} color="text-accent" />}
          {result.internal_linking_suggestions?.length > 0 && <BulletCard title="Internal Linking" items={result.internal_linking_suggestions} color="text-info" />}
          {result.content_gaps?.length > 0 && <BulletCard title="Content Gaps" items={result.content_gaps} color="text-warning" />}
          {result.next_30_days?.length > 0 && <BulletCard title="Next 30 Days" items={result.next_30_days} color="text-accent" />}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: KEYWORDS
// ══════════════════════════════════════════════════════════════

function KeywordsTab() {
  const [seed, setSeed] = useState('')
  const [market, setMarket] = useState('Bosnia and Herzegovina')
  const [language, setLanguage] = useState('English')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!seed.trim()) return setError('Enter a seed topic')
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await marketing.keywords({ seed: seed.trim(), market, language })
      setResult(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Keyword Research" subtitle="AI-clustered keywords with intent and opportunity scoring" />

      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Seed topic" className="md:col-span-1">
            <Input value={seed} onChange={e => setSeed(e.target.value)} placeholder="e.g. website redesign" />
          </Field>
          <Field label="Market">
            <Input value={market} onChange={e => setMarket(e.target.value)} />
          </Field>
          <Field label="Language">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent">
              <option>English</option><option>Bosnian</option><option>Croatian</option><option>Serbian</option>
            </select>
          </Field>
        </div>
        <RunButton onClick={run} loading={loading}>Generate Keyword Clusters</RunButton>
        {error && <ErrorBox message={error} />}
      </div>

      {result?.priority_recommendation && (
        <Card title="Priority Recommendation"><p className="text-[13px] text-text-secondary leading-relaxed">{result.priority_recommendation}</p></Card>
      )}

      {result?.clusters?.map((c, i) => (
        <div key={i} className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display font-semibold text-[14px]">{c.theme}</h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent-muted text-accent capitalize">{c.intent}</span>
            {c.recommended_content_type && <span className="text-[10px] text-text-tertiary">→ {c.recommended_content_type}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] text-text-tertiary uppercase tracking-wider border-b border-border">
                  <th className="py-2 pr-3">Keyword</th>
                  <th className="py-2 pr-3">Intent</th>
                  <th className="py-2 pr-3">Difficulty</th>
                  <th className="py-2 pr-3">Opportunity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.keywords?.map((k, j) => (
                  <tr key={j}>
                    <td className="py-2 pr-3 font-medium">{k.keyword}</td>
                    <td className="py-2 pr-3 text-text-tertiary">{k.intent || c.intent}</td>
                    <td className="py-2 pr-3"><Bar value={k.difficulty || 0} reverse /></td>
                    <td className="py-2 pr-3"><Bar value={k.opportunity_score || 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: CONTENT
// ══════════════════════════════════════════════════════════════

function ContentTab() {
  const [theme, setTheme] = useState('')
  const [topics, setTopics] = useState(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState('')

  const [briefTitle, setBriefTitle] = useState('')
  const [briefKeyword, setBriefKeyword] = useState('')
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState('')

  const generateTopics = async () => {
    if (!theme.trim()) return setTopicsError('Enter a theme')
    setTopicsLoading(true); setTopicsError(''); setTopics(null)
    try {
      const r = await marketing.blogTopics({ theme: theme.trim(), count: 10 })
      setTopics((r.data || r)?.topics || [])
    } catch (e) { setTopicsError(e.message) } finally { setTopicsLoading(false) }
  }

  const generateBrief = async () => {
    if (!briefTitle.trim()) return setBriefError('Enter a title')
    setBriefLoading(true); setBriefError(''); setBrief(null)
    try {
      const r = await marketing.contentBrief({ title: briefTitle.trim(), targetKeyword: briefKeyword.trim() })
      setBrief(r.data || r)
    } catch (e) { setBriefError(e.message) } finally { setBriefLoading(false) }
  }

  const useTopicForBrief = (topic) => {
    setBriefTitle(topic.title)
    setBriefKeyword(topic.target_keyword || '')
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Content Marketing" subtitle="Topic ideation, SEO briefs, and editorial planning" />

      {/* Topic generator */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="font-display font-semibold text-[14px] mb-3">Blog Topic Generator</h3>
        <Field label="Theme">
          <Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="e.g. local SEO for restaurants" />
        </Field>
        <RunButton onClick={generateTopics} loading={topicsLoading}>Generate 10 Topics</RunButton>
        {topicsError && <ErrorBox message={topicsError} />}

        {topics?.length > 0 && (
          <div className="mt-4 space-y-2">
            {topics.map((t, i) => (
              <div key={i} className="bg-elevated rounded-md p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium">{t.title}</span>
                    {t.estimated_traffic_value && (
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        t.estimated_traffic_value === 'high' ? 'bg-success/15 text-success' :
                        t.estimated_traffic_value === 'medium' ? 'bg-warning/15 text-warning' :
                        'bg-elevated text-text-tertiary'
                      }`}>{t.estimated_traffic_value}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">{t.angle}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-text-tertiary">
                    <Hash size={10} />
                    <span className="font-mono">{t.target_keyword}</span>
                  </div>
                </div>
                <button onClick={() => useTopicForBrief(t)}
                  className="shrink-0 text-[11px] text-accent hover:text-accent-hover font-medium flex items-center gap-1">
                  Brief <ArrowRight size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content brief */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="font-display font-semibold text-[14px] mb-3">SEO Content Brief</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Title"><Input value={briefTitle} onChange={e => setBriefTitle(e.target.value)} placeholder="Article title" /></Field>
          <Field label="Target keyword"><Input value={briefKeyword} onChange={e => setBriefKeyword(e.target.value)} placeholder="(optional)" /></Field>
        </div>
        <RunButton onClick={generateBrief} loading={briefLoading}>Build SEO Brief</RunButton>
        {briefError && <ErrorBox message={briefError} />}

        {brief && (
          <div className="mt-5 space-y-3">
            <MetaPreview meta_title={brief.meta_title} meta_description={brief.meta_description} />
            {brief.outline?.length > 0 && (
              <Card title="Outline" inner>
                <div className="space-y-2">
                  {brief.outline.map((s, i) => (
                    <div key={i}>
                      <div className={`text-[13px] font-medium ${s.level === 'h3' ? 'pl-4 text-text-secondary' : ''}`}>{s.heading}</div>
                      {s.bullets?.length > 0 && (
                        <ul className="mt-1 pl-6 space-y-0.5">
                          {s.bullets.map((b, j) => <li key={j} className="text-[11px] text-text-tertiary list-disc">{b}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {brief.faq_section?.length > 0 && (
              <Card title="FAQ Schema Items" inner>
                <div className="space-y-2">
                  {brief.faq_section.map((f, i) => (
                    <div key={i} className="text-[12px]">
                      <div className="font-medium text-text-primary">Q: {f.question}</div>
                      <div className="text-text-secondary mt-0.5 leading-relaxed">A: {f.answer}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {brief.internal_link_suggestions?.length > 0 && <BulletCard title="Internal Links" items={brief.internal_link_suggestions} inner />}
            {brief.cta_strategy && (
              <Card title="CTA Strategy" inner><p className="text-[12px] text-text-secondary leading-relaxed">{brief.cta_strategy}</p></Card>
            )}
            {brief.target_word_count && (
              <div className="text-[11px] text-text-tertiary">Target word count: <strong>{brief.target_word_count}</strong></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: ADS (Google + Meta)
// ══════════════════════════════════════════════════════════════

function AdsTab() {
  const [platform, setPlatform] = useState('google')

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Paid Advertising" subtitle="Build complete Google Ads and Meta campaigns with AI" />

      <div className="flex gap-1 bg-elevated rounded-md p-0.5 w-fit">
        <button onClick={() => setPlatform('google')}
          className={`px-4 py-1.5 rounded text-[11px] font-medium transition-colors ${platform === 'google' ? 'bg-bg text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
          Google Ads
        </button>
        <button onClick={() => setPlatform('meta')}
          className={`px-4 py-1.5 rounded text-[11px] font-medium transition-colors ${platform === 'meta' ? 'bg-bg text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
          Meta Ads
        </button>
      </div>

      {platform === 'google' && <GoogleAdsBuilder />}
      {platform === 'meta' && <MetaAdsBuilder />}
    </div>
  )
}

function GoogleAdsBuilder() {
  const [service, setService] = useState('Launch Care website builds')
  const [location, setLocation] = useState('Sarajevo, Bosnia')
  const [budget, setBudget] = useState(300)
  const [language, setLanguage] = useState('English')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await marketing.googleAds({ service, location, budget, language })
      setResult(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Service / Offer"><Input value={service} onChange={e => setService(e.target.value)} /></Field>
          <Field label="Location"><Input value={location} onChange={e => setLocation(e.target.value)} /></Field>
          <Field label="Monthly Budget (EUR)"><Input type="number" value={budget} onChange={e => setBudget(parseInt(e.target.value) || 0)} /></Field>
          <Field label="Ad Language">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent">
              <option>English</option><option>Bosnian</option><option>Both</option>
            </select>
          </Field>
        </div>
        <RunButton onClick={run} loading={loading}>Build Google Ads Campaign</RunButton>
        {error && <ErrorBox message={error} />}
      </div>

      {result && (
        <div className="space-y-4">
          <Card title="Campaign Setup">
            <div className="grid md:grid-cols-3 gap-3 text-[12px]">
              <Meta label="Name" value={result.campaign_name} />
              <Meta label="Objective" value={result.objective} />
              <Meta label="Budget" value={result.recommended_budget} />
            </div>
          </Card>

          {result.ad_groups?.map((ag, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display font-semibold text-[14px]">{ag.name}</h3>
                {ag.theme && <span className="text-[11px] text-text-tertiary">— {ag.theme}</span>}
                {ag.landing_page && (
                  <span className="ml-auto text-[10px] text-accent flex items-center gap-1">
                    <ExternalLink size={10} />{ag.landing_page}
                  </span>
                )}
              </div>

              {ag.keywords?.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {ag.keywords.map((k, j) => (
                      <span key={j} className={`text-[10px] px-2 py-0.5 rounded ${
                        k.match_type === 'exact' ? 'bg-success/10 text-success' :
                        k.match_type === 'phrase' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
                      }`}>
                        {k.match_type === 'exact' && '['}{k.match_type === 'phrase' && '"'}{k.keyword}{k.match_type === 'exact' && ']'}{k.match_type === 'phrase' && '"'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ag.negative_keywords?.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">Negatives</div>
                  <div className="flex flex-wrap gap-1">
                    {ag.negative_keywords.map((k, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-error/10 text-error">−{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {ag.responsive_search_ad && (
                <div className="bg-elevated rounded-md p-3 mt-3">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Responsive Search Ad</div>
                  {ag.responsive_search_ad.headlines?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] text-text-tertiary mb-1">{ag.responsive_search_ad.headlines.length} headlines</div>
                      <ul className="space-y-0.5">
                        {ag.responsive_search_ad.headlines.map((h, j) => <li key={j} className="text-[11px] text-text-primary">{j + 1}. {h}</li>)}
                      </ul>
                    </div>
                  )}
                  {ag.responsive_search_ad.descriptions?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-tertiary mb-1">{ag.responsive_search_ad.descriptions.length} descriptions</div>
                      <ul className="space-y-0.5">
                        {ag.responsive_search_ad.descriptions.map((d, j) => <li key={j} className="text-[11px] text-text-secondary leading-relaxed">{j + 1}. {d}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {result.landing_page_recommendations?.length > 0 && <BulletCard title="Landing Page Recommendations" items={result.landing_page_recommendations} />}
          {result.tracking_setup?.length > 0 && <BulletCard title="Tracking Setup" items={result.tracking_setup} />}
        </div>
      )}
    </>
  )
}

function MetaAdsBuilder() {
  const [offer, setOffer] = useState('Free website audit for restaurants')
  const [audience, setAudience] = useState('restaurant owners in Bosnia')
  const [budget, setBudget] = useState(200)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await marketing.metaAds({ offer, audience, budget })
      setResult(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Offer"><Input value={offer} onChange={e => setOffer(e.target.value)} /></Field>
          <Field label="Audience focus"><Input value={audience} onChange={e => setAudience(e.target.value)} /></Field>
          <Field label="Monthly Budget (EUR)"><Input type="number" value={budget} onChange={e => setBudget(parseInt(e.target.value) || 0)} /></Field>
        </div>
        <RunButton onClick={run} loading={loading}>Build Meta Ads Campaign</RunButton>
        {error && <ErrorBox message={error} />}
      </div>

      {result && (
        <div className="space-y-4">
          <Card title="Campaign Setup">
            <div className="grid md:grid-cols-3 gap-3 text-[12px]">
              <Meta label="Name" value={result.campaign_name} />
              <Meta label="Objective" value={result.objective} />
              <Meta label="Budget" value={result.recommended_budget} />
            </div>
            {result.budget_allocation && <p className="text-[11px] text-text-tertiary mt-3 leading-relaxed">{result.budget_allocation}</p>}
          </Card>

          {result.audiences?.length > 0 && (
            <Card title="Audiences">
              <div className="space-y-3">
                {result.audiences.map((a, i) => (
                  <div key={i} className="bg-elevated rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-medium">{a.name}</span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-muted text-accent">{a.type}</span>
                      {a.estimated_size && <span className="ml-auto text-[10px] text-text-tertiary">~{a.estimated_size}</span>}
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{a.targeting}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.ad_variants?.map((v, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display font-semibold text-[13px]">{v.variant_name}</h3>
                <span className="text-[10px] text-text-tertiary">— {v.hook}</span>
              </div>
              <div className="bg-elevated rounded-md p-3 mb-3">
                <p className="text-[12px] text-text-secondary leading-relaxed">{v.primary_text}</p>
                <p className="text-[13px] font-semibold mt-2">{v.headline}</p>
                <p className="text-[11px] text-text-tertiary">{v.description}</p>
                <button className="mt-2 bg-accent text-white text-[11px] font-medium px-3 py-1 rounded pointer-events-none">{v.cta_button}</button>
              </div>
              {v.creative_direction && <p className="text-[11px] text-text-tertiary leading-relaxed"><strong>Creative:</strong> {v.creative_direction}</p>}
            </div>
          ))}

          {result.creative_recommendations?.length > 0 && <BulletCard title="Creative Recommendations" items={result.creative_recommendations} />}
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: LOCAL SEO
// ══════════════════════════════════════════════════════════════

function LocalTab() {
  const [businessName, setBusinessName] = useState('Cloz Digital')
  const [city, setCity] = useState('Sarajevo')
  const [category, setCategory] = useState('web design agency')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await marketing.localSEO({ businessName, city, category })
      setResult(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Local SEO" subtitle="Google Business Profile, citations, reviews, and local keywords" />

      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Business Name"><Input value={businessName} onChange={e => setBusinessName(e.target.value)} /></Field>
          <Field label="City"><Input value={city} onChange={e => setCity(e.target.value)} /></Field>
          <Field label="Category"><Input value={category} onChange={e => setCategory(e.target.value)} /></Field>
        </div>
        <RunButton onClick={run} loading={loading}>Generate Local SEO Plan</RunButton>
        {error && <ErrorBox message={error} />}
      </div>

      {result && (
        <div className="space-y-4">
          {result.gbp_checklist?.length > 0 && (
            <Card title="Google Business Profile Checklist">
              <div className="space-y-2">
                {result.gbp_checklist.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 bg-elevated p-2.5 rounded-md">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      c.priority === 'critical' ? 'bg-error/15 text-error' :
                      c.priority === 'high' ? 'bg-warning/15 text-warning' :
                      c.priority === 'medium' ? 'bg-info/10 text-info' :
                      'bg-elevated text-text-tertiary'
                    }`}>{c.priority}</span>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium">{c.item}</div>
                      {c.why_it_matters && <div className="text-[11px] text-text-tertiary mt-0.5">{c.why_it_matters}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.local_keywords?.length > 0 && (
            <Card title={`Local Keywords (${result.local_keywords.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {result.local_keywords.map((k, i) => (
                  <span key={i} className="text-[11px] bg-elevated px-2 py-0.5 rounded">{k}</span>
                ))}
              </div>
            </Card>
          )}

          {result.citation_targets?.length > 0 && <BulletCard title="Citation Targets" items={result.citation_targets} />}
          {result.review_acquisition_plan?.length > 0 && <BulletCard title="Review Acquisition Plan" items={result.review_acquisition_plan} color="text-success" />}

          {result.review_response_templates?.length > 0 && (
            <Card title="Review Response Templates">
              <div className="space-y-3">
                {result.review_response_templates.map((t, i) => (
                  <div key={i} className="bg-elevated p-3 rounded-md">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{t.scenario}</div>
                    <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">{t.template}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.nap_consistency_notes && (
            <Card title="NAP Consistency"><p className="text-[12px] text-text-secondary leading-relaxed">{result.nap_consistency_notes}</p></Card>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: COMPETITORS
// ══════════════════════════════════════════════════════════════

function CompetitorsTab() {
  const competitorsFromStore = useStore(s => s.competitors)
  const [input, setInput] = useState('')
  const [position, setPosition] = useState('Premium web design + ongoing care for Balkan businesses')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from saved competitors
  useEffect(() => {
    if (competitorsFromStore.length > 0 && !input) {
      setInput(competitorsFromStore.map(c => c.name).join(', '))
    }
  }, [competitorsFromStore]) // eslint-disable-line

  const run = async () => {
    const competitors = input.split(',').map(s => s.trim()).filter(Boolean)
    if (competitors.length === 0) return setError('Enter at least one competitor')
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await marketing.competitorAnalysis({ competitors, ourPosition: position })
      setResult(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Competitor Intelligence" subtitle="Gap analysis and differentiation opportunities" />

      <div className="bg-surface border border-border rounded-lg p-5">
        <Field label="Competitors (comma-separated)">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="WebPro, Digital Wave, CreativeHub" />
        </Field>
        <div className="mt-3">
          <Field label="Our positioning">
            <Input value={position} onChange={e => setPosition(e.target.value)} />
          </Field>
        </div>
        <RunButton onClick={run} loading={loading}>Analyze Competitors</RunButton>
        {error && <ErrorBox message={error} />}
      </div>

      {result && (
        <div className="space-y-4">
          {result.market_overview && <Card title="Market Overview"><p className="text-[13px] text-text-secondary leading-relaxed">{result.market_overview}</p></Card>}

          {result.competitors_analysis?.map((c, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-5">
              <h3 className="font-display font-semibold text-[14px] mb-2">{c.name}</h3>
              {c.positioning && <p className="text-[11px] text-text-tertiary mb-3 italic">{c.positioning}</p>}
              <div className="grid md:grid-cols-2 gap-4">
                {c.strengths?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-success uppercase tracking-wider font-medium mb-1.5">Strengths</div>
                    <ul className="space-y-1">
                      {c.strengths.map((s, j) => <li key={j} className="text-[12px] text-text-secondary flex items-start gap-1.5"><span className="text-success">+</span>{s}</li>)}
                    </ul>
                  </div>
                )}
                {c.weaknesses?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-error uppercase tracking-wider font-medium mb-1.5">Weaknesses</div>
                    <ul className="space-y-1">
                      {c.weaknesses.map((s, j) => <li key={j} className="text-[12px] text-text-secondary flex items-start gap-1.5"><span className="text-error">−</span>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {result.content_gaps?.length > 0 && <BulletCard title="Content Gaps" items={result.content_gaps} color="text-warning" />}
          {result.keyword_gaps?.length > 0 && <BulletCard title="Keyword Gaps" items={result.keyword_gaps} color="text-warning" />}
          {result.differentiation_opportunities?.length > 0 && <BulletCard title="Differentiation Opportunities" items={result.differentiation_opportunities} color="text-accent" />}
          {result.recommended_actions?.length > 0 && <BulletCard title="Recommended Actions" items={result.recommended_actions} color="text-success" />}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: ANALYTICS (integration placeholders)
// ══════════════════════════════════════════════════════════════

function AnalyticsTab() {
  const integrations = [
    { name: 'Google Analytics 4',     id: 'ga4',     desc: 'Traffic, sessions, conversions, events',           env: 'GA4_MEASUREMENT_ID + service account',   icon: BarChart3 },
    { name: 'Google Search Console',  id: 'gsc',     desc: 'Queries, impressions, clicks, position, indexing', env: 'GSC OAuth credentials',                  icon: Search },
    { name: 'Microsoft Clarity',      id: 'clarity', desc: 'Heatmaps and session recordings',                  env: 'CLARITY_PROJECT_ID (frontend script)',   icon: Eye },
    { name: 'Bing Webmaster Tools',   id: 'bwt',     desc: 'Bing rankings and crawl health',                   env: 'BWT API key',                            icon: Globe },
    { name: 'Google Ads',             id: 'gads',    desc: 'Spend, CTR, CPA, ROAS',                            env: 'Google Ads API credentials',             icon: Megaphone },
    { name: 'Meta Ads',               id: 'meta',    desc: 'Spend, results, audiences',                        env: 'Meta Graph API token',                   icon: Megaphone },
  ]

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Analytics & Attribution" subtitle="Connect external data sources to unlock full attribution" />

      <div className="bg-info/5 border border-info/20 rounded-lg p-4 text-[12px] text-info">
        <strong>Integration status:</strong> All analytics integrations require OAuth or API credentials configured via environment variables and provider-side consent. Once configured, this tab will surface live metrics. The Cloz Digital deployment ships configured for AI-powered analysis; live integrations are opt-in.
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {integrations.map(int => (
          <div key={int.id} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                <int.icon size={16} className="text-text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{int.name}</span>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-elevated text-text-tertiary">Not connected</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">{int.desc}</p>
                <p className="text-[10px] text-text-tertiary mt-2 font-mono">{int.env}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="font-display font-semibold text-[14px] mb-3">In the meantime</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-4">
          While external integrations are being configured, every other Marketing tab continues to work as an AI-powered planning, ideation, and analysis engine. The Reports tab can produce executive reports from the live business data already tracked in your CRM, Inquiries, and Logs.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-elevated hover:bg-raised px-3 py-1.5 rounded-md text-[11px] text-text-secondary">
            Open GA4 <ExternalLink size={10} />
          </a>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-elevated hover:bg-raised px-3 py-1.5 rounded-md text-[11px] text-text-secondary">
            Search Console <ExternalLink size={10} />
          </a>
          <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-elevated hover:bg-raised px-3 py-1.5 rounded-md text-[11px] text-text-secondary">
            Microsoft Clarity <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: AI INSIGHTS
// ══════════════════════════════════════════════════════════════

function AIInsightsTab() {
  const clients = useStore(s => s.clients)
  const leads = useStore(s => s.leads)
  const deals = useStore(s => s.deals)
  const ctx = useMemo(() => ({
    clients: clients.length,
    leads: leads.length,
    activeDeals: deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length,
    mrr: clients.reduce((s, c) => s + (c.mrr || 0), 0),
  }), [clients, leads, deals])

  const KINDS = [
    { key: 'opportunities',  label: 'Growth Opportunities',  icon: TrendingUp, color: 'text-success' },
    { key: 'seo_priorities', label: 'SEO Priorities',        icon: Search,     color: 'text-accent' },
    { key: 'content_plan',   label: '4-Week Content Plan',   icon: FileText,   color: 'text-info' },
    { key: 'campaign_ideas', label: 'Campaign Ideas',        icon: Megaphone,  color: 'text-warning' },
    { key: 'forecasting',    label: '90-Day Forecast',       icon: TrendingUp, color: 'text-accent' },
    { key: 'trends',         label: 'Industry Trends',       icon: Lightbulb,  color: 'text-info' },
  ]

  const [active, setActive] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async (kind) => {
    setActive(kind)
    setLoading(true); setError(''); setResult('')
    try {
      const r = await marketing.insights({ kind, context: ctx })
      setResult(r.text || '')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="AI Marketing Insights" subtitle="On-demand strategic analyses powered by your live business data" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {KINDS.map(k => (
          <button key={k.key} onClick={() => run(k.key)} disabled={loading}
            className={`bg-surface border rounded-lg p-4 text-left transition-colors hover:border-accent/30 ${
              active === k.key ? 'border-accent' : 'border-border'
            } disabled:opacity-50`}>
            <k.icon size={18} className={k.color} />
            <span className="text-[13px] font-medium block mt-2">{k.label}</span>
            <span className="text-[10px] text-text-tertiary mt-1 block">
              {active === k.key && loading ? 'Generating…' : 'Click to generate'}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 min-h-[300px]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={15} className="text-accent" />
          <h3 className="font-display font-semibold text-[15px]">
            {active ? KINDS.find(k => k.key === active)?.label : 'Select an insight type'}
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-12 justify-center">
            <Loader2 size={16} className="animate-spin text-accent" />
            <span className="text-[13px] text-text-tertiary">Generating strategic analysis…</span>
          </div>
        ) : error ? (
          <div className="text-[13px] text-error py-4">{error}</div>
        ) : result ? (
          <FormattedText text={result} />
        ) : (
          <p className="text-[13px] text-text-tertiary text-center py-12">Select a category above to generate insights.</p>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: REPORTS
// ══════════════════════════════════════════════════════════════

function ReportsTab() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const leads = useStore(s => s.leads)
  const deals = useStore(s => s.deals)
  const proposals = useStore(s => s.proposals)

  const ctx = useMemo(() => ({
    clients: clients.length,
    mrr: clients.reduce((s, c) => s + (c.mrr || 0), 0),
    revenue_ytd: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0),
    leads_total: leads.length,
    hot_leads: leads.filter(l => (l.score || 0) >= 80).length,
    active_deals: deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length,
    pipeline_value: deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0),
    proposals_sent: proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length,
  }), [clients, invoices, leads, deals, proposals])

  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState({})
  const [error, setError] = useState({})

  const run = async (period) => {
    setLoading(l => ({ ...l, [period]: true }))
    setError(e => ({ ...e, [period]: '' }))
    try {
      const r = await marketing.report({ period, context: ctx })
      setReports(rs => ({ ...rs, [period]: { text: r.text, generatedAt: new Date().toISOString() } }))
    } catch (e) {
      setError(es => ({ ...es, [period]: e.message }))
    } finally {
      setLoading(l => ({ ...l, [period]: false }))
    }
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <Header title="Marketing Reports" subtitle="Executive-ready reports generated from your live business data" />

      <div className="grid md:grid-cols-2 gap-3">
        {['weekly', 'monthly'].map(period => (
          <div key={period} className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-[14px] capitalize">{period} Report</h3>
              <button onClick={() => run(period)} disabled={loading[period]}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-[11px] font-medium">
                {loading[period] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {loading[period] ? 'Generating…' : reports[period] ? 'Regenerate' : 'Generate'}
              </button>
            </div>
            <p className="text-[11px] text-text-tertiary">
              {reports[period] ? `Generated ${new Date(reports[period].generatedAt).toLocaleString()}` : 'Not yet generated'}
            </p>
            {error[period] && <div className="mt-2 text-[11px] text-error">{error[period]}</div>}
          </div>
        ))}
      </div>

      {Object.entries(reports).map(([period, r]) => (
        <div key={period} className="bg-surface border border-border rounded-lg p-5">
          <h3 className="font-display font-semibold text-[15px] mb-3 capitalize">{period} Report</h3>
          <FormattedText text={r.text} />
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

function Header({ title, subtitle }) {
  return (
    <div>
      <h1 className="font-display font-bold text-[22px]">{title}</h1>
      <p className="text-[12px] text-text-secondary mt-1">{subtitle}</p>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ type = 'text', ...props }) {
  return (
    <input type={type} {...props}
      className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent" />
  )
}

function RunButton({ onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="mt-4 flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
      {loading ? <><Loader2 size={12} className="animate-spin" />Working…</> : <><Sparkles size={12} />{children}</>}
    </button>
  )
}

function ErrorBox({ message }) {
  return (
    <div className="mt-3 bg-error/5 border border-error/20 rounded-md px-3 py-2 text-[11px] text-error flex items-center gap-2">
      <AlertCircle size={12} />{message}
    </div>
  )
}

function Card({ title, children, inner }) {
  return (
    <div className={inner ? 'bg-elevated rounded-md p-4' : 'bg-surface border border-border rounded-lg p-5'}>
      <h3 className="font-display font-semibold text-[13px] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function BulletCard({ title, items, color = 'text-accent', inner }) {
  return (
    <Card title={title} inner={inner}>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[12px] text-text-secondary flex items-start gap-2 leading-relaxed">
            <span className={`${color} shrink-0`}>•</span><span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[12px] text-text-primary font-medium">{value || '—'}</div>
    </div>
  )
}

function KPI({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-[18px] font-display font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}

function Bar({ value = 0, reverse = false }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = reverse
    ? (pct >= 70 ? 'bg-error' : pct >= 40 ? 'bg-warning' : 'bg-success')
    : (pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error')
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-elevated rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-text-tertiary">{pct}</span>
    </div>
  )
}

function MetaPreview({ meta_title, meta_description }) {
  return (
    <div className="bg-elevated rounded-md p-3">
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">SERP Preview</div>
      <div className="text-[14px] text-accent leading-tight truncate">{meta_title}</div>
      <div className="text-[11px] text-success mt-0.5">cloz.digital</div>
      <div className="text-[11px] text-text-secondary mt-1 leading-relaxed">{meta_description}</div>
      <div className="flex gap-4 mt-2 text-[10px] text-text-tertiary">
        <span>Title: {meta_title?.length || 0}/60</span>
        <span>Desc: {meta_description?.length || 0}/160</span>
      </div>
    </div>
  )
}

function FormattedText({ text }) {
  if (!text) return null
  return (
    <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
      {text.split('\n').map((line, i) => {
        if (/^[A-Z][A-Z\s&\d]+:?$/.test(line.trim()) && line.length < 60) {
          return <p key={i} className="font-semibold text-text-primary mt-3 mb-1.5 text-[11px] uppercase tracking-wider">{line}</p>
        }
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g)
          return <p key={i} className="mb-1.5">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{p}</strong> : p)}</p>
        }
        return line ? <p key={i} className="mb-1">{line}</p> : <br key={i} />
      })}
    </div>
  )
}
