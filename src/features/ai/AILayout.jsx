import { Outlet, NavLink } from 'react-router-dom'
import {
  Zap, LayoutDashboard, Server, FileText, Database, Wrench,
  ToggleLeft, TestTube, ScrollText, Activity, Settings, Globe, Users
} from 'lucide-react'

const nav = [
  { to: '/ai', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/ai/provider', icon: Server, label: 'Provider' },
  { to: '/ai/prompts', icon: FileText, label: 'Prompts' },
  { to: '/ai/schemas', icon: Database, label: 'Schemas' },
  { to: '/ai/tools', icon: Wrench, label: 'Tools' },
  { to: '/ai/features', icon: ToggleLeft, label: 'Features' },
  { to: '/ai/tests', icon: TestTube, label: 'Test Center' },
  { to: '/ai/logs', icon: ScrollText, label: 'Logs' },
  { to: '/ai/health', icon: Activity, label: 'Health' },
  { to: '/ai/settings', icon: Settings, label: 'Settings' },
]

export default function AILayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 shrink-0 flex flex-col bg-surface border-r border-border overflow-y-auto">
        <div className="px-5 h-14 flex items-center border-b border-border">
          <Zap size={16} className="text-accent mr-2" />
          <span className="font-display font-semibold text-[15px] text-text-primary tracking-tight">
            AI Panel
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-muted text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`
              }
            >
              <item.icon size={15} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 space-y-1">
          <NavLink
            to="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-text-tertiary hover:text-text-secondary hover:bg-elevated transition-colors"
          >
            <Users size={14} strokeWidth={1.8} />
            <span>Business Admin</span>
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

      <main className="flex-1 overflow-y-auto bg-bg">
        <Outlet />
      </main>
    </div>
  )
}
