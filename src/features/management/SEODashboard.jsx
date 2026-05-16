import { useState, useMemo } from 'react'
import { Compass, Sparkles, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  SEO DASHBOARD — Sites pulled from real client records
//  Manual SEO score field on the client lets the agency record
//  audit results. AI provides recommendations on demand.
// ══════════════════════════════════════════════════════════════

export default function SEODashboard() {
  const clients = useStore(s => s.clients)
  const updateClient = useStore(s => s.updateClient)
  const [selected, setSelected] = useState(null)
  const seoAnalysis = useAI(ai.generate)

  const sites = useMemo(() => clients
    .filter(c => c.website)
    .map(c => ({
      id: c.id,
      client: c.name,
      domain: c.website,
      score: c.seoScore ?? null,
      speed: c.speedScore ?? null,
      mobile: c.mobileScore ?? null,
      ssl: !!c.sslExpiry,
      issues: c.seoIssues || [],
    })), [clients])

  const analyze = (site) => {
    setSelected(site.id)
    seoAnalysis.run(
      `Provide an SEO analysis and recommendations for "${site.client}" (${site.domain}). Current recorded scores: ${site.score != null ? `SEO ${site.score}/100` : 'no SEO score recorded'}, ${site.speed != null ? `speed ${site.speed}/100` : 'no speed score'}, SSL: ${site.ssl ? 'present' : 'absent'}. Known issues: ${site.issues.length > 0 ? site.issues.join(', ') : 'None recorded'}. Provide: 1) Priority fixes 2) Quick wins 3) Long-term strategy 4) Expected impact on rankings. Be specific and actionable.`,
      0.6
    )
  }

  const sitesWithScore = sites.filter(s => s.score != null)
  const avgScore = sitesWithScore.length ? Math.round(sitesWithScore.reduce((a, s) => a + s.score, 0) / sitesWithScore.length) : null
  const issueCount = sites.reduce((a, s) => a + s.issues.length, 0)
  const sslCoverage = sites.length ? Math.round((sites.filter(s => s.ssl).length / sites.length) * 100) : 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">SEO Dashboard</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Search engine optimization monitoring with AI recommendations</p>
      </div>

      {sites.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Compass}
            title="No client websites tracked"
            description="Add a client with a website URL to start tracking SEO health. Record audit scores manually and request AI recommendations per site."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Avg SEO Score',  value: avgScore != null ? avgScore : '—', color: avgScore == null ? 'text-text-tertiary' : avgScore >= 75 ? 'text-success' : 'text-warning' },
              { label: 'Sites Monitored',value: sites.length,                       color: 'text-accent' },
              { label: 'Issues Recorded',value: issueCount,                         color: issueCount === 0 ? 'text-success' : 'text-warning' },
              { label: 'SSL Coverage',   value: `${sslCoverage}%`,                  color: 'text-success' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
                <span className="text-[11px] text-text-tertiary">{s.label}</span>
                <div className={`text-[22px] font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-2">
              {sites.map(site => (
                <div key={site.id} onClick={() => analyze(site)}
                  className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                    selected === site.id ? 'border-accent' : 'border-border hover:border-border-strong'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold font-mono shrink-0 ${
                      site.score == null ? 'bg-elevated text-text-tertiary' :
                      site.score >= 80 ? 'bg-success/15 text-success' :
                      site.score >= 60 ? 'bg-warning/15 text-warning' : 'bg-error/15 text-error'
                    }`}>
                      {site.score ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium truncate block">{site.client}</span>
                      <div className="text-[11px] text-text-tertiary mt-0.5 font-mono truncate">{site.domain}</div>
                    </div>
                    {(site.speed != null || site.mobile != null) && (
                      <div className="text-right space-y-0.5 shrink-0">
                        {site.speed != null && <div className="text-[10px] text-text-tertiary">Speed: <span className={site.speed >= 80 ? 'text-success' : site.speed >= 50 ? 'text-warning' : 'text-error'}>{site.speed}</span></div>}
                        {site.mobile != null && <div className="text-[10px] text-text-tertiary">Mobile: <span className={site.mobile >= 80 ? 'text-success' : 'text-warning'}>{site.mobile}</span></div>}
                      </div>
                    )}
                  </div>
                  {site.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {site.issues.slice(0, 3).map((issue, i) => (
                        <span key={i} className="text-[9px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">{issue}</span>
                      ))}
                      {site.issues.length > 3 && <span className="text-[9px] text-text-tertiary">+{site.issues.length - 3} more</span>}
                    </div>
                  )}
                  {site.score == null && (
                    <div className="text-[10px] text-text-tertiary mt-2">No audit recorded. Click to request AI guidance.</div>
                  )}
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-accent" /> SEO Analysis
              </h2>
              {seoAnalysis.loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-[12px] text-text-tertiary">Analyzing SEO…</span>
                </div>
              ) : seoAnalysis.error ? (
                <div className="text-[12px] text-error">{seoAnalysis.error}</div>
              ) : seoAnalysis.data?.text ? (
                <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
                  {seoAnalysis.data.text.split('\n').map((line, i) => {
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.*?)\*\*/g)
                      return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                    }
                    return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-text-tertiary py-8 text-center">Click a site to run AI SEO analysis</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
