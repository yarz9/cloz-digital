import { Paintbrush, RefreshCw, Globe, Shield, Monitor, Zap, ArrowRight } from 'lucide-react'

const services = [
  { icon: Paintbrush, title: 'Website Design', desc: 'Custom-built websites that reflect your business quality. No templates, no shortcuts. Every page designed with purpose, from structure to typography to user flow.', details: ['Discovery & strategy session', 'Custom visual design', 'Mobile-first development', 'Content guidance', 'Launch support'] },
  { icon: RefreshCw, title: 'Website Redesign', desc: 'Transform an outdated site into a modern, conversion-focused presence. We audit what exists, keep what works, and rebuild what doesn\'t.', details: ['Full website audit', 'Performance analysis', 'Modern redesign', 'Content migration', 'SEO preservation'] },
  { icon: Globe, title: 'Hosting & Domain Setup', desc: 'Fast, secure hosting with proper DNS, SSL, and deployment. Everything technical handled so you can focus on business.', details: ['Server configuration', 'Domain & DNS setup', 'SSL certificate', 'Email configuration', 'CDN setup'] },
  { icon: Shield, title: 'Ongoing Maintenance', desc: 'Updates, backups, security patches, and content changes. Your website stays healthy without you thinking about it.', details: ['Security updates', 'Regular backups', 'Content changes', 'Performance monitoring', 'Monthly reports'] },
  { icon: Monitor, title: 'Website Monitoring', desc: 'Uptime tracking, performance checks, and immediate response when something breaks.', details: ['24/7 uptime monitoring', 'Performance tracking', 'Error detection', 'Immediate response', 'Monthly status reports'] },
  { icon: Zap, title: 'Care Plans', desc: 'Monthly support packages that keep your site healthy, current, and performing. Choose the level of care your business needs.', details: ['Flexible packages', 'Priority support', 'Regular updates', 'Design reviews', 'Growth recommendations'] },
]

export default function ServicesPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[600px] mb-16">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Services</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">Everything your website needs. Nothing it doesn't.</h1>
          <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">We handle design, development, hosting, and ongoing care. One team, one relationship, zero gaps.</p>
        </div>

        <div className="space-y-6">
          {services.map((s, i) => (
            <div key={s.title} className="bg-surface border border-border rounded-lg p-8 grid md:grid-cols-2 gap-8">
              <div>
                <s.icon size={24} className="text-accent mb-4" strokeWidth={1.5} />
                <h2 className="font-display font-bold text-[22px] mb-3">{s.title}</h2>
                <p className="text-[14px] text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
              <div>
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary mb-4">Includes</h3>
                <ul className="space-y-2.5">
                  {s.details.map(d => (
                    <li key={d} className="flex items-center gap-2 text-[13px] text-text-secondary">
                      <div className="w-1 h-1 rounded-full bg-accent shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a href="/contact" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-6 py-3 rounded-md transition-colors text-[14px]">
            Discuss Your Project <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  )
}
