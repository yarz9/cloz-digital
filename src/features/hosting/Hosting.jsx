import { useMemo } from 'react'
import { Server, Shield, AlertTriangle } from 'lucide-react'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  HOSTING & DOMAINS — Built from real client records
// ══════════════════════════════════════════════════════════════

function daysBetween(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.round((d - new Date()) / 86400000)
}

export default function Hosting() {
  const clients = useStore(s => s.clients)

  const domains = useMemo(() => {
    return clients
      .filter(c => c.website || c.domain)
      .map(c => {
        const daysUntilRenewal = daysBetween(c.domainExpiry)
        const status = daysUntilRenewal != null && daysUntilRenewal <= 60 ? 'renewal-soon' : 'active'
        return {
          id: c.id,
          domain: c.website || c.domain || '—',
          client: c.name,
          registrar: c.domain || '—',
          hosting: c.hosting || '—',
          dns: c.dns || c.hosting || '—',
          sslExpiry: c.sslExpiry || '',
          domainExpiry: c.domainExpiry || '',
          daysUntilRenewal,
          status,
        }
      })
      .sort((a, b) => {
        // Push expiring soonest to top
        const aDays = a.daysUntilRenewal ?? Infinity
        const bDays = b.daysUntilRenewal ?? Infinity
        return aDays - bDays
      })
  }, [clients])

  const renewalSoon = domains.filter(d => d.daysUntilRenewal != null && d.daysUntilRenewal <= 60)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Hosting & Domains</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            {domains.length === 0 ? 'No domains tracked yet' : `${domains.length} domain${domains.length === 1 ? '' : 's'} · ${renewalSoon.length} renewal${renewalSoon.length !== 1 ? 's' : ''} upcoming`}
          </p>
        </div>
      </div>

      {domains.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Server}
            title="No domains to track yet"
            description="Domains appear here automatically when you record a client's website, hosting provider, and registrar."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          {renewalSoon.length > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-warning" />
                <span className="text-[13px] font-medium">Upcoming Renewals (within 60 days)</span>
              </div>
              {renewalSoon.map(d => (
                <div key={d.id} className="flex items-center justify-between text-[12px] mt-2">
                  <span className="font-mono">{d.domain}</span>
                  <span className="text-warning font-medium">{d.daysUntilRenewal} days — {d.registrar}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-surface border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  {['Domain', 'Client', 'Registrar', 'Hosting', 'SSL', 'Domain Expiry', 'Status'].map(h => (
                    <th key={h} className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-mono font-medium">{d.domain}</td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">{d.client}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{d.registrar}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{d.hosting}</td>
                    <td className="px-4 py-3">
                      {d.sslExpiry ? (
                        <span className="text-[11px] text-success flex items-center gap-1"><Shield size={10} /> {d.sslExpiry}</span>
                      ) : (
                        <span className="text-[11px] text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className={d.daysUntilRenewal != null && d.daysUntilRenewal <= 60 ? 'text-warning font-medium' : 'text-text-secondary'}>
                        {d.domainExpiry || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${d.status === 'renewal-soon' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                        {d.status === 'renewal-soon' ? 'Renewal Soon' : 'Active'}
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
