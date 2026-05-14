import { useState } from 'react'
import {
  ArrowLeft, Star, Copy, Check, Globe, Sparkles, Target, Shield, Smartphone, Eye, Layout,
  AlertTriangle, CheckCircle, Zap, TrendingUp, Package, ChevronDown, ChevronRight,
  FileText, Users, Link2, RefreshCw, Loader2, Crown
} from 'lucide-react'
import { useAuditStore } from '@/stores/audit'
import { useStore } from '@/stores/management'
import { audit } from '@/lib/api'

// ─── Score color helper ───
function scoreColor(score) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-error'
}
function scoreBg(score) {
  if (score >= 80) return 'bg-success/10 text-success'
  if (score >= 60) return 'bg-warning/10 text-warning'
  return 'bg-error/10 text-error'
}

// ─── Copy button component ───
function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
        copied ? 'bg-success/10 text-success' : 'bg-elevated hover:bg-raised border border-border text-text-secondary'
      }`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ─── Category score bar ───
function CategoryBar({ label, score }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-text-secondary w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-error'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-[12px] font-mono font-bold w-8 text-right ${scoreColor(score)}`}>{score}</span>
    </div>
  )
}

// ─── Prompt type definitions ───
const promptTypes = [
  { key: 'short', label: 'Short Prompt', desc: 'Quick build direction' },
  { key: 'detailed', label: 'Detailed Prompt', desc: 'Comprehensive build plan' },
  { key: 'full_rebuild', label: 'Full Rebuild', desc: 'Complete project brief' },
  { key: 'homepage', label: 'Homepage Only', desc: 'Redesign homepage' },
  { key: 'design', label: 'Design Only', desc: 'Visual improvements' },
  { key: 'copy_rewrite', label: 'Copy Rewrite', desc: 'Content & messaging' },
  { key: 'conversion', label: 'Conversion', desc: 'CTA & funnel fixes' },
  { key: 'trust', label: 'Trust Upgrade', desc: 'Credibility improvements' },
  { key: 'mobile', label: 'Mobile Fix', desc: 'Mobile experience' },
  { key: 'premium_redesign', label: 'Premium Redesign', desc: 'Luxury-level rebuild' },
]

