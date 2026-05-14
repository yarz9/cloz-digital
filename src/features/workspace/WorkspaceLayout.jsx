import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, Users, Receipt, Globe, Server,
  Wrench, Palette, FileText, BookOpen, BarChart3, Settings, Command,
  Send, GitBranch, CheckSquare, FileBarChart, Target, Building2
} from 'lucide-react'

const nav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/command', icon: Command, label: 'Command Center' },
  { to: '/admin/scout', icon: Search, label: 'Client Scout' },
  { to: '/admin/pipeline', icon: GitBranch, label: 'CRM Pipeline' },
  { to: '/admin/clients', icon: Users, label: 'Clients' },
  { to: '/admin/proposals', icon: FileText, label: 'Proposals' },
  { to: '/admin/outreach', icon: Send, label: 'Outreach' },
  { to: '/admin/billing', icon: Receipt, label: 'Billing' },
]

const navOps = [
  { to: '/admin/status', icon: Globe, label: 'Website Status' },
  { to: '/admin/hosting', icon: Server, label: 'Hosting & Domains' },
  { to: '/admin/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
]

const navTools = [
  { to: '/admin/content', icon: Palette, label: 'Content Studio' },
  { to: '/admin/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/admin/knowledge', icon: BookOpen, label: 'Knowledge' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function WorkspaceLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-surface border-r border-border overflow-y-auto">
        {/* Brand */}
        <div className="px-5 h-14 flex items-center border-b border-border">
          <span className="font-display font-semibold text-[15px] text-text-primary tracking-tight">
            Cloz Digital
          </span>
          <span className="ml-auto text-[10px] font-medium text-text-tertiary bg-elevated px-1.5 py-0.5 rounded">
            ADMIN
          </span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}

          <div className="pt-4 pb-2">
            <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Operations
            </span>
          </div>

          {navOps.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}

          <div className="pt-4 pb-2">
            <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Tools
            </span>
          </div>

          {navTools.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Footer links */}
        <div className="px-3 pb-4 space-y-1">
          <NavLink
            to="/management"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-text-tertiary hover:text-accent hover:bg-elevated transition-colors"
          >
            <Building2 size={14} strokeWidth={1.8} />
            <span>Management</span>
          </NavLink>
          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-text-tertiary hover:text-text-secondary hover:bg-elevated transition-colors"
          >
            <Globe size={14} strokeWidth={1.8} />
            <span>Public Site</span>
          </a>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-bg">
        <Outlet />
      </main>
    </div>
  )
}

function SidebarLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
          isActive
            ? 'bg-accent-muted text-accent'
            : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
        }`
      }
    >
      <Icon size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  )
}
