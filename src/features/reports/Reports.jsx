import { FileBarChart, Download, Calendar, TrendingUp, Users, Receipt } from 'lucide-react'

const reports = [
  { name: 'Weekly Growth Review', type: 'weekly', lastGenerated: '2026-05-12', description: 'Lead movement, proposals, wins/losses, and recommendations' },
  { name: 'Monthly Revenue Report', type: 'monthly', lastGenerated: '2026-05-01', description: 'Revenue breakdown by client, package, and service type' },
  { name: 'Client Health Summary', type: 'monthly', lastGenerated: '2026-05-01', description: 'Health scores, at-risk clients, upsell opportunities' },
  { name: 'Pipeline Analysis', type: 'weekly', lastGenerated: '2026-05-12', description: 'Pipeline value, conversion rates, stage durations' },
  { name: 'Maintenance Activity Log', type: 'monthly', lastGenerated: '2026-05-01', description: 'All maintenance work performed across clients' },
  { name: 'Outreach Performance', type: 'weekly', lastGenerated: '2026-05-12', description: 'Send rates, open rates, reply rates by sequence' },
]

export default function Reports() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">Reports</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">AI-generated business intelligence reports</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.name} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <FileBarChart size={18} className="text-accent" strokeWidth={1.5} />
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${r.type === 'weekly' ? 'bg-info/10 text-info' : 'bg-accent-muted text-accent'}`}>{r.type}</span>
            </div>
            <h3 className="text-[14px] font-semibold mb-1">{r.name}</h3>
            <p className="text-[11px] text-text-tertiary leading-relaxed mb-3">{r.description}</p>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[10px] text-text-tertiary">Last: {r.lastGenerated}</span>
              <button className="text-[11px] text-accent hover:text-accent-hover font-medium">Generate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