export default function ReviewDetail({ review, onBack }) {
  const starReview = useAuditStore(s => s.starReview)
  const linkReview = useAuditStore(s => s.linkReview)
  const updateReview = useAuditStore(s => s.updateReview)
  const clients = useStore(s => s.clients)
  const leads = useStore(s => s.leads)
  const addTask = useStore(s => s.addTask)
  const addProposal = useStore(s => s.addProposal)

  const [activePromptType, setActivePromptType] = useState('detailed')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState(null)
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [activeTab, setActiveTab] = useState('scores')

  const r = review
  const cats = r.category_scores || {}

  // Get the right prompt text
  const getPromptText = () => {
    if (customPrompt && customPrompt.type === activePromptType) return customPrompt.text
    if (activePromptType === 'short') return r.claude_prompt_short || ''
    if (activePromptType === 'detailed') return r.claude_prompt_detailed || ''
    if (activePromptType === 'full_rebuild') return r.claude_prompt_full_rebuild || ''
    return customPrompt?.text || ''
  }

  // Generate a new prompt variant
  const generateVariant = async (type) => {
    setGeneratingPrompt(true)
    setActivePromptType(type)
    try {
      const result = await audit.generatePrompt({
        reviewData: r,
        promptType: type,
        url: r.website_url,
        businessName: r.business_name,
        niche: r.niche,
        location: r.location,
      })
      setCustomPrompt({ type, text: result.prompt, desc: result.target_description })
    } catch (err) {
      setCustomPrompt({ type, text: `Error generating prompt: ${err.message}`, desc: 'Error' })
    } finally {
      setGeneratingPrompt(false)
    }
  }

  // Create tasks from priorities
  const createTasksFromReview = () => {
    const priorities = r.major_priorities || []
    priorities.forEach(p => {
      addTask({
        title: p.priority,
        priority: p.effort === 'high' ? 'high' : p.effort === 'medium' ? 'medium' : 'low',
        client: r.business_name || '',
        module: 'maintenance',
        due: '',
      })
    })
  }

  // Convert to proposal outline
  const createProposalFromReview = () => {
    addProposal({
      client: r.business_name || 'Unknown',
      package: r.package_fit || 'Launch Care',
      value: r.package_fit === 'Growth Care' ? 1500 : r.package_fit === 'Presence Care' ? 650 : 800,
      description: `Based on AI review (score: ${r.overall_score}/100). Key focus: ${r.recommended_focus || 'General improvements'}. ${(r.quick_wins || []).slice(0, 3).join('; ')}`,
    })
  }

  const promptText = getPromptText()

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-elevated rounded-md transition-colors">
            <ArrowLeft size={16} className="text-text-tertiary" />
          </button>
          <div>
            <h1 className="font-display font-bold text-[18px] flex items-center gap-2">
              {r.business_name || r.website_url}
              <span className="text-[11px] font-mono text-text-tertiary font-normal">{r.id}</span>
            </h1>
            <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-2">
              <Globe size={10} /> {r.website_url}
              <span>·</span>
              <span className="capitalize">{r.review_mode} review</span>
              <span>·</span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
              {r.latencyMs && <><span>·</span><span>{(r.latencyMs / 1000).toFixed(1)}s</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => starReview(r.id)} className={`p-1.5 rounded-md transition-colors ${r.is_starred ? 'text-warning' : 'text-text-tertiary hover:text-warning'}`}>
            <Star size={16} className={r.is_starred ? 'fill-warning' : ''} />
          </button>
          <button onClick={() => setShowLinkPanel(!showLinkPanel)} className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-elevated hover:bg-raised border border-border text-text-secondary transition-colors">
            <Link2 size={11} /> Link
          </button>
          <button onClick={createTasksFromReview} className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-elevated hover:bg-raised border border-border text-text-secondary transition-colors">
            <CheckCircle size={11} /> Create Tasks
          </button>
          <button onClick={createProposalFromReview} className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-elevated hover:bg-raised border border-border text-text-secondary transition-colors">
            <FileText size={11} /> Create Proposal
          </button>
        </div>
      </div>

      {/* Link panel */}
      {showLinkPanel && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[12px] font-semibold mb-2">Link this review to:</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-text-tertiary">Client</label>
              <select
                onChange={e => { if (e.target.value) linkReview(r.id, 'client', e.target.value) }}
                className="w-full bg-elevated border border-border rounded-md px-2 py-1.5 text-[12px] mt-0.5"
              >
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-tertiary">Lead</label>
              <select
                onChange={e => { if (e.target.value) linkReview(r.id, 'lead', e.target.value) }}
                className="w-full bg-elevated border border-border rounded-md px-2 py-1.5 text-[12px] mt-0.5"
              >
                <option value="">Select lead...</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          {r.linked_entity_type && (
            <p className="text-[10px] text-success mt-2">Linked to {r.linked_entity_type}: {r.linked_entity_id}</p>
          )}
        </div>
      )}

      {/* ═══ Hero Score Card ═══ */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2 bg-surface border border-border rounded-xl p-6 flex items-center gap-6">
          <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-[36px] font-display font-bold ${scoreBg(r.overall_score)}`}>
            {r.overall_score}
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary block mb-1">Overall Score</span>
            <span className={`text-[16px] font-semibold ${scoreColor(r.overall_score)}`}>
              {r.overall_score >= 80 ? 'Good' : r.overall_score >= 60 ? 'Needs Work' : r.overall_score >= 40 ? 'Poor' : 'Critical'}
            </span>
            <div className="text-[10px] text-text-tertiary mt-1">Confidence: {r.confidence_score || '—'}%</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-text-tertiary block">Opportunity</span>
          <div className={`text-[24px] font-display font-bold mt-1 ${scoreColor(r.opportunity_score || 0)}`}>{r.opportunity_score || '—'}</div>
          <span className="text-[10px] text-text-tertiary">business fit</span>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-text-tertiary block">Urgency</span>
          <div className={`text-[24px] font-display font-bold mt-1 ${scoreColor(r.urgency_score || 0)}`}>{r.urgency_score || '—'}</div>
          <span className="text-[10px] text-text-tertiary">needs work now</span>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-text-tertiary block">Redesign Worth</span>
          <div className={`text-[24px] font-display font-bold mt-1 ${scoreColor(r.redesign_worthiness || 0)}`}>{r.redesign_worthiness || '—'}</div>
          <span className="text-[10px] text-text-tertiary">rebuild value</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-[13px] text-text-secondary leading-relaxed">{r.summary}</p>
      </div>

      {/* Package fit bar */}
      <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={16} className="text-accent" />
          <div>
            <span className="text-[12px] font-semibold">Recommended: {r.package_fit || 'Launch Care'}</span>
            <span className="text-[11px] text-text-secondary ml-2">— {r.package_fit_reason || ''}</span>
          </div>
        </div>
        <span className="text-[11px] font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-md">{r.package_fit}</span>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'scores', label: 'Category Scores', icon: Target },
          { key: 'findings', label: 'Findings', icon: Eye },
          { key: 'business', label: 'Business Intel', icon: TrendingUp },
          { key: 'prompts', label: 'Claude Prompts', icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Category Scores ═══ */}
      {activeTab === 'scores' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h3 className="text-[14px] font-semibold mb-4">Category Breakdown</h3>
          <CategoryBar label="Clarity" score={cats.clarity || 0} />
          <CategoryBar label="Trust" score={cats.trust || 0} />
          <CategoryBar label="Visual Quality" score={cats.visual_quality || 0} />
          <CategoryBar label="Structure" score={cats.structure || 0} />
          <CategoryBar label="Conversion Readiness" score={cats.conversion_readiness || 0} />
          <CategoryBar label="Mobile Readiness" score={cats.mobile_readiness || 0} />
          <CategoryBar label="Brand Consistency" score={cats.brand_consistency || 0} />
          <CategoryBar label="Service Explanation" score={cats.service_explanation || 0} />
          <CategoryBar label="Contact Path Quality" score={cats.contact_path_quality || 0} />
          <CategoryBar label="Content Quality" score={cats.content_quality || 0} />
          <CategoryBar label="Professionalism" score={cats.professionalism || 0} />
          <CategoryBar label="Technical Confidence" score={cats.technical_confidence || 0} />
        </div>
      )}

      {/* ═══ Tab: Findings ═══ */}
      {activeTab === 'findings' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-success flex items-center gap-1.5 mb-3">
              <CheckCircle size={14} /> Strengths
            </h3>
            <div className="space-y-2.5">
              {(r.strengths || []).map((s, i) => (
                <div key={i} className="p-3 bg-success/5 rounded-lg border border-success/10">
                  <span className="text-[12px] font-medium text-success">{s.point}</span>
                  <p className="text-[11px] text-text-secondary mt-0.5">{s.detail}</p>
                </div>
              ))}
              {(!r.strengths || r.strengths.length === 0) && (
                <p className="text-[11px] text-text-tertiary">No strengths identified</p>
              )}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-error flex items-center gap-1.5 mb-3">
              <AlertTriangle size={14} /> Weaknesses
            </h3>
            <div className="space-y-2.5">
              {(r.weaknesses || []).map((w, i) => (
                <div key={i} className="p-3 bg-error/5 rounded-lg border border-error/10">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-medium text-error">{w.point}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                      w.severity === 'critical' ? 'bg-error/20 text-error' :
                      w.severity === 'high' ? 'bg-error/10 text-error' :
                      w.severity === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-elevated text-text-tertiary'
                    }`}>{w.severity}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{w.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Wins */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-warning flex items-center gap-1.5 mb-3">
              <Zap size={14} /> Quick Wins
            </h3>
            <div className="space-y-1.5">
              {(r.quick_wins || []).map((q, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-warning/5 rounded-md border border-warning/10">
                  <span className="text-[10px] font-bold text-warning bg-warning/20 w-5 h-5 rounded flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-[12px] text-text-secondary">{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Major Priorities */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-accent flex items-center gap-1.5 mb-3">
              <Target size={14} /> Major Priorities
            </h3>
            <div className="space-y-2">
              {(r.major_priorities || []).map((p, i) => (
                <div key={i} className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12px] font-medium">{p.priority}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                      p.effort === 'high' ? 'bg-error/10 text-error' :
                      p.effort === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    }`}>{p.effort} effort</span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{p.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Tab: Business Intelligence ═══ */}
      {activeTab === 'business' && (
        <div className="space-y-4">
          {/* Priority blocks */}
          <div className="grid lg:grid-cols-3 gap-3">
            {r.what_matters_most && (
              <div className="bg-surface border border-accent/20 rounded-xl p-5">
                <h4 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">What Matters Most</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.what_matters_most}</p>
              </div>
            )}
            {r.what_to_fix_first && (
              <div className="bg-surface border border-warning/20 rounded-xl p-5">
                <h4 className="text-[11px] font-semibold text-warning uppercase tracking-wider mb-2">What to Fix First</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.what_to_fix_first}</p>
              </div>
            )}
            {r.what_to_sell && (
              <div className="bg-surface border border-success/20 rounded-xl p-5">
                <h4 className="text-[11px] font-semibold text-success uppercase tracking-wider mb-2">What to Sell</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.what_to_sell}</p>
              </div>
            )}
          </div>

          {/* Detailed summaries */}
          <div className="grid lg:grid-cols-2 gap-4">
            {r.business_opportunity_notes && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2 flex items-center gap-1.5"><TrendingUp size={13} className="text-accent" /> Business Opportunity</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.business_opportunity_notes}</p>
              </div>
            )}
            {r.recommended_focus && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2 flex items-center gap-1.5"><Target size={13} className="text-accent" /> Recommended Focus</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.recommended_focus}</p>
              </div>
            )}
            {r.copy_weakness_summary && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2">Copy Weaknesses</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.copy_weakness_summary}</p>
              </div>
            )}
            {r.cta_weakness_summary && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2">CTA Weaknesses</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.cta_weakness_summary}</p>
              </div>
            )}
            {r.service_clarity_summary && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2">Service Clarity</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.service_clarity_summary}</p>
              </div>
            )}
            {r.visual_hierarchy_summary && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2">Visual Hierarchy</h4>
                <p className="text-[12px] text-text-secondary leading-relaxed">{r.visual_hierarchy_summary}</p>
              </div>
            )}
          </div>

          {/* Lists */}
          <div className="grid lg:grid-cols-2 gap-4">
            {(r.upsell_recommendations?.length > 0) && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2 text-success">Upsell Opportunities</h4>
                <ul className="space-y-1">{r.upsell_recommendations.map((u, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                    <span className="text-success mt-0.5">•</span> {u}
                  </li>
                ))}</ul>
              </div>
            )}
            {(r.maintenance_opportunities?.length > 0) && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2">Maintenance Opportunities</h4>
                <ul className="space-y-1">{r.maintenance_opportunities.map((m, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">•</span> {m}
                  </li>
                ))}</ul>
              </div>
            )}
            {(r.hosting_domain_issues?.length > 0) && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2 text-warning">Hosting/Domain Issues</h4>
                <ul className="space-y-1">{r.hosting_domain_issues.map((h, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                    <span className="text-warning mt-0.5">•</span> {h}
                  </li>
                ))}</ul>
              </div>
            )}
            {(r.trust_compliance_gaps?.length > 0) && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h4 className="text-[12px] font-semibold mb-2 text-error">Trust/Compliance Gaps</h4>
                <ul className="space-y-1">{r.trust_compliance_gaps.map((t, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                    <span className="text-error mt-0.5">•</span> {t}
                  </li>
                ))}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab: Claude Prompts ═══ */}
      {activeTab === 'prompts' && (
        <div className="space-y-4">
          {/* Prompt header */}
          <div className="bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-accent" />
              <span className="text-[13px] font-semibold">Claude Build Prompts</span>
            </div>
            <p className="text-[11px] text-text-secondary">Select a prompt type below, then copy-paste directly into Claude Code. Each type targets a different scope of work.</p>
          </div>

          {/* Prompt type selector */}
          <div className="flex flex-wrap gap-1.5">
            {promptTypes.map(pt => {
              const hasBuiltIn = pt.key === 'short' || pt.key === 'detailed' || pt.key === 'full_rebuild'
              const isActive = activePromptType === pt.key
              return (
                <button
                  key={pt.key}
                  onClick={() => {
                    if (hasBuiltIn) {
                      setActivePromptType(pt.key)
                    } else {
                      generateVariant(pt.key)
                    }
                  }}
                  disabled={generatingPrompt}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'bg-elevated text-text-tertiary hover:text-text-secondary hover:bg-raised border border-border'
                  }`}
                >
                  {pt.label}
                  {!hasBuiltIn && <RefreshCw size={9} className="ml-1 inline" />}
                </button>
              )
            })}
          </div>

          {/* Prompt output */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-elevated/30">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold capitalize">{activePromptType.replace(/_/g, ' ')} Prompt</span>
                {generatingPrompt && <Loader2 size={12} className="animate-spin text-accent" />}
              </div>
              {promptText && <CopyButton text={promptText} label="Copy Prompt" />}
            </div>
            <div className="p-5">
              {generatingPrompt ? (
                <div className="flex items-center justify-center gap-2 py-12">
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <span className="text-[12px] text-text-tertiary">Generating Claude prompt variant...</span>
                </div>
              ) : promptText ? (
                <pre className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap font-mono bg-elevated/50 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                  {promptText}
                </pre>
              ) : (
                <div className="text-center py-12">
                  <Sparkles size={24} className="text-text-tertiary mx-auto mb-3 opacity-40" />
                  <p className="text-[12px] text-text-tertiary">No prompt generated for this type yet.</p>
                  <button
                    onClick={() => generateVariant(activePromptType)}
                    className="text-[11px] text-accent hover:text-accent-hover font-medium mt-2"
                  >
                    Generate Now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick copy section for all built-in prompts */}
          {(r.claude_prompt_short || r.claude_prompt_detailed || r.claude_prompt_full_rebuild) && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <h4 className="text-[12px] font-semibold mb-3">Quick Copy — All Built-in Prompts</h4>
              <div className="flex gap-2">
                {r.claude_prompt_short && <CopyButton text={r.claude_prompt_short} label="Copy Short" />}
                {r.claude_prompt_detailed && <CopyButton text={r.claude_prompt_detailed} label="Copy Detailed" />}
                {r.claude_prompt_full_rebuild && <CopyButton text={r.claude_prompt_full_rebuild} label="Copy Full Rebuild" />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
