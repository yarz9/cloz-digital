import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, ArrowRight, Check, Globe, Paintbrush, Shield, RefreshCw,
  Zap, Monitor, Search, Mail, Compass, PenTool, Code2, Rocket, HeartPulse,
  Plus, Minus, Sparkles, MapPin, Languages, Smartphone, Gauge, Clock,
  CheckCircle2, Lock, ShieldCheck, MessageCircle, FileText, Calendar,
} from 'lucide-react'

// ══════════════════════════════════════════════════════════════
//  HOMEPAGE — Production Landing Page
//  Premium positioning. Real packages. No fabricated portfolio.
// ══════════════════════════════════════════════════════════════

const services = [
  { icon: Paintbrush, title: 'Website Design',          desc: 'Custom-built sites that reflect the quality of your business — no templates, no shortcuts.' },
  { icon: RefreshCw,  title: 'Redesigns',               desc: 'Modernize an outdated presence into a conversion-focused, fast, mobile-first site.' },
  { icon: Globe,      title: 'Hosting & Setup',         desc: 'Fast, secure hosting with proper DNS, SSL, and deployment — fully managed.' },
  { icon: Shield,     title: 'Ongoing Maintenance',     desc: 'Updates, backups, security patches, and content edits — handled so you never worry.' },
  { icon: Search,     title: 'SEO Optimization',        desc: 'Technical SEO, structured data, performance tuning, and on-page strategy that compounds.' },
  { icon: Mail,       title: 'Email Setup',             desc: 'Professional inboxes on your domain (info@, sales@, anything you need) — properly authenticated.' },
  { icon: HeartPulse, title: 'Ongoing Support',         desc: 'A real team you can email or call when something matters — same-day responses on care plans.' },
]

const packages = [
  {
    name: 'Launch Care',
    price: '800 BAM',
    priceUnit: 'one-time',
    desc: 'Your first professional website, done right.',
    features: [
      'Custom design (up to 5 pages)',
      'Mobile-first responsive layout',
      'Basic SEO setup',
      'Contact form integration',
      'Hosting setup included',
      '30 days post-launch support',
    ],
    cta: 'Get Launch Care',
    highlighted: false,
  },
  {
    name: 'Growth Care',
    price: '1,500 BAM',
    priceUnit: 'one-time',
    desc: 'For businesses ready to grow their online presence seriously.',
    features: [
      'Full custom design (up to 12 pages)',
      'Advanced responsive design',
      'SEO foundation + analytics',
      'CMS integration',
      'Performance optimization',
      '3 months maintenance included',
      'Priority support',
    ],
    cta: 'Get Growth Care',
    highlighted: true,
  },
  {
    name: 'Presence Care',
    price: '200 BAM',
    priceUnit: 'per month',
    desc: 'Ongoing care for an existing site you want managed properly.',
    features: [
      'Hosting and SSL management',
      'Weekly backups',
      'Security monitoring & patches',
      'Content updates (2 per month)',
      'Uptime monitoring',
      'Same-day email support',
    ],
    cta: 'Start Presence Care',
    highlighted: false,
  },
]

const differentiators = [
  { icon: Sparkles,   title: 'Premium Design',        desc: 'Hand-built layouts that look modern, refined, and intentional — never generic.' },
  { icon: Gauge,      title: 'Fast Performance',      desc: 'Optimized assets, lean code, and CDN delivery. Sites that load in under two seconds.' },
  { icon: Smartphone, title: 'Mobile-First',          desc: 'Designed for the device most of your visitors actually use. Pixel-perfect everywhere.' },
  { icon: Search,     title: 'SEO-Ready',             desc: 'Semantic markup, structured data, performance, and on-page strategy from day one.' },
  { icon: HeartPulse, title: 'Real Ongoing Support',  desc: 'A human team — not a ticket queue. Same-day responses on every care plan.' },
  { icon: Languages,  title: 'Bosnian & English',     desc: 'Native support in both languages. Local understanding, international quality.' },
]

const process = [
  { num: '01', icon: Compass,    title: 'Discovery',   desc: 'We learn your business, audience, and goals. A free consultation defines scope and outcomes.' },
  { num: '02', icon: PenTool,    title: 'Design',      desc: 'Custom layouts and visual direction built around your brand — reviewed and refined together.' },
  { num: '03', icon: Code2,      title: 'Development', desc: 'Clean, fast, accessible code. SEO, analytics, and integrations wired up properly.' },
  { num: '04', icon: Rocket,     title: 'Launch',      desc: 'Deployment, DNS, SSL, and a full QA pass. You go live with a site that is ready for visitors.' },
  { num: '05', icon: HeartPulse, title: 'Ongoing Care',desc: 'Updates, monitoring, and content changes — your site stays healthy without your attention.' },
]

