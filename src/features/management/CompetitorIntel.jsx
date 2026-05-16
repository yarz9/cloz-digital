import { Eye, Globe, TrendingUp, TrendingDown, Target, Sparkles, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

export default function CompetitorIntel() {
  const competitors = useStore(s => s.competitors)
  const addCompetitor = useStore(s => s.addCompetitor)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const analysis = useAI(ai.generate)

  const analyze = (comp) => {
    setSelected(comp.name)
    analysis.run(
      `Analyze our competitor "${comp.name}" (${comp.url}) in the Bosnia web design market. They focus on: ${comp.focus}. Pricing: ${comp.pricing}. Strengths: ${comp.strengths.join(', ')}. Weaknesses: ${comp.weaknesses.join(', ')}. We are Cloz Digital, a premium web design studio offering Launch Care (one-time builds from 800 BAM), Growth Care (325 BAM/mo), and Presence Care (217 BAM/mo). Provide: 1) Competitive positioning analysis 2) How to differentiate 3) Win strategies against them 4) What we can learn from them. Be specific.`,
      0.7
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Competitor Intelligence</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Market analysis and AI-powered competitive insights</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border text-text-secondary px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> Add Competitor
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-2">
          {competitors.map(comp => (
            <div
              key={comp.id}
              onClick={() => analyze(comp)}
              className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                selected === comp.name ? 'border-accent' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[13px] font-medium">{comp.name}</span>
                  {comp.url !== '-' && <span className="text-[11px] text-text-tertiary ml-2 font-mono">{comp.url}</span>}
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  comp.threat === 'high' ? 'bg-error/10 text-error' : comp.threat === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                }`}>{comp.threat} threat</span>
              </div>
              <div className="text-[11px] text-text-tertiary mb-2">{comp.focus} · {comp.pricing}</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-success font-medium">Strengths</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {comp.strengths.map(s => <span key={s} className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded">{s}</span>)}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-error font-medium">Weaknesses</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {comp.weaknesses.map(w => <span key={w} className="text-[9px] bg-error/10 text-error px-1.5 py-0.5 rounded">{w}</span>)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {competitors.length === 0 && (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <p className="text-[13px] text-text-tertiary mb-3">No competitors tracked</p>
              <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Add your first competitor</button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" /> AI Competitive Analysis
          </h2>
          {analysis.loading ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-[12px] text-text-tertiary">Analyzing competitor...</span>
            </div>
          ) : analysis.data?.text ? (
            <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
              {analysis.data.text.split('\n').map((line, i) => {
                if (line.includes('**')) {
                  const parts = line.split(/\*\*(.*?)\*\*/g)
                  return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                }
                return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
              })}
            </div>
          ) : (
            <p className="text-[12px] text-text-tertiary py-8 text-center">Click a competitor to run AI analysis</p>
          )}
        </div>
      </div>

      <AddCompetitorModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addCompetitor} />
    </div>
  )
}

function AddCompetitorModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', url: '', focus: '', pricing: '', threat: 'medium', strengths: '', weaknesses: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name) return
    onSubmit({
      ...form,
      strengths: form.strengths ? form.strengths.split(',').map(s => s.trim()).filter(Boolean) : [],
      weaknesses: form.weaknesses ? form.weaknesses.split(',').map(s => s.trim()).filter(Boolean) : [],
    })
    setSuccess(`Competitor "${form.name}" added!`)
    setTimeout(() => { setSuccess(''); setForm({ name: '', url: '', focus: '', pricing: '', threat: 'medium', strengths: '', weaknesses: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Competitor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" required>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Competitor name" />
          </Field>
          <Field label="Website">
            <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="e.g. webpro.ba" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Focus Area">
            <Input value={form.focus} onChange={e => set('focus', e.target.value)} placeholder="e.g. E-commerce & WordPress" />
          </Field>
          <Field label="Pricing Range">
            <Input value={form.pricing} onChange={e => set('pricing', e.target.value)} placeholder="e.g. 500-2000 BAM" />
          </Field>
        </div>
        <Field label="Threat Level">
          <Select value={form.threat} onChange={e => set('threat', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Strengths" hint="Comma-separated">
          <Input value={form.strengths} onChange={e => set('strengths', e.target.value)} placeholder="Fast delivery, Low prices" />
        </Field>
        <Field label="Weaknesses" hint="Comma-separated">
          <Input value={form.weaknesses} onChange={e => set('weaknesses', e.target.value)} placeholder="No support, Low quality" />
        </Field>
        <SubmitButton disabled={!form.name}>Add Competitor</SubmitButton>
      </form>
    </Modal>
  )
}
