import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ManagementLogin from './ManagementLogin'
import {
  LayoutDashboard, Command, Search, GitBranch, Users, FileText, Send, Receipt,
  Globe, Server, Wrench, CheckSquare, Palette, FileBarChart, BookOpen, BarChart3,
  Settings, Zap, Target, UserPlus, HeartPulse, MessageSquare, DollarSign,
  CreditCard, PieChart, Shield, Share2, Compass, Brain, Activity,
  Database, ToggleLeft, TestTube, ScrollText, ChevronDown, ChevronRight,
  Sparkles, Building2, Calendar, TrendingUp, Eye, Scan, Mail
} from 'lucide-react'

const sections = [
  {
    title: 'Command',
    items: [
      { to: '/management', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/management/command', icon: Command, label: 'Command Center' },
      { to: '/management/calendar', icon: Calendar, label: 'Calendar' },
    ]
  },
  {
    title: 'Sales & Growth',
    items: [
      { to: '/management/scout', icon: Search, label: 'Client Scout' },
      { to: '/management/pipeline', icon: GitBranch, label: 'CRM Pipeline' },
      { to: '/management/leads', icon: Target, label: 'Lead Scoring' },
      { to: '/management/proposals', icon: FileText, label: 'Proposals' },
      { to: '/management/outreach', icon: Send, label: 'Outreach' },
      { to: '/management/competitor', icon: Eye, label: 'Competitor Intel' },
    ]
  },
  {
    title: 'Communication',
    items: [
      { to: '/management/mail', icon: Mail, label: 'Mail' },
    ]
  },
  {
    title: 'Client Management',
    items: [
      { to: '/management/clients', icon: Users, label: 'Clients' },
      { to: '/management/onboarding', icon: UserPlus, label: 'Onboarding' },
      { to: '/management/health', icon: HeartPulse, label: 'Client Health' },
      { to: '/management/communications', icon: MessageSquare, label: 'Communications' },
    ]
  },
  {
    title: 'Financial',
    items: [
      { to: '/management/billing', icon: Receipt, label: 'Invoicing' },
      { to: '/management/revenue', icon: DollarSign, label: 'Revenue' },
      { to: '/management/payments', icon: CreditCard, label: 'Payments' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/management/status', icon: Globe, label: 'Site Monitoring' },
      { to: '/management/hosting', icon: Server, label: 'Hosting & Domains' },
      { to: '/management/maintenance', icon: Wrench, label: 'Maintenance' },
      { to: '/management/tasks', icon: CheckSquare, label: 'Task Manager' },
      { to: '/management/sla', icon: Shield, label: 'SLA Tracker' },
    ]
  },
  {
    title: 'Content & Marketing',
    items: [
      { to: '/management/content', icon: Palette, label: 'Content Studio' },
      { to: '/management/social', icon: Share2, label: 'Social Planner' },
      { to: '/management/seo', icon: Compass, label: 'SEO Dashboard' },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/management/audit', icon: Scan, label: 'Audit Lab' },
      { to: '/management/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/management/reports', icon: FileBarChart, label: 'Reports' },
      { to: '/management/knowledge', icon: BookOpen, label: 'Knowledge Base' },
      { to: '/management/insights', icon: Brain, label: 'AI Insights' },
    ]
  },
  {
    title: 'System & AI',
    items: [
      { to: '/management/ai/provider', icon: Zap, label: 'AI Provider' },
      { to: '/management/ai/prompts', icon: FileText, label: 'Prompt Templates' },
      { to: '/management/ai/tools', icon: Database, label: 'AI Tools' },
      { to: '/management/ai/features', icon: ToggleLeft, label: 'Feature Flags' },
      { to: '/management/ai/tests', icon: TestTube, label: 'Test Center' },
      { to: '/management/ai/logs', icon: ScrollText, label: 'System Logs' },
      { to: '/management/ai/health', icon: Activity, label: 'Health Monitor' },
      { to: '/management/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

export default function ManagementLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState({})
  const [authenticated, setAuthenticated] = useState(null) // null = checking, true/false

  useEffect(() => {
    fetch('/api/management/auth/status')
      .then(r => r.json())
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return <ManagementLogin onAuthenticated={() => setAuthenticated(true)} />
  }

  const toggle = (title) => setCollapsed(prev => ({ ...prev, [title]: !prev[title] }))

  // Auto-expand section that contains current route
  const activeSection = sections.find(s => s.items.some(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  ))?.title

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-surface border-r border-border overflow-y-auto">
        {/* Brand header */}
        <div className="px-5 h-14 flex items-center border-b border-border shrink-0">
          <Building2 size={16} className="text-accent mr-2" />
          <span className="font-display font-semibold text-[15px] text-text-primary tracking-tight">
            Cloz Digital
          </span>
          <span className="ml-auto text-[9px] font-bold text-accent bg-accent-muted px-1.5 py-0.5 rounded tracking-wider">
            MGT
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {sections.map(section => {
            const isCollapsed = collapsed[section.title] && section.title !== activeSection
            return (
              <div key={section.title}>
                <button
                  onClick={() => toggle(section.title)}
                  className="w-full flex items-center justify-between px-3 py-1.5 mt-2 mb-0.5"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {section.title}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight size={10} className="text-text-tertiary" />
                  ) : (
                    <ChevronDown size={10} className="text-text-tertiary" />
                  )}
                </button>
                {!isCollapsed && section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-muted text-accent'
                          : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                      }`
                    }
                  >
                    <item.icon size={14} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border shrink-0 space-y-1">
          <NavLink
            to="/admin"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[11px] text-text-tertiary hover:text-text-secondary hover:bg-elevated transition-colors"
          >
            <LayoutDashboard size={13} strokeWidth={1.8} />
            <span>Admin Panel</span>
          </NavLink>
          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[11px] text-text-tertiary hover:text-text-secondary hover:bg-elevated transition-colors"
          >
            <Globe size={13} strokeWidth={1.8} />
            <span>Public Site</span>
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-bg">
        <Outlet />
      </main>
    </div>
  )
}
