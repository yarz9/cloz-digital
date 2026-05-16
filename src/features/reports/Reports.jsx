import { useState } from 'react'
import { FileBarChart, Loader2, Sparkles, X } from 'lucide-react'
import { ai } from '@/lib/api'
import { useStore } from '@/stores/management'

// ══════════════════════════════════════════════════════════════
//  REPORTS — On-demand AI reports built from live store data
// ══════════════════════════════════════════════════════════════

const REPORTS = [
  { key: 'growth',      name: 'Weekly Growth Review',  type: 'weekly',  description: 'Lead movement, proposals, wins/losses, and recommendations' },
  { key: 'revenue',     name: 'Monthly Revenue Report',type: 'monthly', description: 'Revenue breakdown by client, package, and service type' },
  { key: 'health',      name: 'Client Health Summary', type: 'monthly', description: 'Health scores, at-risk clients, upsell opportunities' },
  { key: 'pipeline',    name: 'Pipeline Analysis',     type: 'weekly',  description: 'Pipeline value, conversion rates, stage durations' },
  { key: 'maintenance', name: 'Maintenance Activity',  type: 'monthly', description: 'All maintenance work performed across clients' },
  { key: 'outreach',    name: 'Outreach Performance',  type: 'weekly',  description: 'Send rates, reply rates, and sequence performance' },
]

export default function Reports() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const leads = useStore(s => s.leads)
  const deals = useStore(s => s.deals)
  const proposals = useStore(s => s.proposals)
  const sequences = useStore(s => s.sequences)

  const [generated, setGenerated] = useState({}) // { key: { text, generatedAt } }
  const [loading, setLoading] = useState(null)   // key currently generating
  const [error, setError] = useState({})
  const [preview, setPreview] = useState(null)   // open report key

  const buildPrompt = (key) => {
    const date = new Date().toLocaleDateString('en-GB')
    const base = `You are a business analyst for Cloz Digital, a premium web agency in Bosnia. Today: ${date}. Generate a concise, professional ${key} report from the live data below.`

    switch (key) {
      case 'growth':
        return `${base}\n\nLeads (${leads.length}): ${leads.slice(0, 10).map(l => `${l.name} score=${l.score} stage=${l.stage}`).join('; ') || 'None'}\nProposals (${proposals.length}): ${proposals.slice(0, 10).map(p => `${p.id} ${p.client} ${p.status} ${p.value}BAM`).join('; ') || 'None'}\nDeals (${deals.length}): ${deals.slice(0, 10).map(d => `${d.name} ${d.stage} ${d.value}BAM`).join('; ') || 'None'}\n\nProvide: 1) summary of growth this week 2) wins 3) losses 4) bottlenecks 5) three actions for next week.`
      case 'revenue': {
        const mrr = clients.reduce((s, c) => s + (c.mrr || 0), 0)
        const paid = invoices.filter(i => i.status === 'paid')
        const total = paid.reduce((s, i) => s + (i.amount || 0), 0)
        return `${base}\n\nClients (${clients.length}), MRR ${mrr} BAM, Paid invoices ${paid.length} totaling ${total} BAM.\nClient breakdown: ${clients.map(c => `${c.name} ${c.package} ${c.mrr || 0}BAM/mo`).join('; ') || 'None'}\n\nProvide: 1) revenue summary 2) revenue by package 3) at-risk MRR 4) growth opportunities 5) recommendations.`
      }
      case 'health':
        return `${base}\n\nClient health snapshot:\n${clients.map(c => `${c.name} (${c.package}): health=${c.healthScore || 'unset'} status=${c.status} editsUsed=${c.editsUsed}/${c.editsTotal}`).join('\n') || 'No clients yet'}\n\nProvide: 1) overall health 2) at-risk clients 3) upsell candidates 4) preventive actions.`
      case 'pipeline':
        return `${base}\n\nDeals: ${deals.map(d => `${d.name} stage=${d.stage} value=${d.value}BAM`).join('; ') || 'None'}\n\nProvide: 1) pipeline value 2) conversion analysis 3) stalled deals 4) prioritized next steps.`
      case 'maintenance':
        return `${base}\n\nClients with maintenance: ${clients.filter(c => c.lastMaintenance).map(c => `${c.name} last=${c.lastMaintenance} edits=${c.editsUsed}/${c.editsTotal}`).join('; ') || 'No maintenance data yet'}\n\nProvide: 1) maintenance summary 2) clients overdue for check-ins 3) edit-quota usage 4) recommendations.`
      case 'outreach':
        return `${base}\n\nOutreach sequences (${sequences.length}): ${sequences.map(s => `${s.name} sent=${s.sent} replied=${s.replied} status=${s.status}`).join('; ') || 'No sequences yet'}\n\nProvide: 1) overall performance 2) best-performing niche 3) worst performer + why 4) suggestions to improve reply rate.`
      default:
        return `${base}\n\nProvide a concise overview of current business state.`
    }
  }

  const run = async (key) => {
    setLoading(key)
    setError(e => ({ ...e, [key]: null }))
    try {
      const result = await ai.generate(buildPrompt(key), 0.5)
      const text = result.text || ''
      setGenerated(g => ({ ...g, [key]: { text, generatedAt: new Date().toISOString() } }))
      setPreview(key)
    } catch (e) {
      setError(err => ({ ...err, [key]: e.message }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">Reports</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">AI-generated business intelligence from your live data</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(r => {
          const last = generated[r.key]
          const isLoading = loading === r.key
          const err = error[r.key]
          return (
            <div key={r.key} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition-colors">
              <div className="flex items-start justify-between mb-3">
                <FileBarChart size={18} className="text-accent" strokeWidth={1.5} />
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${r.type === 'weekly' ? 'bg-info/10 text-info' : 'bg-accent-muted text-accent'}`}>{r.type}</span>
              </div>
              <h3 className="text-[14px] font-semibold mb-1">{r.name}</h3>
              <p className="text-[11px] text-text-tertiary leading-relaxed mb-3">{r.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[10px] text-text-tertiary">
                  {last ? `Generated ${new Date(last.generatedAt).toLocaleString()}` : 'Not yet generated'}
                </span>
                <div className="flex items-center gap-2">
                  {last && (
                    <button onClick={() => setPreview(r.key)} className="text-[11px] text-text-secondary hover:text-text-primary font-medium">View</button>
                  )}
                  <button onClick={() => run(r.key)} disabled={isLoading}
                    className="text-[11px] text-accent hover:text-accent-hover font-medium flex items-center gap-1 disabled:opacity-50">
                    {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {isLoading ? 'Generating...' : last ? 'Re-generate' : 'Generate'}
                  </button>
                </div>
              </div>
              {err && <p className="mt-2 text-[10px] text-error">{err}</p>}
            </div>
          )
        })}
      </div>

      {/* Preview modal */}
      {preview && generated[preview] && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setPreview(null)}>
          <div className="bg-surface border border-border rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-display font-semibold text-[15px]">{REPORTS.find(r => r.key === preview)?.name}</h3>
                <p className="text-[11px] text-text-tertiary mt-0.5">Generated {new Date(generated[preview].generatedAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
            </div>
            <div className="p-5 overflow-y-auto text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
              {generated[preview].text.split('\n').map((line, i) => {
                if (line.includes('**')) {
                  const parts = line.split(/\*\*(.*?)\*\*/g)
                  return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                }
                return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
