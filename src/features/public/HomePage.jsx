import { ArrowUpRight, ArrowRight, Check, Globe, Paintbrush, Shield, RefreshCw, Zap, Monitor } from 'lucide-react'

const services = [
  { icon: Paintbrush, title: 'Website Design', desc: 'Custom-built websites that reflect your business quality. No templates, no shortcuts.' },
  { icon: RefreshCw, title: 'Website Redesign', desc: 'Transform an outdated site into a modern, conversion-focused presence.' },
  { icon: Globe, title: 'Hosting & Setup', desc: 'Fast, secure hosting with proper DNS, SSL, and deployment — handled completely.' },
  { icon: Shield, title: 'Ongoing Maintenance', desc: 'Updates, backups, security patches, and content changes — you never worry about it.' },
  { icon: Monitor, title: 'Website Monitoring', desc: 'Uptime tracking, performance checks, and immediate response when something breaks.' },
  { icon: Zap, title: 'Care Plans', desc: 'Monthly support packages that keep your site healthy, current, and performing.' },
]

const packages = [
  {
    name: 'Launch Care',
    price: 'from 800 BAM',
    desc: 'For businesses launching their first professional website.',
    features: ['Custom design (up to 5 pages)', 'Mobile responsive', 'Basic SEO setup', 'Contact form integration', 'Hosting setup included', '30 days post-launch support'],
    accent: false,
  },
  {
    name: 'Growth Care',
    price: 'from 1,500 BAM',
    desc: 'For businesses ready to grow their online presence seriously.',
    features: ['Full custom design (up to 12 pages)', 'Advanced responsive design', 'SEO foundation + analytics', 'CMS integration', 'Performance optimization', '3 months maintenance included', 'Monthly content updates (2/mo)', 'Priority support'],
    accent: true,
  },
  {
    name: 'Presence Care',
    price: 'from 200 BAM/mo',
    desc: 'Ongoing care for businesses that want their site managed properly.',
    features: ['Monthly maintenance & updates', 'Security monitoring', 'Performance optimization', 'Content updates (up to 4/mo)', 'Hosting management', 'Monthly reports', 'Priority response', 'Quarterly design review'],
    accent: false,
  },
]

const process = [
  { step: '01', title: 'Discovery', desc: 'We learn about your business, audience, and goals. No assumptions.' },
  { step: '02', title: 'Strategy', desc: 'We plan the structure, content direction, and technical approach.' },
  { step: '03', title: 'Design', desc: 'We build your site with attention to every detail. You review and refine.' },
  { step: '04', title: 'Launch', desc: 'We handle deployment, DNS, SSL, and everything technical.' },
  { step: '05', title: 'Ongoing Care', desc: 'We maintain, update, and improve your site month after month.' },
]

const work = [
  { name: 'Brava Interiors', type: 'Interior Design Studio', scope: 'Full website + monthly care', color: '#8B6F47' },
  { name: 'Peak Athletics', type: 'Fitness & Training', scope: 'Redesign + hosting setup', color: '#47788B' },
  { name: 'Zenith Consulting', type: 'Business Consulting', scope: 'Website + Growth Care plan', color: '#6B478B' },
  { name: 'Mira Wellness', type: 'Health & Wellness', scope: 'Launch Care package', color: '#478B6B' },
]

