// ShortcutsHelp — pressing `?` (outside an input) shows a sheet of every
// global shortcut. Lightweight, no deps.

import { useEffect, useState } from 'react'
import { X, Command } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open the Command Palette' },
  { keys: ['?'],      label: 'Show this shortcuts list' },
  { keys: ['esc'],    label: 'Close the palette or a panel' },
  { keys: ['↑', '↓'], label: 'Navigate items in the palette' },
  { keys: ['↵'],      label: 'Select the highlighted item' },
  { keys: ['g', 'd'], label: 'Go to Dashboard (in palette: type "dash")' },
  { keys: ['g', 's'], label: 'Go to Service Desk' },
  { keys: ['g', 'k'], label: 'Go to Knowledge Center' },
]

export function ShortcutsHelpProvider({ children }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target
      const inField = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if (inField || target?.isContentEditable) return
      if (e.key === '?') { e.preventDefault(); setOpen(o => !o) }
      else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {children}
      {open && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative glass-elevated rounded-xl w-full max-w-[460px] p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-[15px] flex items-center gap-2"><Command size={14} className="text-accent" /> Keyboard shortcuts</h3>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary"><X size={15} /></button>
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map(s => (
                <div key={s.label} className="flex items-center justify-between py-1.5 text-[12px]">
                  <span className="text-text-secondary">{s.label}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, i) => <kbd key={i} className="kbd">{k}</kbd>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
