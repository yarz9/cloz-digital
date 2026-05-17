// Command Palette (⌘K) — pluggable action registry, fuzzy search,
// keyboard-first. Hand-built so no extra deps; rivals cmdk on UX.
//
// Usage:
//   import { CommandPaletteProvider, useCommandPalette } from '@/components/ui/CommandPalette'
//   // wrap app once with <CommandPaletteProvider>
//   const { open, registerActions } = useCommandPalette()
//   useEffect(() => registerActions([{ id: 'foo', label: 'Foo', perform: () => {…} }]), [])

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ArrowRight, CornerDownLeft, ChevronUp, ChevronDown, Command,
  LayoutDashboard, Users, BookOpen, Headphones, FileText, Mail, Globe,
  Server, Wrench, Shield, Languages, BarChart3, Database, Inbox,
  ShieldCheck, GraduationCap, BookMarked, Sparkles, Search as SearchIcon,
} from 'lucide-react'

const Ctx = createContext({ open: () => {}, close: () => {}, registerActions: () => () => {} })

const DEFAULT_ACTIONS = [
  // Navigation — Management
  { id: 'nav.dashboard',      label: 'Dashboard',           hint: 'Management overview',           group: 'Navigate', to: '/management',               icon: LayoutDashboard, keywords: 'home overview' },
  { id: 'nav.service-desk',   label: 'Service Desk',        hint: 'Client request inbox',          group: 'Navigate', to: '/management/service-desk',  icon: Inbox },
  { id: 'nav.mail',           label: 'Mail',                hint: 'IMAP inbox',                    group: 'Navigate', to: '/management/mail',          icon: Mail },
  { id: 'nav.scout',          label: 'Client Scout',        hint: 'Find new prospects',            group: 'Navigate', to: '/management/scout',         icon: SearchIcon },
  { id: 'nav.pipeline',       label: 'Pipeline',            hint: 'CRM pipeline',                  group: 'Navigate', to: '/management/pipeline',      icon: Users },
  { id: 'nav.clients',        label: 'Clients',             hint: 'CRM clients',                   group: 'Navigate', to: '/management/clients',       icon: Users },
  { id: 'nav.portal-clients', label: 'Portal Access',       hint: 'Portal client accounts',        group: 'Navigate', to: '/management/portal-clients',icon: Shield },
  { id: 'nav.knowledge',      label: 'Knowledge Center',    hint: 'KB + Academy + Copilot',        group: 'Navigate', to: '/management/knowledge',     icon: BookOpen },
  { id: 'nav.operations',     label: 'Operations',          hint: 'SOPs + workflows',              group: 'Navigate', to: '/management/operations',    icon: Wrench },
  { id: 'nav.legal',          label: 'Legal & Compliance',  hint: 'Templates + consent log',       group: 'Navigate', to: '/management/legal',         icon: Shield },
  { id: 'nav.localization',   label: 'Localization',        hint: 'Translations',                  group: 'Navigate', to: '/management/localization',  icon: Languages },
  { id: 'nav.persistence',    label: 'Persistence Center',  hint: 'Storage health + backups',      group: 'Navigate', to: '/management/persistence',   icon: ShieldCheck },
  { id: 'nav.analytics',      label: 'Analytics',           hint: 'Performance metrics',           group: 'Navigate', to: '/management/analytics',     icon: BarChart3 },
  { id: 'nav.revenue',        label: 'Revenue',             hint: 'Financial dashboard',           group: 'Navigate', to: '/management/revenue',       icon: BarChart3 },
  { id: 'nav.seo',            label: 'SEO Dashboard',       hint: 'Local + technical SEO',         group: 'Navigate', to: '/management/seo',           icon: Globe },
  { id: 'nav.marketing',      label: 'Marketing OS',        hint: 'Campaigns + content',           group: 'Navigate', to: '/management/marketing',     icon: BarChart3 },
  { id: 'nav.content',        label: 'Content Studio',      hint: 'AI design + Instagram',         group: 'Navigate', to: '/management/content',       icon: Sparkles },
  // Portal
  { id: 'nav.portal',         label: 'Client Portal',       hint: 'Open the public portal',        group: 'Open', to: '/portal',                       icon: Server },
  { id: 'nav.public-site',    label: 'Public Site',         hint: 'cloz.digital',                  group: 'Open', to: '/',                             icon: Globe },
  // Common actions (placeholders — pages can register more)
  { id: 'action.new-client',  label: 'Onboard a portal client', hint: 'Create + send welcome',     group: 'Create', to: '/management/portal-clients',  icon: Users },
  { id: 'action.new-article', label: 'New knowledge article',   hint: 'Open the KB editor',        group: 'Create', to: '/management/knowledge',       icon: BookMarked },
  { id: 'action.snapshot',    label: 'Take a backup snapshot',  hint: 'Persistence Center → Backups', group: 'Create', to: '/management/persistence',   icon: Database },
  { id: 'action.copilot',     label: 'Ask the AI Copilot',      hint: 'Knowledge Center → AI Copilot', group: 'Create', to: '/management/knowledge',   icon: Sparkles },
]

