// First-visit full-screen language gate. Blocks the page until a choice is made.

import { useI18n } from './I18nProvider'
import { LANGUAGE_LABELS } from './dictionary'
import { Globe, ArrowRight, Sparkles } from 'lucide-react'

export default function WelcomeLanguageModal() {
  const { hasPreference, setLanguage, detected, t, ready } = useI18n()

  if (!ready || hasPreference) return null

  const pick = (l) => setLanguage(l)

  return (
    <div className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="welcome-headline">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 60%)' }} />
      </div>

      <div className="relative max-w-[560px] w-full bg-surface border border-border rounded-2xl p-8 md:p-10 shadow-[0_40px_120px_rgba(0,0,0,0.6)] animate-scale-in">
        {/* Brand */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-muted flex items-center justify-center">
            <Globe size={26} className="text-accent" />
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-accent-muted border border-accent/20">
            <Sparkles size={11} className="text-accent" />
            <span className="text-[11px] font-medium text-accent uppercase tracking-wider">
              {t('welcome.eyebrow')}
            </span>
          </div>

          <h1 id="welcome-headline" className="font-display font-bold text-[28px] md:text-[34px] leading-tight tracking-tight text-text-primary">
            <span>Choose your language</span><br />
            <span className="text-accent">Odaberite jezik</span>
          </h1>

          <p className="mt-4 text-[14px] text-text-secondary leading-relaxed">
            Choose your preferred language to continue.<br />
            <span className="text-text-tertiary">Odaberite željeni jezik da nastavite.</span>
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <LangButton
            onClick={() => pick('en')}
            highlighted={detected === 'en'}
            flag={LANGUAGE_LABELS.en.flag}
            label="English"
            sub="Continue in English"
            detected={detected === 'en'}
            detectedLabel="Detected"
          />
          <LangButton
            onClick={() => pick('bcs')}
            highlighted={detected === 'bcs'}
            flag={LANGUAGE_LABELS.bcs.flag}
            label="Bosanski / Hrvatski / Srpski"
            sub="Nastavi na bosanskom"
            detected={detected === 'bcs'}
            detectedLabel="Prepoznato"
          />
        </div>

        <p className="mt-7 text-center text-[11px] text-text-tertiary leading-relaxed">
          You can change this any time from the header or footer.<br />
          Ovo možete promijeniti u bilo kojem trenutku.
        </p>
      </div>
    </div>
  )
}

function LangButton({ onClick, highlighted, flag, label, sub, detected, detectedLabel }) {
  return (
    <button onClick={onClick}
      className={`group relative text-left p-5 rounded-xl border transition-all hover:translate-y-[-2px] ${
        highlighted
          ? 'bg-accent-muted border-accent/40 hover:border-accent/60 shadow-[0_10px_40px_rgba(94,141,181,0.15)]'
          : 'bg-elevated border-border hover:border-accent/40'
      }`}>
      {detected && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-1.5 py-0.5 rounded">
          {detectedLabel}
        </span>
      )}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[28px] leading-none">{flag}</span>
        <div className="flex-1">
          <div className="font-display font-semibold text-[15px] text-text-primary">{label}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[12px] text-text-secondary">{sub}</span>
        <ArrowRight size={14} className="text-accent group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  )
}
