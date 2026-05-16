import { useState } from 'react'
import { GitBranch, Plus, Sparkles, GripVertical } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, SubmitButton, SuccessBanner } from '@/components/Modal'

const stages = [
  { key: 'new', label: 'New Leads', color: 'border-info' },
  { key: 'qualified', label: 'Qualified', color: 'border-accent' },
  { key: 'proposal', label: 'Proposal Sent', color: 'border-warning' },
  { key: 'negotiation', label: 'Negotiation', color: 'border-accent' },
  { key: 'won', label: 'Won', color: 'border-success' },
]

export default function Pipeline() {
  const deals = useStore(s => s.deals)
  const addDeal = useStore(s => s.addDeal)
  const updateDeal = useStore(s => s.updateDeal)
  const [showAdd, setShowAdd] = useState(false)

  const totalPipeline = deals.filter(d => d.stage !== 'won').reduce((s, d) => s + d.value, 0)

  const moveStage = (id, direction) => {
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    const idx = stages.findIndex(s => s.key === deal.stage)
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= stages.length) return
    updateDeal(id, { stage: stages[nextIdx].key, days: 0 })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">CRM Pipeline</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Pipeline value: {totalPipeline.toLocaleString()} BAM · {deals.length} deals</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> Add Deal
        </button>
      </div>

      {/* AI insight */}
      <div className="bg-surface border border-border rounded-lg p-4 flex items-start gap-3">
        <Sparkles size={15} className="text-accent mt-0.5 shrink-0" />
        <div className="text-[12px] text-text-secondary">
          {deals.filter(d => d.stage === 'proposal').length > 0 && (
            <><strong className="text-text-primary font-medium">{deals.filter(d => d.stage === 'proposal').length} proposals</strong> sent but not yet won. </>
          )}
          {(() => {
            const best = deals.filter(d => d.stage === 'qualified').sort((a, b) => b.score - a.score)[0]
            return best ? <><strong className="text-text-primary font-medium">{best.name}</strong> is your strongest qualified lead (score: {best.score}). Consider sending a proposal.</> : null
          })()}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key)
          const stageValue = stageDeals.reduce((s, d) => s + d.value, 0)
          return (
            <div key={stage.key} className="min-w-[260px] flex-1">
              <div className={`border-t-2 ${stage.color} bg-surface rounded-lg`}>
                <div className="px-3 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-medium">{stage.label}</span>
                    <span className="text-[11px] text-text-tertiary ml-2">{stageDeals.length}</span>
                  </div>
                  <span className="text-[11px] font-mono text-text-tertiary">{stageValue} BAM</span>
                </div>
                <div className="p-2 space-y-2">
                  {stageDeals.map(d => {
                    const stageIdx = stages.findIndex(s => s.key === stage.key)
                    return (
                      <div key={d.id} className="p-3 bg-elevated hover:bg-raised rounded-md transition-colors group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium">{d.name}</span>
                          <span className={`text-[11px] font-mono font-bold ${d.score >= 80 ? 'text-success' : 'text-warning'}`}>{d.score}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                          <span>{d.package}</span>
                          <span className="font-medium">{d.value} BAM</span>
                        </div>
                        {d.days > 0 && <span className="text-[10px] text-text-tertiary mt-1 block">{d.days}d in stage</span>}
                        {/* Stage move buttons */}
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {stageIdx > 0 && (
                            <button onClick={() => moveStage(d.id, -1)} className="text-[10px] text-text-tertiary hover:text-accent px-1.5 py-0.5 rounded bg-surface border border-border">
                              ← {stages[stageIdx - 1].label}
                            </button>
                          )}
                          {stageIdx < stages.length - 1 && (
                            <button onClick={() => moveStage(d.id, 1)} className="text-[10px] text-text-tertiary hover:text-success px-1.5 py-0.5 rounded bg-surface border border-border ml-auto">
                              {stages[stageIdx + 1].label} →
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {stageDeals.length === 0 && (
                    <div className="p-4 text-center text-[11px] text-text-tertiary">No deals</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AddDealModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addDeal} />
    </div>
  )
}

function AddDealModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', value: '', package: 'Launch Care', score: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const packageValues = { 'Launch Care': 800, 'Growth Care': 1500, 'Presence Care': 650, 'Custom': '' }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.value) return
    onSubmit({ ...form, value: parseInt(form.value), score: parseInt(form.score) || 50 })
    setSuccess(`Deal "${form.name}" added to pipeline!`)
    setTimeout(() => { setSuccess(''); setForm({ name: '', value: '', package: 'Launch Care', score: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Deal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Business Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Business name" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Package">
            <Select value={form.package} onChange={e => { set('package', e.target.value); set('value', String(packageValues[e.target.value] || '')) }}>
              <option value="Launch Care">Launch Care</option>
              <option value="Growth Care">Growth Care</option>
              <option value="Presence Care">Presence Care</option>
              <option value="Custom">Custom</option>
            </Select>
          </Field>
          <Field label="Value (BAM)" required>
            <Input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="800" />
          </Field>
        </div>
        <Field label="Lead Score" hint="1–100, how likely to close">
          <Input type="number" value={form.score} onChange={e => set('score', e.target.value)} placeholder="50" min="1" max="100" />
        </Field>
        <SubmitButton disabled={!form.name || !form.value}>Add to Pipeline</SubmitButton>
      </form>
    </Modal>
  )
}
