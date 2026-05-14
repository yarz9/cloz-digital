import { useState } from 'react'
import { Globe, Loader2, ChevronDown, ChevronUp, Sparkles, AlertTriangle } from 'lucide-react'
import { audit } from '@/lib/api'
import { useAuditStore } from '@/stores/audit'
import { useStore } from '@/stores/management'

const reviewModes = [
  { key: 'standard', label: 'Standard Review' },
  { key: 'fast', label: 'Fast Review' },
  { key: 'deep', label: 'Deep Dive' },
  { key: 'homepage', label: 'Homepage Only' },
  { key: 'redesign', label: 'Redesign Assessment' },
  { key: 'conversion', label: 'Conversion Focus' },
  { key: 'trust', label: 'Trust Focus' },
  { key: 'mobile', label: 'Mobile Focus' },
  { key: 'local_business', label: 'Local Business' },
  { key: 'luxury', label: 'Premium/Luxury' },
  { key: 'competitor', label: 'Competitor Analysis' },
  { key: 'quick_fix', label: 'Quick Fixes Only' },
  { key: 'client_report', label: 'Client Report Mode' },
  { key: 'claude_prompt', label: 'Claude Prompt Focus' },
]

export default function ReviewLauncher({ onReviewComplete }) {
  const addReview = useAuditStore(s => s.addReview)
  const clients = useStore(s => s.clients)
  const leads = useStore(s => s.leads)

  const [url, setUrl] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [niche, setNiche] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [styleDirection, setStyleDirection] = useState('')
  const [budgetLevel, setBudgetLevel] = useState('')
  const [reviewMode, setReviewMode] = useState('standard')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')

  // Auto-fill from existing lead/client
  const autoFill = (name) => {
    const lead = leads.find(l => l.name === name)
    const client = clients.find(c => c.name === name)
    const entity = lead || client
    if (entity) {
      setBusinessName(entity.name)
      if (entity.niche) setNiche(entity.niche)
      if (entity.location) setLocation(entity.location)
      if (entity.websiteUrl || entity.website) setUrl(entity.websiteUrl || entity.website || '')
    }
  }

  const isValidUrl = (u) => {
    if (!u) return false
    try {
      const test = u.startsWith('http') ? u : `https://${u}`
      new URL(test)
      return true
    } catch { return false }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url || !isValidUrl(url)) {
      setError('Please enter a valid URL')
      return
    }

    setLoading(true)
    setError(null)
    setProgress('Sending website to Grok for analysis...')

    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

      setProgress('Grok is reviewing the website...')
      const result = await audit.review({
        url: normalizedUrl,
        businessName,
        niche,
        location,
        notes,
        styleDirection,
        budgetLevel,
        reviewMode,
      })

      if (!result.review) throw new Error('No review data returned')

      setProgress('Saving review...')
      const reviewId = addReview(result.review)

      const savedReview = { id: reviewId, ...result.review }
      onReviewComplete(savedReview)

    } catch (err) {
      setError(err.message || 'Review failed. Check your AI provider connection.')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-elevated/30">
        <h2 className="text-[15px] font-semibold flex items-center gap-2">
          <Globe size={16} className="text-accent" />
          New Website Review
        </h2>
        <p className="text-[11px] text-text-tertiary mt-0.5">Enter a URL and Grok will analyze the website, score it, and generate Claude build prompts</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* URL input — primary */}
        <div>
          <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">
            Website URL <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-elevated border border-border rounded-lg pl-9 pr-4 py-3 text-[14px] font-mono placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors"
              disabled={loading}
            />
          </div>
          {url && !isValidUrl(url) && (
            <span className="text-[10px] text-error mt-1 block">Enter a valid URL (e.g. example.com or https://example.com)</span>
          )}
        </div>

        {/* Quick context row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Sarajevo Dental Clinic"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              disabled={loading}
              list="entity-names"
            />
            <datalist id="entity-names">
              {[...clients.map(c => c.name), ...leads.map(l => l.name)].map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Niche / Category</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. Dental, Restaurant"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Sarajevo, Bosnia"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              disabled={loading}
            />
          </div>
        </div>

        {/* Review mode selector */}
        <div>
          <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Review Mode</label>
          <div className="flex flex-wrap gap-1.5">
            {reviewModes.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setReviewMode(m.key)}
                disabled={loading}
                className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                  reviewMode === m.key
                    ? 'bg-accent text-white'
                    : 'bg-elevated text-text-tertiary hover:text-text-secondary hover:bg-raised border border-border'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-3 p-4 bg-elevated/50 rounded-lg border border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Style Direction</label>
                <select
                  value={styleDirection}
                  onChange={e => setStyleDirection(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none"
                  disabled={loading}
                >
                  <option value="">No preference</option>
                  <option value="modern-minimal">Modern Minimal</option>
                  <option value="bold-creative">Bold & Creative</option>
                  <option value="corporate-professional">Corporate Professional</option>
                  <option value="luxury-premium">Luxury Premium</option>
                  <option value="playful-friendly">Playful & Friendly</option>
                  <option value="dark-elegant">Dark & Elegant</option>
                  <option value="clean-medical">Clean Medical/Health</option>
                  <option value="warm-hospitality">Warm Hospitality</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Budget Level</label>
                <select
                  value={budgetLevel}
                  onChange={e => setBudgetLevel(e.target.value)}
                  className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none"
                  disabled={loading}
                >
                  <option value="">Not specified</option>
                  <option value="budget">Budget (under 500 BAM)</option>
                  <option value="standard">Standard (500-1000 BAM)</option>
                  <option value="premium">Premium (1000-2000 BAM)</option>
                  <option value="enterprise">Enterprise (2000+ BAM)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Notes / Context</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional context about this business or what you're looking for in the review..."
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">Auto-fill from Lead/Client</label>
              <select
                onChange={e => { if (e.target.value) autoFill(e.target.value) }}
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none"
                disabled={loading}
              >
                <option value="">Select to auto-fill...</option>
                <optgroup label="Clients">
                  {clients.map(c => <option key={`c-${c.id}`} value={c.name}>{c.name}</option>)}
                </optgroup>
                <optgroup label="Leads">
                  {leads.map(l => <option key={`l-${l.id}`} value={l.name}>{l.name}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-md px-4 py-2.5 text-[12px] text-error font-medium flex items-center gap-2">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !url}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-3 rounded-lg text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{progress || 'Analyzing...'}</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Run AI Website Review
            </>
          )}
        </button>

        {loading && (
          <div className="text-center">
            <div className="w-full bg-elevated rounded-full h-1.5 mt-2">
              <div className="bg-accent h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-[10px] text-text-tertiary mt-2">Grok is analyzing the website and generating Claude prompts. This may take 15-30 seconds.</p>
          </div>
        )}
      </form>
    </div>
  )
}
