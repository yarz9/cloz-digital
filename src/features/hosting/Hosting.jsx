import { Server, Globe, Shield, Clock, AlertTriangle, Calendar, CheckCircle } from 'lucide-react'

const domains = [
  { domain: 'bravainteriors.ba', client: 'Brava Interiors', registrar: 'BH Telecom', dns: 'Cloudflare', hosting: 'Hetzner', ssl: 'Let\'s Encrypt', sslExpiry: '2026-09-15', domainExpiry: '2027-03-12', status: 'active', env: 'Production', daysUntilRenewal: 303 },
  { domain: 'peakathletics.com', client: 'Peak Athletics', registrar: 'Namecheap', dns: 'Vercel', hosting: 'Vercel', ssl: 'Vercel Auto', sslExpiry: '2026-07-01', domainExpiry: '2026-06-28', status: 'renewal-soon', env: 'Production', daysUntilRenewal: 46 },
  { domain: 'zenithconsulting.ba', client: 'Zenith Consulting', registrar: 'BH Telecom', dns: 'Cloudflare', hosting: 'Hetzner', ssl: 'Let\'s Encrypt', sslExpiry: '2026-11-20', domainExpiry: '2027-01-15', status: 'active', env: 'Production', daysUntilRenewal: 247 },
  { domain: 'mirawellness.ba', client: 'Mira Wellness', registrar: 'Namecheap', dns: 'Netlify', hosting: 'Netlify', ssl: 'Netlify Auto', sslExpiry: '2026-12-01', domainExpiry: '2026-12-01', status: 'active', env: 'Production', daysUntilRenewal: 202 },
  { domain: 'harmonyyoga.ba', client: 'Harmony Yoga', registrar: 'BH Telecom', dns: 'Cloudflare', hosting: 'Hetzner', ssl: 'Let\'s Encrypt', sslExpiry: '2027-03-15', domainExpiry: '2027-09-15', status: 'active', env: 'Production', daysUntilRenewal: 490 },
  { domain: 'starigradrestaurant.ba', client: 'Stari Grad Restaurant', registrar: 'BH Telecom', dns: 'Cloudflare', hosting: 'Hetzner', ssl: 'Let\'s Encrypt', sslExpiry: '2027-05-01', domainExpiry: '2027-11-01', status: 'active', env: 'Production', daysUntilRenewal: 537 },
]

export default function Hosting() {
  const renewalSoon = domains.filter(d => d.daysUntilRenewal <= 60)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Hosting & Domains</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{domains.length} domains tracked &middot; {renewalSoon.length} renewal{renewalSoon.length !== 1 ? 's' : ''} upcoming</p>
        </div>
      </div>

      {/* Renewal warning */}
      {renewalSoon.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-[13px] font-medium">Upcoming Renewals</span>
          </div>
          {renewalSoon.map(d => (
            <div key={d.domain} className="flex items-center justify-between text-[12px] mt-2">
              <span className="font-mono">{d.domain}</span>
              <span className="text-warning font-medium">{d.daysUntilRenewal} days — {d.registrar}</span>
            </div>
          ))}
        </div>
      )}

      {/* Domain table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Domain</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Client</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Registrar</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Hosting</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">DNS</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">SSL</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Domain Expiry</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {domains.map(d => (
              <tr key={d.domain} className="border-b border-border last:border-0 hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3 text-[13px] font-mono font-medium">{d.domain}</td>
                <td className="px-4 py-3 text-[13px] text-text-secondary">{d.client}</td>
                <td className="px-4 py-3 text-[12px] text-text-secondary">{d.registrar}</td>
                <td className="px-4 py-3 text-[12px] text-text-secondary">{d.hosting}</td>
                <td className="px-4 py-3 text-[12px] text-text-secondary">{d.dns}</td>
                <td className="px-4 py-3">
                  <span className="text-[11px] text-success flex items-center gap-1"><Shield size={10} /> Valid</span>
                </td>
                <td className="px-4 py-3 text-[12px]">
                  <span className={d.daysUntilRenewal <= 60 ? 'text-warning font-medium' : 'text-text-secondary'}>{d.domainExpiry}</span>
                </td>
                <td className="px-4 py-3">
                  {d.status === 'renewal-soon' ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-warning/10 text-warning">Renewal Soon</span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-success/10 text-success">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
