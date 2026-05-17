import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '@/i18n/I18nProvider'

export default function AboutPage() {
  const t = useT()
  useEffect(() => { document.title = t('about.title') }, [t])

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[680px] mb-16">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">{t('about.eyebrow')}</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">{t('about.h1')}</h1>
          <p className="mt-6 text-[16px] text-text-secondary leading-relaxed">{t('about.p1')}</p>
          <p className="mt-4 text-[16px] text-text-secondary leading-relaxed">{t('about.p2')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {[1,2,3].map(n => (
            <div key={n} className="bg-surface border border-border rounded-lg p-6">
              <span className="text-[28px] font-display font-bold text-accent">{String(n).padStart(2,'0')}</span>
              <h3 className="font-display font-semibold text-[16px] mt-3 mb-2">{t(`about.p${n}.t`)}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{t(`about.p${n}.d`)}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 max-w-[680px]">
          <h2 className="font-display font-bold text-[22px] mb-4">{t('about.approach.t')}</h2>
          <div className="space-y-4 text-[14px] text-text-secondary leading-relaxed">
            <p>{t('about.approach.p1')}</p>
            <p>{t('about.approach.p2')}</p>
            <p>{t('about.approach.p3')}</p>
          </div>
          <a href="/contact" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-md transition-colors text-[13px] mt-6">
            {t('about.cta')} <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
