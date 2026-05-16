import { useMemo } from 'react'
import { Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  SLA TRACKER — Compliance derived from real client maintenance records
// ══════════════════════════════════════════════════════════════

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date() - new Date(dateStr)) / 86400000)
}

export default function SLATracker() {
  const clients = useStore(s => s.clients)

  const slaData = useMemo(() => {
    return clients
      .filter(c => c.package === 'Growth Care' || c.package === 'Presence Care')
      .map(c => {
        const daysSinceLast = daysSince(c.lastMaintenance)
        // Maintenance SLA: monthly = within 35 days
        let compliance = 'met'
        if (daysSinceLast == null) compliance = 'unknown'
        else if (daysSinceLast > 45) compliance = 'breach'
        else if (daysSinceLast > 35) compliance = 'at-risk'

        const responseTime = c.package === 'Growth Care' ? '< 2h' : '< 4h'

        return {
          id: c.id,
          client: c.name,
          package: c.package,
          healthScore: c.healthScore || 0,
          responseTime,
          lastMaintenance: c.lastMaintenance,
          daysSinceLast,
          compliance,
        }
      })
  }, [clients])

  const met = slaData.filter(s => s.compliance === 'met').length
  const atRisk = slaData.filter(s => s.compliance === 'at-risk').length
  const breached = slaData.filter(s => s.compliance === 'breach').length
  const unknown = slaData.filter(s => s.compliance === 'unknown').length

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">SLA Tracker</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Service Level Agreement compliance for Growth Care and Presence Care retainers</p>
      </div>

      {slaData.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Shield}
            title="No SLA-eligible clients yet"
            description="Growth Care and Presence Care clients appear here automatically with rolling monthly-maintenance compliance status."
            actionLabel="Add Retainer Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-lg p-4">
              <span className="text-[11px] text-text-tertiary">Overall Compliance</span>
              <div className="text-[22px] font-display font-bold text-success mt-1">
                {slaData.length ? Math.round((met / slaData.length) * 100) : 0}%
              </div>
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

          {unknown > 0 && (
            <div className="bg-info/5 border border-info/20 rounded-lg p-3 text-[11px] text-info">
              <Shield size={12} className="inline mr-1.5" />
              {unknown} client{unknown === 1 ? ' has' : 's have'} no maintenance record yet — log activity to track compliance.
            </div>
          )}

          <div className="bg-surface border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  {['Client', 'Package', 'Health', 'Response SLA', 'Last Maintenance', 'Status'].map(h => (
                    <th key={h} className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaData.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium">{s.client}</td>
                    <td className="px-4 py-3 text-[11px] text-text-secondary">{s.package}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-mono ${s.healthScore >= 80 ? 'text-success' : s.healthScore >= 60 ? 'text-warning' : 'text-error'}`}>
                        {s.healthScore}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-text-secondary">{s.responseTime}</td>
                    <td className="px-4 py-3 text-[11px] text-text-tertiary">
                      {s.lastMaintenance || 'Never'}
                      {s.daysSinceLast != null && <span className="ml-2 text-text-tertiary">({s.daysSinceLast}d ago)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${
                        s.compliance === 'met' ? 'bg-success/10 text-success' :
                        s.compliance === 'at-risk' ? 'bg-warning/10 text-warning' :
                        s.compliance === 'breach' ? 'bg-error/10 text-error' :
                        'bg-elevated text-text-tertiary'
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
        </>
      )}
    </div>
  )
}
