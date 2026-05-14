import { useState } from 'react'
import { Sparkles, Plus, History, Star, ArrowRight, Globe, Search, Zap, Shield, Smartphone, Layout, Eye, Target, Crown, Wrench, Users, FileText, BarChart3 } from 'lucide-react'
import { useAuditStore } from '@/stores/audit'
import ReviewLauncher from './ReviewLauncher'
import ReviewDetail from './ReviewDetail'
import ReviewHistory from './ReviewHistory'

const views = { launcher: 'launcher', history: 'history', detail: 'detail' }

export default function AuditLab() {
  const reviews = useAuditStore(s => s.reviews)
  const activeReview = useAuditStore(s => s.activeReview)
  const setActiveReview = useAuditStore(s => s.setActiveReview)
  const [view, setView] = useState(views.launcher)

  const openReview = (review) => {
    setActiveReview(review)
    setView(views.detail)
  }

  const backToLauncher = () => {
    setActiveReview(null)
    setView(views.launcher)
  }

  // Detail view
  if (view === views.detail && activeReview) {
    return <ReviewDetail review={activeReview} onBack={backToLauncher} />
  }

  // History view
  if (view === views.history) {
    return <ReviewHistory onBack={() => setView(views.launcher)} onOpenReview={openReview} />
  }

  // Main launcher view
  const recentReviews = reviews.slice(0, 5)
  const avgScore = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + (r.overall_score || 0), 0) / reviews.length)
    : null

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] flex items-center gap-2">
            <Sparkles size={20} className="text-accent" />
            Audit Lab
          </h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            AI-powered website review + Claude build prompt generator · {reviews.length} review{reviews.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        {reviews.length > 0 && (
          <button onClick={() => setView(views.history)} className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border text-text-secondary px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
            <History size={13} /> Review History
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Total Reviews</span>
          <div className="text-[22px] font-display font-bold mt-1">{reviews.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Avg. Score</span>
          <div className={`text-[22px] font-display font-bold mt-1 ${avgScore !== null ? (avgScore >= 70 ? 'text-success' : avgScore >= 50 ? 'text-warning' : 'text-error') : 'text-text-tertiary'}`}>
            {avgScore !== null ? avgScore : '—'}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Starred</span>
          <div className="text-[22px] font-display font-bold mt-1 text-warning">{reviews.filter(r => r.is_starred).length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Linked to Entities</span>
          <div className="text-[22px] font-display font-bold mt-1 text-accent">{reviews.filter(r => r.linked_entity_type).length}</div>
        </div>
      </div>

      {/* Core concept callout */}
      <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold">Grok Reviews → Claude Builds</h3>
            <p className="text-[12px] text-text-secondary mt-1 leading-relaxed max-w-2xl">
              Submit any website URL and Grok will review it — analyzing quality, scoring every category, identifying problems, and ranking priorities.
              Then it generates a ready-to-use Claude prompt you can copy-paste directly into Claude Code to start building or improving.
            </p>
          </div>
        </div>
      </div>

      {/* Launcher */}
      <ReviewLauncher onReviewComplete={openReview} />

      {/* Review modes guide */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold mb-4">Review Modes</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { key: 'standard', label: 'Standard', desc: 'Full balanced review', icon: Search, color: 'text-accent' },
            { key: 'fast', label: 'Fast', desc: 'Quick key-issues scan', icon: Zap, color: 'text-warning' },
            { key: 'deep', label: 'Deep Dive', desc: 'Exhaustive analysis', icon: Eye, color: 'text-info' },
            { key: 'homepage', label: 'Homepage Only', desc: 'First impression audit', icon: Layout, color: 'text-accent' },
            { key: 'redesign', label: 'Redesign', desc: 'Full rebuild assessment', icon: Wrench, color: 'text-error' },
            { key: 'conversion', label: 'Conversion', desc: 'CTA & funnel focus', icon: Target, color: 'text-success' },
            { key: 'trust', label: 'Trust', desc: 'Credibility signals', icon: Shield, color: 'text-info' },
            { key: 'mobile', label: 'Mobile', desc: 'Mobile experience', icon: Smartphone, color: 'text-warning' },
            { key: 'local_business', label: 'Local Biz', desc: 'Local business signals', icon: Globe, color: 'text-accent' },
            { key: 'luxury', label: 'Premium', desc: 'Luxury design standard', icon: Crown, color: 'text-warning' },
            { key: 'competitor', label: 'Competitor', desc: 'Competitive analysis', icon: Users, color: 'text-error' },
            { key: 'quick_fix', label: 'Quick Fixes', desc: 'Low-effort wins only', icon: Zap, color: 'text-success' },
            { key: 'client_report', label: 'Client Report', desc: 'Shareable summary', icon: FileText, color: 'text-accent' },
            { key: 'claude_prompt', label: 'Prompt Focus', desc: 'Max Claude prompt quality', icon: Sparkles, color: 'text-accent' },
          ].map(m => (
            <div key={m.key} className="p-3 rounded-lg bg-elevated hover:bg-raised border border-transparent hover:border-border transition-colors cursor-default">
              <m.icon size={14} className={`${m.color} mb-1.5`} />
              <div className="text-[11px] font-medium">{m.label}</div>
              <div className="text-[10px] text-text-tertiary">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <div className="bg-surface border border-border rounded-lg">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-[14px] font-semibold">Recent Reviews</h3>
            <button onClick={() => setView(views.history)} className="text-[11px] text-accent hover:text-accent-hover font-medium">
              View All →
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentReviews.map(r => (
              <button key={r.id} onClick={() => openReview(r)} className="w-full px-5 py-3 flex items-center gap-4 hover:bg-elevated/50 transition-colors text-left">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-bold font-mono ${
                  r.overall_score >= 70 ? 'bg-success/10 text-success' : r.overall_score >= 50 ? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'
                }`}>
                  {r.overall_score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium truncate">{r.business_name || r.website_url}</span>
                    {r.is_starred && <Star size={11} className="text-warning fill-warning" />}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-2">
                    <span className="font-mono">{r.website_url}</span>
                    <span>·</span>
                    <span className="capitalize">{r.review_mode}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-text-tertiary" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
