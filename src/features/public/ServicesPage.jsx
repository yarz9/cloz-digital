import { Paintbrush, RefreshCw, Globe, Shield, Monitor, Zap, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '@/i18n/I18nProvider'

export default function ServicesPage() {
  const t = useT()
  useEffect(() => { document.title = t('services.title') }, [t])

  const services = [
    { icon: Paintbrush, title: t('services.s1.t'), desc: t('services.s1.d'), details: ['services.s1.d1','services.s1.d2','services.s1.d3','services.s1.d4','services.s1.d5'].map(k => t(k)) },
    { icon: RefreshCw,  title: t('services.s2.t'), desc: t('services.s2.d'), details: ['services.s2.d1','services.s2.d2','services.s2.d3','services.s2.d4','services.s2.d5'].map(k => t(k)) },
    { icon: Globe,      title: t('services.s3.t'), desc: t('services.s3.d'), details: ['services.s3.d1','services.s3.d2','services.s3.d3','services.s3.d4','services.s3.d5'].map(k => t(k)) },
    { icon: Shield,     title: t('services.s4.t'), desc: t('services.s4.d'), details: ['services.s4.d1','services.s4.d2','services.s4.d3','services.s4.d4','services.s4.d5'].map(k => t(k)) },
    { icon: Monitor,    title: t('services.s5.t'), desc: t('services.s5.d'), details: ['services.s5.d1','services.s5.d2','services.s5.d3','services.s5.d4','services.s5.d5'].map(k => t(k)) },
    { icon: Zap,        title: t('services.s6.t'), desc: t('services.s6.d'), details: ['services.s6.d1','services.s6.d2','services.s6.d3','services.s6.d4','services.s6.d5'].map(k => t(k)) },
  ]

  return (
    <div className="pt-24 pb-20 px-6 section-glow">
      <div className="relative max-w-[1200px] mx-auto">
        <div className="max-w-[680px] mb-16 animate-fade-up">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">{t('services.eyebrow')}</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">
            <span className="text-gradient">{t('services.h1')}</span>
          </h1>
          <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">{t('services.sub')}</p>
        </div>

        <div className="space-y-4">
          {services.map((s, i) => (
            <div key={s.title}
              className={`card-premium with-sheen grid md:grid-cols-2 gap-8 !p-8 animate-fade-up stagger-${(i % 6) + 1}`}>
              <div>
                <div className="w-11 h-11 rounded-lg bg-accent-muted flex items-center justify-center mb-4">
                  <s.icon size={20} className="text-accent" strokeWidth={1.6} />
                </div>
                <h2 className="font-display font-bold text-[22px] mb-3">{s.title}</h2>
                <p className="text-[14px] text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
              <div>
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-tertiary mb-4">{t('services.includes')}</h3>
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
          <a href="/contact" className="button-premium focus-ring">
            {t('services.cta')} <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  )
}
