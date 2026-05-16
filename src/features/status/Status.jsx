import { useMemo } from 'react'
import { Globe, CheckCircle, AlertTriangle, ExternalLink, Shield } from 'lucide-react'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  STATUS — Monitored sites derived from real client records
//  Note: True uptime/response monitoring requires an external checker;
//  this view surfaces every site we host and basic health metadata.
// ══════════════════════════════════════════════════════════════

export default function Status() {
  const clients = useStore(s => s.clients)

  const sites = useMemo(() => {
    return clients
      .filter(c => c.website)
      .map(c => ({
        id: c.id,
        domain: c.website,
        client: c.name,
        healthScore: c.healthScore || 0,
        status: c.status || 'active',
        sslExpiry: c.sslExpiry || '',
        package: c.package || '',
      }))
  }, [clients])

  const healthy = sites.filter(s => s.status === 'active' && s.healthScore >= 80).length
  const atRisk = sites.filter(s => s.status === 'at-risk' || s.healthScore < 80).length

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Website Status</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            {sites.length === 0
              ? 'No sites monitored yet'
              : `${sites.length} site${sites.length === 1 ? '' : 's'} · ${healthy} healthy · ${atRisk} need attention`}
          </p>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Globe}
            title="No monitored sites yet"
            description="Sites you host or maintain show up here once you record a client's website URL. External uptime monitoring can be configured per site."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sites.map(site => {
            const cfg = site.status === 'active' && site.healthScore >= 80
              ? { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Healthy' }
              : { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Needs attention' }
            const url = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`
            return (
              <div key={site.id} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <cfg.icon size={14} className={cfg.color} />
                      <span className="text-[14px] font-mono font-medium truncate">{site.domain}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-text-secondary">
                        <ExternalLink size={11} />
                      </a>
                    </div>
                    <span className="text-[11px] text-text-tertiary mt-0.5 block">{site.client}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.color} shrink-0`}>{cfg.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-border">
                  <div>
                    <span className="text-[10px] text-text-tertiary block">Health</span>
                    <span className={`text-[13px] font-mono font-medium ${site.healthScore >= 80 ? 'text-success' : site.healthScore >= 60 ? 'text-warning' : 'text-error'}`}>
                      {site.healthScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary block">Package</span>
                    <span className="text-[12px] font-medium text-text-secondary">{site.package || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary block">SSL</span>
                    <span className="text-[12px] font-medium text-success flex items-center justify-center gap-1">
                      <Shield size={10} /> {site.sslExpiry || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
