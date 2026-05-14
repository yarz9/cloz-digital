import { Compass, TrendingUp, Search, Globe, AlertTriangle, Sparkles, Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const clientSites = [
  { client: 'Peak Athletics', domain: 'peakathletics.com', score: 78, speed: 82, mobile: 'Yes', ssl: true, issues: ['Missing meta descriptions on 3 pages', 'No sitemap.xml'] },
  { client: 'Brava Interiors', domain: 'bravainteriors.ba', score: 85, speed: 91, mobile: 'Yes', ssl: true, issues: ['Images not optimized'] },
  { client: 'Harmony Yoga', domain: 'harmonyyoga.ba', score: 62, speed: 45, mobile: 'Partial', ssl: true, issues: ['Slow page load', 'Missing alt tags', 'No structured data', 'Thin content on 5 pages'] },
  { client: 'Stari Grad Restaurant', domain: 'starigradrestaurant.ba', score: 71, speed: 67, mobile: 'Yes', ssl: true, issues: ['Missing h1 tags', 'Duplicate title tags'] },
  { client: 'Zenith Consulting', domain: 'zenithconsulting.ba', score: 88, speed: 94, mobile: 'Yes', ssl: true, issues: [] },
  { client: 'Zen Café', domain: 'zencafe.ba', score: 54, speed: 38, mobile: 'No', ssl: false, issues: ['No SSL', 'Not mobile responsive', 'Missing meta tags', 'No schema markup', 'Broken internal links'] },
]

export default function SEODashboard() {
  const [selected, setSelected] = useState(null)
  const seoAnalysis = useAI(ai.generate)

  const analyze = (site) => {
    setSelected(site.domain)
    seoAnalysis.run(
      `Provide an SEO analysis and recommendations for "${site.client}" (${site.domain}). Current metrics: SEO score ${site.score}/100, page speed ${site.speed}/100, mobile responsive: ${site.mobile}, SSL: ${site.ssl}. Known issues: ${site.issues.length > 0 ? site.issues.join(', ') : 'None'}. Provide: 1) Priority fixes 2) Quick wins 3) Long-term strategy 4) Expected impact on rankings. Be specific and actionable.`,
      0.6
    )
  }

  const avgScore = Math.round(clientSites.reduce((a, s) => a + s.score, 0) / clientSites.length)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">SEO Dashboard</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Search engine optimization monitoring with AI recommendations</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Avg SEO Score', value: avgScore, color: avgScore >= 75 ? 'text-success' : 'text-warning' },
          { label: 'Sites Monitored', value: clientSites.length, color: 'text-accent' },
          { label: 'Issues Found', value: clientSites.reduce((a, s) => a + s.issues.length, 0), color: 'text-warning' },
          { label: 'SSL Coverage', value: `${Math.round((clientSites.filter(s => s.ssl).length / clientSites.length) * 100)}%`, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <span className="text-[11px] text-text-tertiary">{s.label}</span>
            <div className={`text-[22px] font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-2">
          {clientSites.map(site => (
            <div
              key={site.domain}
              onClick={() => analyze(site)}
              className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                selected === site.domain ? 'border-accent' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold font-mono ${
                  site.score >= 80 ? 'bg-success/15 text-success' : site.score >= 60 ? 'bg-warning/15 text-warning' : 'bg-error/15 text-error'
                }`}>
                  {site.score}
                </div>
                <div className="flex-1">
                  <span className="text-[13px] font-medium">{site.client}</span>
                  <div className="text-[11px] text-text-tertiary mt-0.5 font-mono">{site.domain}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-text-tertiary">Speed: <span className={site.speed >= 80 ? 'text-success' : site.speed >= 50 ? 'text-warning' : 'text-error'}>{site.speed}</span></div>
                  <div className="text-[10px] text-text-tertiary">Mobile: <span className={site.mobile === 'Yes' ? 'text-success' : 'text-error'}>{site.mobile}</span></div>
                </div>
              </div>
              {site.issues.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {site.issues.slice(0, 3).map(issue => (
                    <span key={issue} className="text-[9px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">{issue}</span>
                  ))}
                  {site.issues.length > 3 && <span className="text-[9px] text-text-tertiary">+{site.issues.length - 3} more</span>}
                </div>
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
              <span className="text-[12px] text-text-tertiary">Analyzing SEO...</span>
            </div>
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
    </div>
  )
}
