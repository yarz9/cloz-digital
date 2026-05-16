import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, FolderOpen, Receipt, Server,
  FileCheck, FileSignature, Wrench, Sparkles, BookOpen, LogOut,
  Loader2, Palette, Send,
} from 'lucide-react'
import { portal, getToken, getCachedClient, setCachedClient, clearPortalSession } from '@/lib/portalApi'

// ══════════════════════════════════════════════════════════════
//  PORTAL LAYOUT — Wraps every portal page with auth + nav
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

export default function PortalLayout() {
  const navigate = useNavigate()
  const [client, setClient] = useState(getCachedClient())
  const [loading, setLoading] = useState(!client)

  useEffect(() => {
    if (!getToken()) {
      navigate('/portal/login', { replace: true })
      return
    }
    // Refresh client info from server
    portal.me().then(({ client: c }) => {
      setClient(c)
      setCachedClient(c)
      setLoading(false)
    }).catch(() => {
      clearPortalSession()
      navigate('/portal/login', { replace: true })
    })
  }, []) // eslint-disable-line

  const handleLogout = useCallback(async () => {
    try { await portal.logout() } catch {}
    clearPortalSession()
    navigate('/portal/login', { replace: true })
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-accent" />
      </div>
    )
  }

  if (!client) return null

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
              <img src={client.logo_url} alt={client.business_name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center text-[12px] font-display font-bold text-white"
                style={{ background: client.brand_colors?.accent || '#5E8DB5' }}>
                {client.business_name?.charAt(0).toUpperCase() || 'C'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium truncate">{client.business_name}</div>
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