const faqs = [
  {
    q: 'How much does a website cost?',
    a: 'Launch Care starts at 800 BAM for a complete 5-page site. Growth Care is 1,500 BAM for a larger 12-page build. Presence Care is 200 BAM/month for ongoing management of an existing site. Every quote includes a clear scope — no surprises.',
  },
  {
    q: 'How long does a project take?',
    a: 'Launch Care typically delivers in 2–3 weeks. Growth Care takes 4–6 weeks depending on scope. We agree on a timeline at the start and keep you updated throughout.',
  },
  {
    q: 'Is hosting included?',
    a: 'Yes. Both Launch Care and Growth Care include hosting setup, SSL, and proper domain configuration. After the included support window, hosting can continue under a Presence Care plan.',
  },
  {
    q: 'How many revisions do I get?',
    a: 'Every package includes design revisions during the design phase — we work iteratively with you until the direction is right. Major scope changes after sign-off are handled transparently.',
  },
  {
    q: 'What about ongoing maintenance after launch?',
    a: 'Launch Care includes 30 days of post-launch support. Growth Care includes 3 months. After that, Presence Care keeps your site updated, secure, and maintained for 200 BAM/month.',
  },
  {
    q: 'Who owns the website when it is done?',
    a: 'You do. Code, content, domain, and hosting credentials are all yours. We do not hold your site hostage.',
  },
  {
    q: 'Do you work with businesses outside Bosnia?',
    a: 'Yes — we work with clients across the Balkans and internationally. All communication happens in Bosnian, English, or both, depending on your preference.',
  },
]

// ══════════════════════════════════════════════════════════════

export default function HomePage() {
  useEffect(() => {
    document.title = 'Cloz Digital — Premium Web Design, Hosting & Ongoing Care'
  }, [])

  return (
    <div className="bg-bg text-text-primary">
      <Hero />
      <TrustBar />
      <Services />
      <Packages />
      <WhyChoose />
      <Process />
      <RiskReversal />
      <FAQ />
      <BookingPlaceholder />
      <FinalCTA />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  HERO
// ══════════════════════════════════════════════════════════════

function Hero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 overflow-hidden">
      {/* Background gradient accent */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 60%)' }} />
      </div>

      <div className="relative max-w-[1200px] mx-auto">
        <div className="max-w-[820px]">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-accent-muted border border-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] font-medium text-accent uppercase tracking-wider">Premium Web Agency · Bosnia</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-bold text-[44px] md:text-[64px] leading-[1.05] tracking-tight">
            Premium websites,<br />
            <span className="text-accent">built to convert.</span><br />
            Care that keeps them working.
          </h1>

          {/* Subhead */}
          <p className="mt-7 text-[16px] md:text-[18px] text-text-secondary leading-relaxed max-w-[640px]">
            Cloz Digital designs, builds, and maintains modern websites for businesses
            that take their online presence seriously. Design, hosting, SEO, and ongoing care — handled.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link to="/contact"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-md text-[14px] font-semibold transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(94,141,181,0.25)]">
              Book a Free Consultation
              <ArrowUpRight size={15} />
            </Link>
            <a href="#packages"
              className="inline-flex items-center justify-center gap-2 bg-elevated hover:bg-raised border border-border text-text-primary px-6 py-3.5 rounded-md text-[14px] font-medium transition-colors">
              View Packages
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px] text-text-tertiary">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> Custom design — never templates</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> Transparent fixed pricing</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> Same-day support on care plans</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> You own everything</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  SERVICES
// ══════════════════════════════════════════════════════════════

