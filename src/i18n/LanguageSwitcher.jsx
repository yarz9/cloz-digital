// Compact EN | BHS switcher used in header + footer of the public site.

import { useI18n } from './I18nProvider'
import { LANGUAGE_LABELS, SUPPORTED } from './dictionary'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher({ variant = 'header' }) {
  const { lang, setLanguage } = useI18n()

  if (variant === 'footer') {
    return (
      <div className="inline-flex items-center gap-1 text-[12px] text-text-tertiary">
        <Globe size={11} className="mr-1" />
        {SUPPORTED.map((l, i) => (
          <span key={l} className="flex items-center">
            <button onClick={() => setLanguage(l)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                lang === l ? 'text-text-primary font-semibold' : 'hover:text-text-secondary'
              }`}>
              {LANGUAGE_LABELS[l].short}
            </button>
            {i < SUPPORTED.length - 1 && <span className="text-text-tertiary/40">·</span>}
          </span>
        ))}
      </div>
    )
  }

  // header pill (default)
  return (
    <div className="inline-flex items-center bg-elevated border border-border rounded-full p-0.5 text-[11px]"
      role="group" aria-label="Language">
      {SUPPORTED.map(l => (
        <button key={l} onClick={() => setLanguage(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 rounded-full transition-all font-medium ${
            lang === l
              ? 'bg-accent text-white shadow-[0_2px_8px_rgba(94,141,181,0.3)]'
              : 'text-text-tertiary hover:text-text-primary'
          }`}>
          {LANGUAGE_LABELS[l].short}
        </button>
      ))}
    </div>
  )
}
