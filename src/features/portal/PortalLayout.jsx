import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, FolderOpen, Receipt, Server,
  FileCheck, FileSignature, Wrench, Sparkles, BookOpen, LogOut,
  Loader2, Palette, Send, AlertCircle, RefreshCw,
} from 'lucide-react'
import { portal, getToken, getCachedClient, setCachedClient, clearPortalSession } from '@/lib/portalApi'

// ══════════════════════════════════════════════════════════════
//  PORTAL LAYOUT — Auth guard + branded loading + sidebar
// ══════════════════════════════════════════════════════════════

const NAV = [
  { to: '/portal/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portal/support',      icon: MessageSquare,   label: 'Support' },
  { to: '/portal/assets',       icon: FolderOpen,      label: 'Assets' },
  { to: '/portal/billing',      icon: Receipt,         label: 'Billing' },
  { to: '/portal/hosting',      icon: Server,          label: 'Hosting' },
  { to: '/portal/approvals',    icon: FileCheck,       label: 'Approvals' },
  { to: '/portal/proposals',    icon: FileSignature,   label: 'Proposals' },
  { to: '/portal/maintenance',  icon: Wrench,          label: 'Maintenance' },
  { to: '/portal/messages',     icon: Send,            label: 'Messages' },
  { to: '/portal/studio',       icon: Palette,         label: 'Content Studio' },
  { to: '/portal/assistant',    icon: Sparkles,        label: 'AI Assistant' },
  { to: '/portal/knowledge',    icon: BookOpen,        label: 'Knowledge' },
]

// Top-level state machine: initializing → ready / unauthenticated / error
export default function PortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [client, setClient] = useState(null)
  const [phase, setPhase] = useState('initializing')  // initializing | ready | unauthenticated | error
  const [error, setError] = useState('')

  const init = useCallback(async () => {
    setPhase('initializing')
    setError('')

    // No token at all → straight to login
    if (!getToken()) {
      setPhase('unauthenticated')
      return
    }

    // Optimistically use cached client while we verify with the server
    const cached = getCachedClient()
    if (cached && cached.id) {
      setClient(cached)
    }

    try {
      const res = await portal.me()
      const fresh = res?.client
      if (!fresh || !fresh.id) {
        // Server says no valid session — treat as unauthenticated
        clearPortalSession()
        setPhase('unauthenticated')
        return
      }
      setClient(fresh)
      setCachedClient(fresh)
      setPhase('ready')
    } catch (e) {
      // 401 → session is already cleared by portalApi; treat as unauthenticated
      if (e?.status === 401) {
        setPhase('unauthenticated')
        return
      }
      // Anything else (500, network, timeout) → show retry UI but keep token
      setError(e?.message || 'Could not load your portal. Please retry.')
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    init()
  }, [init])

  // Redirect on unauthenticated
  useEffect(() => {
    if (phase === 'unauthenticated') {
      navigate('/portal/login', { replace: true, state: { from: location.pathname } })
    }
  }, [phase, navigate, location.pathname])

  const handleLogout = useCallback(async () => {
    try { await portal.logout() } catch {}
    clearPortalSession()
    navigate('/portal/login', { replace: true })
  }, [navigate])

  if (phase === 'initializing' || phase === 'unauthenticated') {
    return <BrandedLoadingScreen />
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center mb-4">
            <AlertCircle size={26} className="text-error" />
          </div>
          <h1 className="font-display font-bold text-[20px] mb-2">Couldn't load your portal</h1>
          <p className="text-[13px] text-text-secondary leading-relaxed mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button onClick={init}
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-md text-[13px] font-semibold">
              <RefreshCw size={13} />Retry
            </button>
            <button onClick={handleLogout}
              className="inline-flex items-center gap-1.5 bg-elevated hover:bg-raised text-text-secondary px-5 py-2.5 rounded-md text-[13px] font-medium">
              <LogOut size={13} />Sign out
            </button>
          </div>
          <p className="text-[11px] text-text-tertiary mt-6">
            Need help? Email{' '}
            <a href="mailto:general@cloz.digital" className="text-accent hover:text-accent-hover">general@cloz.digital</a>
          </p>
        </div>
      </div>
    )
  }

  // phase === 'ready' AND client is non-null
  if (!client) {
    // Defensive fallback — should never happen, but never render nothing
    return <BrandedLoadingScreen />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col overflow-y-auto">
        {/* Brand */}
        <div className="px-4 h-14 flex items-center border-b border-border shrink-0">
          <span className="font-display font-semibold text-[14px] text-text-primary">Cloz Digital</span>
          <span className="ml-auto text-[8px] font-bold text-accent bg-accent-muted px-1.5 py-0.5 rounded tracking-wider">PORTAL</span>
        </div>

        {/* Client identity */}
        <div className="p-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={client.business_name || 'Client'}
                onError={e => { e.currentTarget.style.display = 'none' }}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center text-[12px] font-display font-bold text-white"
                style={{ background: client.brand_colors?.accent || '#5E8DB5' }}>
                {(client.business_name || 'C').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium truncate">{client.business_name || 'Client'}</div>
              <div className="text-[10px] text-text-tertiary truncate">{client.package || 'Client'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                isActive ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`}>
              <item.icon size={13} />{item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border shrink-0">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-text-tertiary hover:text-error hover:bg-error/5 transition-colors">
            <LogOut size={13} />Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ client, setClient }} />
      </main>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  BRANDED LOADING SCREEN — always visible, never a blank page
// ══════════════════════════════════════════════════════════════

function BrandedLoadingScreen() {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-4">
      <div className="text-center">
        <div className="relative inline-flex mb-6">
          <div className="absolute inset-0 rounded-2xl bg-accent/15 animate-ping opacity-60" />
          <div className="relative w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Loader2 size={22} className="text-accent animate-spin" />
          </div>
        </div>
        <h1 className="font-display font-bold text-[20px] mb-1">Cloz Digital</h1>
        <p className="text-[13px] text-text-secondary">Preparing your client portal…</p>
      </div>
    </div>
  )
}
