// Global toast system. Stacked, dismissible, CSS-animated.
//
// Usage:
//   import { ToastProvider, useToast } from '@/components/ui/Toast'
//   // wrap app once with <ToastProvider>
//   const toast = useToast()
//   toast.success('Saved')
//   toast.error('Something went wrong', { description: '…' })
//   toast.info('FYI', { action: { label: 'Undo', onClick: () => {…} } })

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const Ctx = createContext({ push: () => {}, dismiss: () => {} })

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}
const TONES = {
  success: 'border-success/30 text-success',
  error:   'border-error/30 text-error',
  warning: 'border-warning/30 text-warning',
  info:    'border-accent/30 text-accent',
}

let _id = 0

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const dismiss = useCallback((id) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((kind, message, opts = {}) => {
    const id = ++_id
    const t = {
      id, kind, message,
      description: opts.description,
      action: opts.action,
      duration: opts.duration ?? (kind === 'error' ? 6000 : 3500),
    }
    setItems(prev => [...prev, t])
    if (t.duration > 0) setTimeout(() => dismiss(id), t.duration)
    return id
  }, [dismiss])

  const api = {
    push,
    dismiss,
    success: (m, o) => push('success', m, o),
    error:   (m, o) => push('error', m, o),
    warning: (m, o) => push('warning', m, o),
    info:    (m, o) => push('info', m, o),
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <Toaster items={items} dismiss={dismiss} />
    </Ctx.Provider>
  )
}

export function useToast() { return useContext(Ctx) }

function Toaster({ items, dismiss }) {
  if (!items.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {items.map(t => {
        const Icon = ICONS[t.kind] || Info
        return (
          <div key={t.id}
            className={`glass-elevated rounded-lg px-3.5 py-2.5 pr-3 min-w-[260px] max-w-[420px] border ${TONES[t.kind]} pointer-events-auto animate-slide-in-right`}>
            <div className="flex items-start gap-2.5">
              <Icon size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-text-primary leading-tight">{t.message}</div>
                {t.description && (
                  <div className="text-[11px] text-text-secondary mt-0.5 leading-snug">{t.description}</div>
                )}
                {t.action && (
                  <button onClick={() => { t.action.onClick(); dismiss(t.id) }}
                    className="mt-1.5 text-[11px] font-semibold text-accent hover:text-accent-hover">
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-text-tertiary hover:text-text-primary p-0.5">
                <X size={11} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
