import { Check, ArrowRight } from 'lucide-react'

const packages = [
  {
    name: 'Launch Care', price: 'from 800 BAM', period: 'one-time',
    desc: 'For businesses launching their first professional website.',
    features: ['Custom design (up to 5 pages)', 'Mobile responsive', 'Basic SEO setup', 'Contact form integration', 'Hosting setup included', '30 days post-launch support'],
    accent: false, best: false,
  },
  {
    name: 'Growth Care', price: 'from 1,500 BAM', period: 'one-time + optional monthly',
    desc: 'For businesses ready to grow their online presence seriously.',
    features: ['Full custom design (up to 12 pages)', 'Advanced responsive design', 'SEO foundation + analytics', 'CMS integration', 'Performance optimization', '3 months maintenance included', 'Monthly content updates (2/mo)', 'Priority support'],
    accent: true, best: true,
  },
  {
    name: 'Presence Care', price: 'from 200 BAM', period: '/month',
    desc: 'Ongoing care for businesses that want their site managed properly.',
    features: ['Monthly maintenance & updates', 'Security monitoring', 'Performance optimization', 'Content updates (up to 4/mo)', 'Hosting management', 'Monthly reports', 'Priority response', 'Quarterly design review'],
    accent: false, best: false,
  },
]

export default function PackagesPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[600px] mb-16 mx-auto text-center">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Packages</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">Choose the level of care your business needs.</h1>
          <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">Transparent pricing. No hidden fees. Every package includes real work, not vague promises.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {packages.map(pkg => (
            <div key={pkg.name} className={`p-7 rounded-lg border relative ${pkg.accent ? 'bg-accent-muted border-accent/30' : 'bg-surface border-border'}`}>
              {pkg.best && <span className="absolute -top-2.5 left-7 text-[10px] font-medium bg-accent text-white px-2.5 py-0.5 rounded">Most Popular</span>}
              <h3 className="font-display font-bold text-[20px]">{pkg.name}</h3>
              <p className="mt-1 text-[13px] text-text-secondary">{pkg.desc}</p>
              <div className="mt-5 mb-6">
                <span className="text-[28px] font-display font-bold">{pkg.price}</span>
                <span className="text-[12px] text-text-tertiary ml-1">{pkg.period}</span>
              </div>
              <ul className="space-y-3">
                {pkg.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-text-secondary">
                    <Check size={14} className="text-success mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/contact" className={`mt-7 w-full inline-flex items-center justify-center gap-2 font-medium px-4 py-2.5 rounded-md transition-colors text-[13px] ${
                pkg.accent
                  ? 'bg-accent hover:bg-accent-hover text-white'
                  : 'bg-elevated hover:bg-raised text-text-primary border border-border'
              }`}>
                Get Started <ArrowRight size={13} />
              </a>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 max-w-[680px] mx-auto">
          <h2 className="font-display font-bold text-[20px] mb-4">Not sure which package?</h2>
          <p className="text-[14px] text-text-secondary leading-relaxed mb-4">Every business is different. We're happy to have a short conversation to understand what you need and recommend the right approach. No pressure, no commitment.</p>
          <a href="/contact" className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium text-[14px]">
            Tell us about your project <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
