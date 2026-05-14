import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight } from 'lucide-react'

export default function AIFeatures() {
  const [features, setFeatures] = useState([])

  const load = () => { fetch('/api/features').then(r => r.json()).then(d => setFeatures(d || [])).catch(() => {}) }
  useEffect(load, [])

  const descriptions = {
    lead_analysis: 'AI-powered lead scoring and analysis in Client Scout',
    proposal_drafting: 'AI-generated proposal drafts from client data',
    invoice_ai: 'Invoice explanations and billing insights',
    maintenance_summaries: 'Auto-generate client-facing maintenance reports',
    outreach_generator: 'AI outreach message drafting',
    dashboard_assistant: 'Daily AI briefing on the dashboard',
    debug_mode: 'Show raw AI responses in UI for debugging',
    structured_output: 'Use structured JSON output where available',
    function_calling: 'Enable tool/function calling for eligible workflows',
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">Feature Toggles</h1>
        <p className="text-[13px] text-text-secondary mt-1">Enable or disable AI features by module</p>
      </div>
      <div className="space-y-2">
        {features.map(f => (
          <div key={f.key} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-[13px] font-medium">{f.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              <p className="text-[11px] text-text-tertiary mt-0.5">{descriptions[f.key] || 'AI feature toggle'}</p>
            </div>
            <div className={`text-[12px] font-medium px-3 py-1 rounded-md ${f.enabled ? 'bg-success/10 text-success' : 'bg-elevated text-text-tertiary'}`}>
              {f.enabled ? 'ON' : 'OFF'}
            </div>
          </div>
        ))}
        {features.length === 0 && <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-tertiary text-[13px]">No features configured.</div>}
      </div>
    </div>
  )
}
