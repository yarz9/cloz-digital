import { Check, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '@/i18n/I18nProvider'

export default function PackagesPage() {
  const t = useT()
  useEffect(() => { document.title = t('packages.title') }, [t])

  const packages = [
    {
      name: t('home.pkg.launch.name'), price: `${t('packages.from')} 800 BAM`, period: t('packages.launch.period'),
      desc: t('packages.launch.desc'),
      features: ['packages.launch.f1','packages.launch.f2','packages.launch.f3','packages.launch.f4','packages.launch.f5','packages.launch.f6'].map(k => t(k)),
      accent: false, best: false,
    },
    {
      name: t('home.pkg.growth.name'), price: `${t('packages.from')} 1,500 BAM`, period: t('packages.growth.period'),
      desc: t('packages.growth.desc'),
      features: ['packages.growth.f1','packages.growth.f2','packages.growth.f3','packages.growth.f4','packages.growth.f5','packages.growth.f6','packages.growth.f7','packages.growth.f8'].map(k => t(k)),
      accent: true, best: true,
    },
    {
      name: t('home.pkg.presence.name'), price: `${t('packages.from')} 200 BAM`, period: t('packages.presence.period'),
      desc: t('packages.presence.desc'),
      features: ['packages.presence.f1','packages.presence.f2','packages.presence.f3','packages.presence.f4','packages.presence.f5','packages.presence.f6','packages.presence.f7','packages.presence.f8'].map(k => t(k)),
      accent: false, best: false,
    },
  ]

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[600px] mb-16 mx-auto text-center">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">{t('packages.eyebrow')}</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">{t('packages.h1')}</h1>
          <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">{t('packages.sub')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {packages.map(pkg => (
            <div key={pkg.name} className={`p-7 rounded-lg border relative ${pkg.accent ? 'bg-accent-muted border-accent/30' : 'bg-surface border-border'}`}>
              {pkg.best && <span className="absolute -top-2.5 left-7 text-[10px] font-medium bg-accent text-white px-2.5 py-0.5 rounded">{t('home.pkg.mostPopular')}</span>}
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
                {t('packages.cta')} <ArrowRight size={13} />
              </a>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 max-w-[680px] mx-auto">
          <h2 className="font-display font-bold text-[20px] mb-4">{t('packages.notSure.t')}</h2>
          <p className="text-[14px] text-text-secondary leading-relaxed mb-4">{t('packages.notSure.d')}</p>
          <a href="/contact" className="inline-flex items-center gap-2 text-accent hover:text-accent-hover font-medium text-[14px]">
            {t('packages.notSure.cta')} <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
