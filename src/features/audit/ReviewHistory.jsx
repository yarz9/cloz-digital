import { useState } from 'react'
import { ArrowLeft, Star, Search, Globe, Trash2, GitCompare, ArrowRight } from 'lucide-react'
import { useAuditStore } from '@/stores/audit'

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

export default function ReviewHistory({ onBack, onOpenReview }) {
  const reviews = useAuditStore(s => s.reviews)
  const deleteReview = useAuditStore(s => s.deleteReview)
  const starReview = useAuditStore(s => s.starReview)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState(null)
  const [compareB, setCompareB] = useState(null)

  const filtered = reviews.filter(r => {
    if (filter === 'starred' && !r.is_starred) return false
    if (filter === 'linked' && !r.linked_entity_type) return false
    if (search) {
      const q = search.toLowerCase()
      return (r.business_name || '').toLowerCase().includes(q) ||
             (r.website_url || '').toLowerCase().includes(q) ||
             (r.niche || '').toLowerCase().includes(q)
    }
    return true
  })

  const handleCompareSelect = (review) => {
    if (!compareA) setCompareA(review)
    else if (!compareB) setCompareB(review)
    else { setCompareA(review); setCompareB(null) }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-elevated rounded-md transition-colors">
            <ArrowLeft size={16} className="text-text-tertiary" />
          </button>
          <div>
            <h1 className="font-display font-bold text-[20px]">Review History</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">{reviews.length} reviews saved</p>
          </div>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            compareMode ? 'bg-accent text-white' : 'bg-elevated hover:bg-raised border border-border text-text-secondary'
          }`}
        >
          <GitCompare size={13} /> {compareMode ? 'Exit Compare' : 'Compare Mode'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reviews..."
            className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'starred', 'linked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${
                filter === f ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Compare panel */}
      {compareMode && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <p className="text-[11px] text-accent font-medium mb-2">Select two reviews to compare scores side-by-side</p>
          {compareA && compareB && (
            <div className="bg-surface rounded-lg p-4 border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-[11px] text-text-tertiary">{compareA.business_name || compareA.website_url}</span>
                  <div className={`text-[28px] font-display font-bold mt-1 ${scoreColor(compareA.overall_score)}`}>{compareA.overall_score}</div>
                  <span className="text-[10px] text-text-tertiary">{new Date(compareA.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-text-tertiary">{compareB.business_name || compareB.website_url}</span>
                  <div className={`text-[28px] font-display font-bold mt-1 ${scoreColor(compareB.overall_score)}`}>{compareB.overall_score}</div>
                  <span className="text-[10px] text-text-tertiary">{new Date(compareB.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border text-center">
                <span className={`text-[13px] font-semibold ${compareB.overall_score > compareA.overall_score ? 'text-success' : compareB.overall_score < compareA.overall_score ? 'text-error' : 'text-text-secondary'}`}>
                  {compareB.overall_score > compareA.overall_score ? `+${compareB.overall_score - compareA.overall_score} improvement` :
                   compareB.overall_score < compareA.overall_score ? `${compareB.overall_score - compareA.overall_score} regression` :
                   'Same score'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review list */}
      <div className="space-y-2">
        {filtered.map(r => (
          <div
            key={r.id}
            className={`bg-surface border rounded-lg p-4 flex items-center gap-4 transition-colors ${
              compareMode ? 'cursor-pointer hover:border-accent' : 'hover:border-border-strong'
            } ${(compareA?.id === r.id || compareB?.id === r.id) ? 'border-accent' : 'border-border'}`}
            onClick={() => compareMode ? handleCompareSelect(r) : onOpenReview(r)}
          >
            {/* Score */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold font-mono ${scoreBg(r.overall_score)}`}>
              {r.overall_score}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium truncate">{r.business_name || r.website_url}</span>
                {r.is_starred && <Star size={11} className="text-warning fill-warning shrink-0" />}
                {r.linked_entity_type && <span className="text-[9px] bg-accent-muted text-accent px-1.5 py-0.5 rounded font-medium shrink-0">{r.linked_entity_type}</span>}
              </div>
              <div className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono">{r.website_url}</span>
                <span>·</span>
                <span className="capitalize">{r.review_mode}</span>
                {r.niche && <><span>·</span><span>{r.niche}</span></>}
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Meta scores */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <span className="text-[9px] text-text-tertiary block">Opp.</span>
                <span className={`text-[12px] font-mono font-bold ${scoreColor(r.opportunity_score || 0)}`}>{r.opportunity_score || '—'}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-text-tertiary block">Urg.</span>
                <span className={`text-[12px] font-mono font-bold ${scoreColor(r.urgency_score || 0)}`}>{r.urgency_score || '—'}</span>
              </div>
              <span className="text-[10px] font-medium text-accent bg-accent-muted px-2 py-0.5 rounded">{r.package_fit || '—'}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); starReview(r.id) }}
                className="p-1 rounded hover:bg-elevated transition-colors"
              >
                <Star size={13} className={r.is_starred ? 'text-warning fill-warning' : 'text-text-tertiary'} />
              </button>
              {!compareMode && (
                <ArrowRight size={14} className="text-text-tertiary ml-1" />
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <Globe size={28} className="text-text-tertiary mx-auto mb-3 opacity-40" />
            <p className="text-[13px] text-text-tertiary mb-2">
              {search ? 'No reviews match your search' : 'No reviews yet'}
            </p>
            <button onClick={onBack} className="text-[12px] text-accent hover:text-accent-hover font-medium">
              Run your first review
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
