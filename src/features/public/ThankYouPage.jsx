import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Mail, Clock, ArrowUpRight, ArrowLeft } from 'lucide-react'
import { useT } from '@/i18n/I18nProvider'

export default function ThankYouPage() {
  const t = useT()
  const [params] = useSearchParams()
  const inquiryId = params.get('id') || ''
  const name = params.get('name') || ''

  useEffect(() => { document.title = t('ty.title') }, [t])

  return (
    <section className="pt-32 pb-24 px-6 min-h-[80vh]">
      <div className="max-w-[720px] mx-auto">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-full bg-success/15 animate-ping opacity-60" />
            <div className="relative w-20 h-20 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-success" />
            </div>
          </div>

          <h1 className="mt-8 font-display font-bold text-[36px] md:text-[48px] leading-tight tracking-tight">
            {name ? `${t('ty.h1.with')} ${name.split(' ')[0]}.` : t('ty.h1.without')}
          </h1>
          <p className="mt-5 text-[15px] md:text-[16px] text-text-secondary leading-relaxed max-w-[520px] mx-auto">
            {t('ty.sub.a')}{' '}
            <strong className="text-accent">{t('ty.sub.bold')}</strong>{' '}
            {t('ty.sub.c')}
          </p>
        </div>

        <div className="mt-12 bg-surface border border-border rounded-2xl p-6 md:p-8">
          <h2 className="font-display font-semibold text-[15px] mb-5 flex items-center gap-2">
            <Clock size={15} className="text-accent" />
            {t('ty.next')}
          </h2>
          <ol className="space-y-4">
            <Step num="1" title={t('ty.s1.t')}>{t('ty.s1.d')}</Step>
            <Step num="2" title={t('ty.s2.t')}>{t('ty.s2.d')}</Step>
            <Step num="3" title={t('ty.s3.t')}>{t('ty.s3.d')}</Step>
            <Step num="4" title={t('ty.s4.t')}>{t('ty.s4.d')}</Step>
          </ol>
        </div>

        <div className="mt-8 bg-surface/60 border border-border rounded-xl p-5 text-center">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">{t('ty.reachUs')}</strong>{' '}
            {t('ty.reachVerb')}{' '}
            <a href="mailto:general@cloz.digital" className="text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1">
              general@cloz.digital
              <Mail size={12} />
            </a>
          </p>
          {inquiryId && (
            <p className="mt-2 text-[10px] text-text-tertiary font-mono">
              {t('ty.reference')} {inquiryId.slice(0, 8)}
            </p>
          )}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md text-[13px] font-semibold transition-colors">
            <ArrowLeft size={13} />
            {t('ty.back')}
          </Link>
          <Link to="/packages"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary px-4 py-3 text-[13px] font-medium transition-colors">
            {t('ty.viewPkg')}
            <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-[11px] text-text-tertiary leading-relaxed max-w-[480px] mx-auto">
            {t('ty.trustFoot')}
          </p>
        </div>
      </div>
    </section>
  )
}

function Step({ num, title, children }) {
  return (
    <li className="flex items-start gap-4">
      <div className="w-7 h-7 rounded-full bg-accent-muted text-accent text-[12px] font-bold font-display flex items-center justify-center shrink-0">
        {num}
      </div>
      <div className="flex-1">
        <h3 className="text-[13px] font-semibold text-text-primary">{title}</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mt-0.5">{children}</p>
      </div>
    </li>
  )
}