function Services() {
  return (
    <section id="services" className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow="What we do"
          title="Everything your website needs, under one roof."
          subtitle="Design, development, hosting, SEO, and ongoing care — handled by a team that owns the outcome end to end."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {services.map((s) => (
            <div key={s.title} className="bg-bg p-7 hover:bg-surface transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <s.icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-[16px] mb-2">{s.title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  PACKAGES
// ══════════════════════════════════════════════════════════════

function Packages() {
  return (
    <section id="packages" className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow="Packages"
          title="Clear pricing. No hidden costs."
          subtitle="Choose a package that fits where your business is today. Every plan includes design, build, deployment, and a real human you can talk to."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((p) => (
            <div key={p.name}
              className={`relative rounded-xl p-7 border transition-all ${
                p.highlighted
                  ? 'bg-gradient-to-b from-accent-muted to-surface border-accent/40 md:-translate-y-2 shadow-[0_20px_60px_rgba(94,141,181,0.15)]'
                  : 'bg-surface border-border hover:border-text-tertiary'
              }`}>
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <h3 className="font-display font-bold text-[20px] mb-1">{p.name}</h3>
              <p className="text-[12px] text-text-tertiary mb-5">{p.desc}</p>

              <div className="mb-6">
                <span className="font-display font-bold text-[36px] tracking-tight">{p.price}</span>
                <span className="text-[12px] text-text-tertiary ml-2">{p.priceUnit}</span>
              </div>

              <ul className="space-y-2.5 mb-7">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-text-secondary leading-relaxed">
                    <Check size={13} className="text-accent shrink-0 mt-1" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link to="/contact"
                className={`block text-center py-3 rounded-md text-[13px] font-semibold transition-all ${
                  p.highlighted
                    ? 'bg-accent hover:bg-accent-hover text-white'
                    : 'bg-elevated hover:bg-raised text-text-primary border border-border'
                }`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] text-text-tertiary">
          Need something different?{' '}
          <Link to="/contact" className="text-accent hover:text-accent-hover">Get a custom quote →</Link>
        </p>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  WHY CHOOSE
// ══════════════════════════════════════════════════════════════

function WhyChoose() {
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow="Why Cloz Digital"
          title="A premium agency without the bloated overhead."
          subtitle="We focus on the work that matters: design that reflects your business, code that performs, and ongoing care that keeps everything healthy."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {differentiators.map(d => (
            <div key={d.title} className="p-6 bg-surface border border-border rounded-xl hover:border-text-tertiary transition-colors">
              <d.icon size={18} className="text-accent mb-3" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[15px] mb-1.5">{d.title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  PROCESS
// ══════════════════════════════════════════════════════════════

function Process() {
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow="How we work"
          title="A clear process from first call to ongoing care."
          subtitle="Five focused stages. Defined deliverables. Honest communication every step."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {process.map((p) => (
            <div key={p.num} className="relative p-6 bg-surface border border-border rounded-xl">
              <span className="font-display font-bold text-[11px] text-accent tracking-wider">{p.num}</span>
              <p.icon size={18} className="text-text-secondary mt-3 mb-3" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[14px] mb-1.5">{p.title}</h3>
              <p className="text-[12px] text-text-tertiary leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  FAQ
// ══════════════════════════════════════════════════════════════

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[820px] mx-auto">
        <SectionHeader
          eyebrow="Common questions"
          title="Frequently asked questions."
          subtitle="Straight answers. If you don't see your question, just send us a note."
          centered
        />

        <div className="mt-12 space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg overflow-hidden">
              <button onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full text-left flex items-center justify-between gap-4 px-5 py-4 hover:bg-elevated transition-colors">
                <span className="text-[14px] font-medium text-text-primary">{f.q}</span>
                {open === i ? <Minus size={14} className="text-accent shrink-0" /> : <Plus size={14} className="text-text-tertiary shrink-0" />}
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-[13px] text-text-secondary leading-relaxed border-t border-border pt-4">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  FINAL CTA
// ══════════════════════════════════════════════════════════════

function FinalCTA() {
  return (
    <section className="py-24 md:py-32 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-muted via-surface to-surface border border-accent/20 p-10 md:p-16 text-center">
          <div className="absolute inset-0 pointer-events-none opacity-30" aria-hidden="true">
            <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full"
              style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 60%)' }} />
          </div>

          <div className="relative">
            <h2 className="font-display font-bold text-[32px] md:text-[44px] leading-tight tracking-tight max-w-[680px] mx-auto">
              Let's build something your customers actually use.
            </h2>
            <p className="mt-5 text-[15px] text-text-secondary max-w-[560px] mx-auto leading-relaxed">
              Book a free 30-minute consultation. We will review your business, your current site, and propose the right path forward — no obligation.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/contact"
                className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-7 py-3.5 rounded-md text-[14px] font-semibold transition-all hover:translate-y-[-1px]">
                Book a Free Consultation
                <ArrowUpRight size={15} />
              </Link>
              <a href="mailto:general@cloz.digital"
                className="inline-flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary px-5 py-3.5 text-[13px] font-medium transition-colors">
                <Mail size={13} />
                general@cloz.digital
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-x-6 gap-y-2 text-[11px] text-text-tertiary flex-wrap">
              <span className="flex items-center gap-1.5"><MapPin size={11} />Sarajevo, Bosnia and Herzegovina</span>
              <span className="flex items-center gap-1.5"><Languages size={11} />Bosnian · English</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  TRUST BAR — High-visibility band right below the hero
// ══════════════════════════════════════════════════════════════

function TrustBar() {
  const signals = [
    { icon: MessageCircle, label: 'Free consultation' },
    { icon: CheckCircle2,  label: 'Honest project assessment' },
    { icon: Clock,         label: 'Response within 24h' },
    { icon: Languages,     label: 'Bosnian & English' },
    { icon: ShieldCheck,   label: 'Hosting & maintenance' },
  ]
  return (
    <section className="border-y border-border bg-surface/60">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-x-8 gap-y-4 flex-wrap">
          {signals.map(s => (
            <div key={s.label} className="flex items-center gap-2 text-[12px] text-text-secondary">
              <s.icon size={14} className="text-accent shrink-0" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  RISK REVERSAL — Remove objections
// ══════════════════════════════════════════════════════════════

const riskReversals = [
  {
    icon: MessageCircle,
    title: 'No pressure consultations',
    desc: 'Book a free 30-minute call. We give you an honest assessment of what your business actually needs. If we are not the right fit, we will tell you.',
  },
  {
    icon: FileText,
    title: 'Transparent pricing',
    desc: 'Fixed, written quotes. No hidden fees, no inflated estimates, no surprise invoices. The price you agree to is the price you pay.',
  },
  {
    icon: Lock,
    title: 'You own everything',
    desc: 'Code, content, domain, hosting credentials — all yours. We do not lock you in. You can take your site to another provider any time.',
  },
  {
    icon: HeartPulse,
    title: 'Ongoing support — only if you want it',
    desc: 'Care plans are optional. Skip them, choose them, cancel them. We earn the relationship every month.',
  },
]

function RiskReversal() {
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow="Zero-risk start"
          title="Why working with us is a safe bet."
          subtitle="We've removed every reason to hesitate. There's no risk in starting a conversation with Cloz Digital."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskReversals.map(r => (
            <div key={r.title} className="bg-surface border border-border rounded-xl p-6 hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4">
                <r.icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-[16px] mb-2">{r.title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md text-[13px] font-semibold transition-all hover:translate-y-[-1px]">
            Book a Free Consultation
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-elevated hover:bg-raised border border-border text-text-primary px-6 py-3 rounded-md text-[13px] font-medium transition-colors">
            Request a Website Review
          </Link>
          <Link to="/contact"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary px-3 py-3 text-[13px] font-medium transition-colors">
            Get a Custom Proposal →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  BOOKING PLACEHOLDER — Reserved for future calendar integration
// ══════════════════════════════════════════════════════════════

function BookingPlaceholder() {
  return (
    <section className="py-16 px-6 border-t border-border bg-surface/40">
      <div className="max-w-[820px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-accent-muted border border-accent/20">
          <Calendar size={11} className="text-accent" />
          <span className="text-[11px] font-medium text-accent uppercase tracking-wider">Direct Booking</span>
        </div>
        <h2 className="font-display font-bold text-[26px] md:text-[32px] tracking-tight">
          Prefer to book directly?
        </h2>
        <p className="mt-4 text-[14px] text-text-secondary leading-relaxed max-w-[560px] mx-auto">
          Scheduled consultations are coming soon. For now, send us a quick note and we'll reply with a few times that work for both sides.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-3 rounded-md text-[13px] font-semibold transition-colors">
            <MessageCircle size={13} />
            Send a Message
          </Link>
          <a href="mailto:general@cloz.digital?subject=Consultation%20Request"
            className="inline-flex items-center gap-2 bg-elevated hover:bg-raised border border-border text-text-primary px-5 py-3 rounded-md text-[13px] font-medium transition-colors">
            <Mail size={13} />
            general@cloz.digital
          </a>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHARED
// ══════════════════════════════════════════════════════════════

function SectionHeader({ eyebrow, title, subtitle, centered }) {
  return (
    <div className={centered ? 'text-center' : ''}>
      {eyebrow && (
        <div className={`inline-block text-[11px] font-semibold uppercase tracking-[0.15em] text-accent mb-4`}>
          {eyebrow}
        </div>
      )}
      <h2 className="font-display font-bold text-[32px] md:text-[44px] leading-[1.1] tracking-tight max-w-[760px]">
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-5 text-[15px] md:text-[16px] text-text-secondary leading-relaxed max-w-[640px] ${centered ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
