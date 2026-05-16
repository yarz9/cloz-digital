import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './features/public/PublicLayout'
import HomePage from './features/public/HomePage'
import ServicesPage from './features/public/ServicesPage'
import WorkPage from './features/public/WorkPage'
import AboutPage from './features/public/AboutPage'
import ContactPage from './features/public/ContactPage'
import PackagesPage from './features/public/PackagesPage'
import WorkspaceLayout from './features/workspace/WorkspaceLayout'
import ManagementLayout from './features/management/ManagementLayout'

// Admin panel pages (existing)
import Dashboard from './features/dashboard/Dashboard'
import Scout from './features/scout/Scout'
import Clients from './features/clients/Clients'
import Billing from './features/billing/Billing'
import Status from './features/status/Status'
import Hosting from './features/hosting/Hosting'
import Maintenance from './features/maintenance/Maintenance'
import Instagram from './features/instagram/Instagram'
import Proposals from './features/proposals/Proposals'
import Outreach from './features/outreach/Outreach'
import Pipeline from './features/pipeline/Pipeline'
import Tasks from './features/tasks/Tasks'
import Reports from './features/reports/Reports'
import Knowledge from './features/knowledge/Knowledge'
import Analytics from './features/analytics/Analytics'
import CommandCenter from './features/command/CommandCenter'
import AdminSettings from './features/settings/AdminSettings'

// Management panel pages
import ManagementDashboard from './features/management/ManagementDashboard'
import LeadScoring from './features/management/LeadScoring'
import Onboarding from './features/management/Onboarding'
import ClientHealth from './features/management/ClientHealth'
import Communications from './features/management/Communications'
import Revenue from './features/management/Revenue'
import Payments from './features/management/Payments'
import SLATracker from './features/management/SLATracker'
import SocialPlanner from './features/management/SocialPlanner'
import SEODashboard from './features/management/SEODashboard'
import CompetitorIntel from './features/management/CompetitorIntel'
import AIInsights from './features/management/AIInsights'
import ManagementCalendar from './features/management/ManagementCalendar'
import ManagementSettings from './features/management/ManagementSettings'

// AI System pages (reused in management)
import AIProvider from './features/ai/AIProvider'
import AIPrompts from './features/ai/AIPrompts'
import AISchemas from './features/ai/AISchemas'
import AITools from './features/ai/AITools'
import AIFeatures from './features/ai/AIFeatures'
import AITests from './features/ai/AITests'
import AILogs from './features/ai/AILogs'
import AIHealth from './features/ai/AIHealth'
import AISettings from './features/ai/AISettings'
import AuditLab from './features/audit/AuditLab'
import Mail from './features/mail/Mail'
import MailAccounts from './features/settings/MailAccounts'
import Logs from './features/logs/Logs'
import Inquiries from './features/management/Inquiries'

export default function App() {
  return (
    <Routes>
      {/* ═══ Public Website ═══ */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="work" element={<WorkPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="packages" element={<PackagesPage />} />
      </Route>

      {/* ═══ Business Admin Panel (legacy, still functional) ═══ */}
      <Route path="/admin" element={<WorkspaceLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="scout" element={<Scout />} />
        <Route path="clients" element={<Clients />} />
        <Route path="billing" element={<Billing />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="mail" element={<Mail />} />
        <Route path="status" element={<Status />} />
        <Route path="hosting" element={<Hosting />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="content" element={<Instagram />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="reports" element={<Reports />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="command" element={<CommandCenter />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="settings/mail-accounts" element={<MailAccounts />} />
        <Route path="logs" element={<Logs />} />
      </Route>

      {/* ═══ Management Panel (primary business hub) ═══ */}
      <Route path="/management" element={<ManagementLayout />}>
        {/* Command & Overview */}
        <Route index element={<ManagementDashboard />} />
        <Route path="command" element={<CommandCenter />} />
        <Route path="calendar" element={<ManagementCalendar />} />

        {/* Sales & Growth */}
        <Route path="scout" element={<Scout />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="leads" element={<LeadScoring />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="competitor" element={<CompetitorIntel />} />

        {/* Mail */}
        <Route path="mail" element={<Mail />} />

        {/* Client Management */}
        <Route path="clients" element={<Clients />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="health" element={<ClientHealth />} />
        <Route path="communications" element={<Communications />} />

        {/* Financial */}
        <Route path="billing" element={<Billing />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="payments" element={<Payments />} />

        {/* Operations */}
        <Route path="status" element={<Status />} />
        <Route path="hosting" element={<Hosting />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="sla" element={<SLATracker />} />

        {/* Content & Marketing */}
        <Route path="content" element={<Instagram />} />
        <Route path="social" element={<SocialPlanner />} />
        <Route path="seo" element={<SEODashboard />} />

        {/* Intelligence */}
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="insights" element={<AIInsights />} />
        <Route path="audit" element={<AuditLab />} />

        {/* System & AI */}
        <Route path="ai/provider" element={<AIProvider />} />
        <Route path="ai/prompts" element={<AIPrompts />} />
        <Route path="ai/tools" element={<AITools />} />
        <Route path="ai/features" element={<AIFeatures />} />
        <Route path="ai/tests" element={<AITests />} />
        <Route path="ai/logs" element={<AILogs />} />
        <Route path="logs" element={<Logs />} />
        <Route path="ai/health" element={<AIHealth />} />
        <Route path="settings" element={<ManagementSettings />} />
        <Route path="settings/mail-accounts" element={<MailAccounts />} />
        <Route path="inquiries" element={<Inquiries />} />
      </Route>

      {/* ═══ /ai → /management redirect ═══ */}
      <Route path="/ai" element={<Navigate to="/management" replace />} />
      <Route path="/ai/*" element={<Navigate to="/management" replace />} />
    </Routes>
  )
}
