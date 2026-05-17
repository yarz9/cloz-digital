import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, ArrowRight, Check, Globe, Paintbrush, Shield, RefreshCw,
  Mail, Compass, PenTool, Code2, Rocket, HeartPulse,
  Plus, Minus, Sparkles, MapPin, Languages, Smartphone, Gauge, Clock,
  CheckCircle2, Lock, ShieldCheck, MessageCircle, FileText, Calendar, Search,
} from 'lucide-react'
import { useT } from '@/i18n/I18nProvider'

// ══════════════════════════════════════════════════════════════
//  HOMEPAGE — Production Landing Page (fully localized)
// ══════════════════════════════════════════════════════════════

export default function HomePage() {
  const t = useT()
  useEffect(() => { document.title = t('home.title') }, [t])

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
function Hero() {
  const t = useT()
  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 60%)' }} />
      </div>
      <div className="relative max-w-[1200px] mx-auto">
        <div className="max-w-[820px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-accent-muted border border-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] font-medium text-accent uppercase tracking-wider">{t('home.hero.eyebrow')}</span>
          </div>
          <h1 className="font-display font-bold text-[44px] md:text-[64px] leading-[1.05] tracking-tight">
            {t('home.hero.h1.line1')}<br />
            <span className="text-accent">{t('home.hero.h1.line2')}</span><br />
            {t('home.hero.h1.line3')}
          </h1>
          <p className="mt-7 text-[16px] md:text-[18px] text-text-secondary leading-relaxed max-w-[640px]">
            {t('home.hero.sub')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link to="/contact"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-md text-[14px] font-semibold transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(94,141,181,0.25)]">
              {t('home.hero.ctaPrimary')}
              <ArrowUpRight size={15} />
            </Link>
            <a href="#packages"
              className="inline-flex items-center justify-center gap-2 bg-elevated hover:bg-raised border border-border text-text-primary px-6 py-3.5 rounded-md text-[14px] font-medium transition-colors">
              {t('home.hero.ctaSecondary')}
              <ArrowRight size={14} />
            </a>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px] text-text-tertiary">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> {t('home.hero.trust1')}</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> {t('home.hero.trust2')}</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> {t('home.hero.trust3')}</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-accent" /> {t('home.hero.trust4')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBar() {
  const t = useT()
  const signals = [
    { icon: MessageCircle, label: t('home.trust.free') },
    { icon: CheckCircle2,  label: t('home.trust.honest') },
    { icon: Clock,         label: t('home.trust.response') },
    { icon: Languages,     label: t('home.trust.langs') },
    { icon: ShieldCheck,   label: t('home.trust.hostmaint') },
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

function Services() {
  const t = useT()
  const services = [
    { icon: Paintbrush, t: t('home.svc.design.t'),   d: t('home.svc.design.d') },
    { icon: RefreshCw,  t: t('home.svc.redesign.t'), d: t('home.svc.redesign.d') },
    { icon: Globe,      t: t('home.svc.hosting.t'),  d: t('home.svc.hosting.d') },
    { icon: Shield,     t: t('home.svc.maint.t'),    d: t('home.svc.maint.d') },
    { icon: Search,     t: t('home.svc.seo.t'),      d: t('home.svc.seo.d') },
    { icon: Mail,       t: t('home.svc.email.t'),    d: t('home.svc.email.d') },
    { icon: HeartPulse, t: t('home.svc.support.t'),  d: t('home.svc.support.d') },
  ]
  return (
    <section id="services" className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow={t('home.services.eyebrow')}
          title={t('home.services.title')}
          subtitle={t('home.services.sub')}
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {services.map((s) => (
            <div key={s.t} className="bg-bg p-7 hover:bg-surface transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <s.icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-[16px] mb-2">{s.t}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Packages() {
  const t = useT()
  const packages = [
    {
      name: t('home.pkg.launch.name'), price: '800 BAM', priceUnit: t('home.pkg.oneTime'),
      desc: t('home.pkg.launch.desc'),
      features: [
        t('home.pkg.launch.f1'), t('home.pkg.launch.f2'), t('home.pkg.launch.f3'),
        t('home.pkg.launch.f4'), t('home.pkg.launch.f5'), t('home.pkg.launch.f6'),
      ],
      cta: t('home.pkg.launch.cta'), highlighted: false,
    },
    {
      name: t('home.pkg.growth.name'), price: '1,500 BAM', priceUnit: t('home.pkg.oneTime'),
      desc: t('home.pkg.growth.desc'),
      features: [
        t('home.pkg.growth.f1'), t('home.pkg.growth.f2'), t('home.pkg.growth.f3'),
        t('home.pkg.growth.f4'), t('home.pkg.growth.f5'), t('home.pkg.growth.f6'),
        t('home.pkg.growth.f7'),
      ],
      cta: t('home.pkg.growth.cta'), highlighted: true,
    },
    {
      name: t('home.pkg.presence.name'), price: '200 BAM', priceUnit: t('home.pkg.perMonth'),
      desc: t('home.pkg.presence.desc'),
      features: [
        t('home.pkg.presence.f1'), t('home.pkg.presence.f2'), t('home.pkg.presence.f3'),
        t('home.pkg.presence.f4'), t('home.pkg.presence.f5'), t('home.pkg.presence.f6'),
      ],
      cta: t('home.pkg.presence.cta'), highlighted: false,
    },
  ]
  return (
    <section id="packages" className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow={t('home.pkg.eyebrow')}
          title={t('home.pkg.title')}
          subtitle={t('home.pkg.sub')}
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
                  {t('home.pkg.mostPopular')}
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
          {t('home.pkg.needDifferent')}{' '}
          <Link to="/contact" className="text-accent hover:text-accent-hover">{t('home.pkg.customQuote')}</Link>
        </p>
      </div>
    </section>
  )
}

function WhyChoose() {
  const t = useT()
  const differentiators = [
    { icon: Sparkles,   t: t('home.why.premium.t'),   d: t('home.why.premium.d') },
    { icon: Gauge,      t: t('home.why.fast.t'),      d: t('home.why.fast.d') },
    { icon: Smartphone, t: t('home.why.mobile.t'),    d: t('home.why.mobile.d') },
    { icon: Search,     t: t('home.why.seo.t'),       d: t('home.why.seo.d') },
    { icon: HeartPulse, t: t('home.why.support.t'),   d: t('home.why.support.d') },
    { icon: Languages,  t: t('home.why.bilingual.t'), d: t('home.why.bilingual.d') },
  ]
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow={t('home.why.eyebrow')}
          title={t('home.why.title')}
          subtitle={t('home.why.sub')}
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {differentiators.map(d => (
            <div key={d.t} className="p-6 bg-surface border border-border rounded-xl hover:border-text-tertiary transition-colors">
              <d.icon size={18} className="text-accent mb-3" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[15px] mb-1.5">{d.t}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{d.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Process() {
  const t = useT()
  const process = [
    { num: '01', icon: Compass,    t: t('home.proc.discovery.t'), d: t('home.proc.discovery.d') },
    { num: '02', icon: PenTool,    t: t('home.proc.design.t'),    d: t('home.proc.design.d') },
    { num: '03', icon: Code2,      t: t('home.proc.dev.t'),       d: t('home.proc.dev.d') },
    { num: '04', icon: Rocket,     t: t('home.proc.launch.t'),    d: t('home.proc.launch.d') },
    { num: '05', icon: HeartPulse, t: t('home.proc.care.t'),      d: t('home.proc.care.d') },
  ]
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow={t('home.proc.eyebrow')}
          title={t('home.proc.title')}
          subtitle={t('home.proc.sub')}
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {process.map((p) => (
            <div key={p.num} className="relative p-6 bg-surface border border-border rounded-xl">
              <span className="font-display font-bold text-[11px] text-accent tracking-wider">{p.num}</span>
              <p.icon size={18} className="text-text-secondary mt-3 mb-3" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[14px] mb-1.5">{p.t}</h3>
              <p className="text-[12px] text-text-tertiary leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const t = useT()
  const [open, setOpen] = useState(0)
  const faqs = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
    { q: t('home.faq.q4'), a: t('home.faq.a4') },
    { q: t('home.faq.q5'), a: t('home.faq.a5') },
    { q: t('home.faq.q6'), a: t('home.faq.a6') },
    { q: t('home.faq.q7'), a: t('home.faq.a7') },
  ]
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[820px] mx-auto">
        <SectionHeader
          eyebrow={t('home.faq.eyebrow')}
          title={t('home.faq.title')}
          subtitle={t('home.faq.sub')}
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

function RiskReversal() {
  const t = useT()
  const riskReversals = [
    { icon: MessageCircle, t: t('home.risk.r1.t'), d: t('home.risk.r1.d') },
    { icon: FileText,      t: t('home.risk.r2.t'), d: t('home.risk.r2.d') },
    { icon: Lock,          t: t('home.risk.r3.t'), d: t('home.risk.r3.d') },
    { icon: HeartPulse,    t: t('home.risk.r4.t'), d: t('home.risk.r4.d') },
  ]
  return (
    <section className="py-20 md:py-28 px-6 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow={t('home.risk.eyebrow')}
          title={t('home.risk.title')}
          subtitle={t('home.risk.sub')}
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskReversals.map(r => (
            <div key={r.t} className="bg-surface border border-border rounded-xl p-6 hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center mb-4">
                <r.icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-[16px] mb-2">{r.t}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{r.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md text-[13px] font-semibold transition-all hover:translate-y-[-1px]">
            {t('home.risk.ctaBook')}
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-elevated hover:bg-raised border border-border text-text-primary px-6 py-3 rounded-md text-[13px] font-medium transition-colors">
            {t('home.risk.ctaReview')}
          </Link>
          <Link to="/contact"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary px-3 py-3 text-[13px] font-medium transition-colors">
            {t('home.risk.ctaProposal')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function BookingPlaceholder() {
  const t = useT()
  return (
    <section className="py-16 px-6 border-t border-border bg-surface/40">
      <div className="max-w-[820px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-accent-muted border border-accent/20">
          <Calendar size={11} className="text-accent" />
          <span className="text-[11px] font-medium text-accent uppercase tracking-wider">{t('home.book.badge')}</span>
        </div>
        <h2 className="font-display font-bold text-[26px] md:text-[32px] tracking-tight">
          {t('home.book.title')}
        </h2>
        <p className="mt-4 text-[14px] text-text-secondary leading-relaxed max-w-[560px] mx-auto">
          {t('home.book.sub')}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-3 rounded-md text-[13px] font-semibold transition-colors">
            <MessageCircle size={13} />
            {t('home.book.send')}
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

function FinalCTA() {
  const t = useT()
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
              {t('home.cta.title')}
            </h2>
            <p className="mt-5 text-[15px] text-text-secondary max-w-[560px] mx-auto leading-relaxed">
              {t('home.cta.sub')}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/contact"
                className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-7 py-3.5 rounded-md text-[14px] font-semibold transition-all hover:translate-y-[-1px]">
                {t('home.cta.book')}
                <ArrowUpRight size={15} />
              </Link>
              <a href="mailto:general@cloz.digital"
                className="inline-flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary px-5 py-3.5 text-[13px] font-medium transition-colors">
                <Mail size={13} />
                general@cloz.digital
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-x-6 gap-y-2 text-[11px] text-text-tertiary flex-wrap">
              <span className="flex items-center gap-1.5"><MapPin size={11} />{t('footer.location')}</span>
              <span className="flex items-center gap-1.5"><Languages size={11} />{t('home.cta.bilingual')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

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