const testimonials = [
  { name: 'Amina H.', company: 'Brava Interiors', text: 'Finally a team that handles everything. I just focus on my business now.' },
  { name: 'Marko P.', company: 'Peak Athletics', text: 'The site looks premium and I never have to think about updates or security.' },
  { name: 'Sara K.', company: 'Zenith Consulting', text: 'Professional, fast, and they actually understand what a business needs online.' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[720px]">
            <h1 className="font-display font-bold text-[48px] md:text-[64px] leading-[1.05] tracking-tight text-text-primary">
              Web design that works.<br />
              <span className="text-text-secondary">Care that keeps working.</span>
            </h1>
            <p className="mt-6 text-[16px] md:text-[18px] text-text-secondary leading-relaxed max-w-[540px]">
              We build premium websites and maintain them properly. No disappearing after launch. Your online presence, handled with serious care.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contact" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-6 py-3 rounded-md transition-colors text-[14px]">
                Start a Project
                <ArrowUpRight size={15} />
              </a>
              <a href="#packages" className="inline-flex items-center gap-2 bg-elevated hover:bg-raised text-text-primary border border-border font-medium px-6 py-3 rounded-md transition-colors text-[14px]">
                View Packages
              </a>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap gap-8 items-center">
            <div className="flex flex-col">
              <span className="text-[28px] font-display font-bold">30+</span>
              <span className="text-[12px] text-text-tertiary">Projects delivered</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col">
              <span className="text-[28px] font-display font-bold">12</span>
              <span className="text-[12px] text-text-tertiary">Active care clients</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col">
              <span className="text-[28px] font-display font-bold">99.9%</span>
              <span className="text-[12px] text-text-tertiary">Uptime maintained</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[480px] mb-12">
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Services</span>
            <h2 className="mt-3 font-display font-bold text-[32px] leading-tight">Everything your website needs. Nothing it doesn't.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => (
              <div key={s.title} className="p-6 bg-surface border border-border rounded-lg hover:border-border-strong transition-colors">
                <s.icon size={20} className="text-accent mb-4" strokeWidth={1.5} />
                <h3 className="font-display font-semibold text-[15px] mb-2">{s.title}</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[480px] mb-12">
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Packages</span>
            <h2 className="mt-3 font-display font-bold text-[32px] leading-tight">Choose the level of care your business needs.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {packages.map(pkg => (
              <div key={pkg.name} className={`p-7 rounded-lg border ${pkg.accent ? 'bg-accent-muted border-accent/30' : 'bg-surface border-border'}`}>
                <h3 className="font-display font-bold text-[18px]">{pkg.name}</h3>
                <p className="mt-1 text-[13px] text-text-secondary">{pkg.desc}</p>
                <div className="mt-4 mb-6">
                  <span className="text-[24px] font-display font-bold">{pkg.price}</span>
                </div>
                <ul className="space-y-2.5">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-text-secondary">
                      <Check size={14} className="text-success mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#contact" className={`mt-6 w-full inline-flex items-center justify-center gap-2 font-medium px-4 py-2.5 rounded-md transition-colors text-[13px] ${
                  pkg.accent
                    ? 'bg-accent hover:bg-accent-hover text-white'
                    : 'bg-elevated hover:bg-raised text-text-primary border border-border'
                }`}>
                  Get Started
                  <ArrowRight size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="py-20 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[480px] mb-12">
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Process</span>
            <h2 className="mt-3 font-display font-bold text-[32px] leading-tight">How we work. Clear, structured, no guessing.</h2>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {process.map(p => (
              <div key={p.step} className="p-5 bg-surface border border-border rounded-lg">
                <span className="text-[11px] font-mono font-medium text-accent">{p.step}</span>
                <h3 className="mt-2 font-display font-semibold text-[14px]">{p.title}</h3>
                <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Work */}
      <section id="work" className="py-20 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[480px] mb-12">
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Work</span>
            <h2 className="mt-3 font-display font-bold text-[32px] leading-tight">Businesses we've helped look and perform better.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {work.map(w => (
              <div key={w.name} className="group relative overflow-hidden rounded-lg border border-border bg-surface hover:border-border-strong transition-colors">
                <div className="h-48 w-full" style={{ background: `linear-gradient(135deg, ${w.color}22, ${w.color}08)` }} />
                <div className="p-6">
                  <h3 className="font-display font-semibold text-[16px]">{w.name}</h3>
                  <p className="text-[12px] text-text-tertiary mt-0.5">{w.type}</p>
                  <p className="text-[13px] text-text-secondary mt-2">{w.scope}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[480px] mb-12">
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Trust</span>
            <h2 className="mt-3 font-display font-bold text-[32px] leading-tight">What our clients say.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map(t => (
              <div key={t.name} className="p-6 bg-surface border border-border rounded-lg">
                <p className="text-[14px] text-text-secondary leading-relaxed italic">"{t.text}"</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-[13px] font-medium">{t.name}</span>
                  <span className="text-[12px] text-text-tertiary ml-2">{t.company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-6 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[600px] mx-auto text-center">
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Get in Touch</span>
            <h2 className="mt-3 font-display font-bold text-[32px] leading-tight">Ready to take your website seriously?</h2>
            <p className="mt-4 text-[14px] text-text-secondary">
              Tell us about your business. We'll respond within 24 hours with an honest assessment of how we can help.
            </p>
          </div>
          <form className="mt-10 max-w-[520px] mx-auto space-y-4" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Your name" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
              <input type="email" placeholder="Email" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
            </div>
            <input type="text" placeholder="Business name" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
            <input type="url" placeholder="Current website (if you have one)" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors" />
            <textarea rows="4" placeholder="What do you need help with?" className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors resize-none" />
            <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-md transition-colors text-[14px]">
              Send Inquiry
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
