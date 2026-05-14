import { useState } from 'react'
import { Globe, CheckCircle, AlertTriangle, XCircle, ExternalLink, Shield, Clock, Sparkles, RefreshCw } from 'lucide-react'

const sites = [
  { domain: 'bravainteriors.ba', client: 'Brava Interiors', status: 'operational', uptime: '99.98%', responseTime: '320ms', ssl: 'valid', sslExpiry: '2026-09-15', lastCheck: '2 min ago', incidents: 0 },
  { domain: 'peakathletics.com', client: 'Peak Athletics', status: 'operational', uptime: '99.95%', responseTime: '450ms', ssl: 'valid', sslExpiry: '2026-07-01', lastCheck: '2 min ago', incidents: 1, lastIncident: 'Brief downtime during hosting migration (18min, May 2)' },
  { domain: 'zenithconsulting.ba', client: 'Zenith Consulting', status: 'operational', uptime: '100%', responseTime: '280ms', ssl: 'valid', sslExpiry: '2026-11-20', lastCheck: '2 min ago', incidents: 0 },
  { domain: 'mirawellness.ba', client: 'Mira Wellness', status: 'operational', uptime: '99.99%', responseTime: '310ms', ssl: 'valid', sslExpiry: '2026-12-01', lastCheck: '2 min ago', incidents: 0 },
  { domain: 'harmonyyoga.ba', client: 'Harmony Yoga', status: 'operational', uptime: '99.97%', responseTime: '340ms', ssl: 'valid', sslExpiry: '2027-03-15', lastCheck: '2 min ago', incidents: 0 },
  { domain: 'starigradrestaurant.ba', client: 'Stari Grad Restaurant', status: 'degraded', uptime: '99.85%', responseTime: '890ms', ssl: 'valid', sslExpiry: '2027-05-01', lastCheck: '2 min ago', incidents: 2, lastIncident: 'Slow response times detected — origin server lag (ongoing)' },
]

const statusConfig = {
  operational: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Operational' },
  degraded: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-error', bg: 'bg-error/10', label: 'Down' },
}

export default function Status() {
  const operational = sites.filter(s => s.status === 'operational').length
  const issues = sites.filter(s => s.status !== 'operational').length

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Website Status</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{sites.length} monitored sites &middot; {operational} operational &middot; {issues} with issues</p>
        </div>
        <button className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border px-3 py-1.5 rounded-md text-[12px] font-medium text-text-secondary transition-colors">
          <RefreshCw size={12} />
          Refresh All
        </button>
      </div>

      {/* AI Insight */}
      {issues > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4 flex items-start gap-3">
          <Sparkles size={15} className="text-accent mt-0.5 shrink-0" />
          <div className="text-[12px] text-text-secondary">
            <strong className="text-text-primary font-medium">starigradrestaurant.ba</strong> is experiencing elevated response times (890ms vs normal 300ms). This appears to be origin server lag — likely the hosting provider. Recommend checking Hetzner status page and contacting support if it persists past 2 hours.
          </div>
        </div>
      )}

      {/* Sites grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {sites.map(site => {
          const cfg = statusConfig[site.status]
          return (
            <div key={site.domain} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <cfg.icon size={14} className={cfg.color} />
                    <span className="text-[14px] font-mono font-medium">{site.domain}</span>
                    <a href="#" className="text-text-tertiary hover:text-text-secondary"><ExternalLink size={11} /></a>
                  </div>
                  <span className="text-[11px] text-text-tertiary mt-0.5 block">{site.client}</span>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center pt-3 border-t border-border">
                <div>
                  <span className="text-[10px] text-text-tertiary block">Uptime</span>
                  <span className="text-[13px] font-mono font-medium">{site.uptime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-tertiary block">Response</span>
                  <span className={`text-[13px] font-mono font-medium ${parseInt(site.responseTime) > 500 ? 'text-warning' : ''}`}>{site.responseTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-tertiary block">SSL</span>
                  <span className="text-[13px] font-medium text-success">Valid</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-tertiary block">Incidents</span>
                  <span className={`text-[13px] font-mono font-medium ${site.incidents > 0 ? 'text-warning' : ''}`}>{site.incidents}</span>
                </div>
              </div>
              {site.lastIncident && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-text-tertiary flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-warning mt-0.5 shrink-0" />
                    {site.lastIncident}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
