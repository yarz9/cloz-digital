import { Shield, CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react'

const slaData = [
  { client: 'Peak Athletics', package: 'Growth Care', uptime: 99.9, responseTime: '< 2h', updates: 'Monthly', lastMaintenance: '2026-05-10', nextMaintenance: '2026-06-10', compliance: 'met' },
  { client: 'Brava Interiors', package: 'Presence Care', uptime: 99.8, responseTime: '< 4h', updates: 'Monthly', lastMaintenance: '2026-05-08', nextMaintenance: '2026-06-08', compliance: 'met' },
  { client: 'Harmony Yoga', package: 'Growth Care', uptime: 99.5, responseTime: '< 2h', updates: 'Monthly', lastMaintenance: '2026-05-05', nextMaintenance: '2026-06-05', compliance: 'met' },
  { client: 'Stari Grad Restaurant', package: 'Presence Care', uptime: 98.2, responseTime: '< 4h', updates: 'Monthly', lastMaintenance: '2026-04-20', nextMaintenance: '2026-05-20', compliance: 'at-risk' },
  { client: 'Zenith Consulting', package: 'Presence Care', uptime: 99.7, responseTime: '< 4h', updates: 'Monthly', lastMaintenance: '2026-05-03', nextMaintenance: '2026-06-03', compliance: 'met' },
  { client: 'Zen Café', package: 'Presence Care', uptime: 97.1, responseTime: '< 4h', updates: 'Monthly', lastMaintenance: '2026-04-15', nextMaintenance: '2026-05-15', compliance: 'breach' },
]

export default function SLATracker() {
  const met = slaData.filter(s => s.compliance === 'met').length
  const atRisk = slaData.filter(s => s.compliance === 'at-risk').length
  const breached = slaData.filter(s => s.compliance === 'breach').length

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">SLA Tracker</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Service Level Agreement compliance monitoring</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Overall Compliance</span>
          <div className="text-[22px] font-display font-bold text-success mt-1">{Math.round((met / slaData.length) * 100)}%</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">SLAs Met</span>
          <div className="text-[22px] font-display font-bold text-success mt-1">{met}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">At Risk</span>
          <div className="text-[22px] font-display font-bold text-warning mt-1">{atRisk}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Breached</span>
          <div className="text-[22px] font-display font-bold text-error mt-1">{breached}</div>
        </div>
      </div>

      {/* SLA table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Client</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Package</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Uptime</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Response</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Next Maintenance</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {slaData.map(s => (
              <tr key={s.client} className="border-b border-border/50 hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3 text-[12px] font-medium">{s.client}</td>
                <td className="px-4 py-3 text-[11px] text-text-secondary">{s.package}</td>
                <td className="px-4 py-3">
                  <span className={`text-[12px] font-mono ${s.uptime >= 99.5 ? 'text-success' : s.uptime >= 98 ? 'text-warning' : 'text-error'}`}>
                    {s.uptime}%
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-text-secondary">{s.responseTime}</td>
                <td className="px-4 py-3 text-[11px] text-text-tertiary">{s.nextMaintenance}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    s.compliance === 'met' ? 'bg-success/10 text-success' :
                    s.compliance === 'at-risk' ? 'bg-warning/10 text-warning' :
                    'bg-error/10 text-error'
                  }`}>
                    {s.compliance === 'met' && <CheckCircle2 size={9} />}
                    {s.compliance === 'at-risk' && <Clock size={9} />}
                    {s.compliance === 'breach' && <AlertTriangle size={9} />}
                    {s.compliance}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