export function CommandPaletteProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [registry, setRegistry] = useState(DEFAULT_ACTIONS)

  const registerActions = useCallback((actions) => {
    setRegistry(prev => {
      // de-dup by id
      const map = new Map(prev.map(a => [a.id, a]))
      for (const a of actions) map.set(a.id, a)
      return Array.from(map.values())
    })
    return () => setRegistry(prev => prev.filter(a => !actions.find(b => b.id === a.id)))
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const meta = isMac ? e.metaKey : e.ctrlKey
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); setOpen(true)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const api = useMemo(() => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
    registerActions,
  }), [registerActions])

  return (
    <Ctx.Provider value={api}>
      {children}
      {open && <Palette actions={registry} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}

export function useCommandPalette() { return useContext(Ctx) }

// ── Palette UI ────────────────────────────────────────────────
function Palette({ actions, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim()
    if (!term) return actions
    // Simple fuzzy: include if every char in term is present in order
    return actions.filter(a => {
      const hay = `${a.label} ${a.hint || ''} ${a.keywords || ''} ${a.group || ''}`.toLowerCase()
      let i = 0
      for (const ch of term) {
        const idx = hay.indexOf(ch, i)
        if (idx < 0) return false
        i = idx + 1
      }
      return true
    })
  }, [q, actions])

  // Group results
  const grouped = useMemo(() => {
    const out = {}
    for (const a of filtered) {
      const g = a.group || 'Actions'
      ;(out[g] ||= []).push(a)
    }
    return out
  }, [filtered])

  // Flat list for keyboard cursor
  const flat = useMemo(() => filtered, [filtered])
  useEffect(() => { setCursor(0) }, [q])

  const run = useCallback((action) => {
    onClose()
    if (action.perform) { try { action.perform() } catch (e) { console.error(e) } }
    else if (action.to) navigate(action.to)
  }, [navigate, onClose])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[cursor]) run(flat[cursor]) }
  }

  let runningIndex = -1

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-[640px] glass-elevated rounded-xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={15} className="text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, anything…"
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary placeholder:text-text-tertiary"
          />
          <kbd className="kbd">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Search size={24} className="mx-auto text-text-tertiary mb-2" />
              <p className="text-[12px] text-text-secondary">No matches for <span className="text-text-primary font-medium">"{q}"</span></p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{group}</div>
                {items.map(a => {
                  runningIndex++
                  const active = runningIndex === cursor
                  const Icon = a.icon || ArrowRight
                  return (
                    <button
                      key={a.id}
                      onClick={() => run(a)}
                      onMouseEnter={() => setCursor(runningIndex)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] transition-colors ${
                        active ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
                      }`}>
                      <Icon size={14} className={active ? 'text-accent' : 'text-text-tertiary'} />
                      <span className="flex-1 truncate">{a.label}</span>
                      {a.hint && <span className={`text-[11px] truncate max-w-[200px] ${active ? 'text-accent/80' : 'text-text-tertiary'}`}>{a.hint}</span>}
                      {active && <CornerDownLeft size={11} className="text-accent" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-border text-[11px] text-text-tertiary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="kbd"><ChevronUp size={9} /></kbd><kbd className="kbd"><ChevronDown size={9} /></kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="kbd"><CornerDownLeft size={9} /></kbd> select</span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={9} /> <kbd className="kbd">K</kbd> open anywhere
          </span>
        </div>
      </div>
    </div>
  )
}
