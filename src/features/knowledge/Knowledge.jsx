import { useState } from 'react'
import { BookOpen, Plus, Search, Tag, Calendar } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

const categories = ['all', 'packages', 'sales', 'operations', 'technical']

export default function Knowledge() {
  const knowledge = useStore(s => s.knowledge)
  const addKnowledge = useStore(s => s.addKnowledge)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = knowledge.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.excerpt.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Knowledge Base</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{knowledge.length} entries · Internal reference docs, SOPs, and guides</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> Add Entry
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${filter === c ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'}`}
            >
              {c}
              <span className="ml-1 opacity-60">{c === 'all' ? knowledge.length : knowledge.filter(e => e.category === c).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(e => (
          <div key={e.id} className="bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[14px] font-semibold">{e.title}</h3>
                <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">{e.excerpt}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] font-medium text-accent bg-accent-muted px-1.5 py-0.5 rounded capitalize">{e.category}</span>
              {e.tags?.map(t => <span key={t} className="text-[10px] text-text-tertiary bg-elevated px-1.5 py-0.5 rounded">{t}</span>)}
              <span className="text-[10px] text-text-tertiary ml-auto">{e.updated}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="text-[13px] text-text-tertiary mb-3">{search || filter !== 'all' ? 'No entries match your search' : 'No knowledge entries yet'}</p>
            <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Add your first entry</button>
          </div>
        )}
      </div>

      <AddKnowledgeModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addKnowledge} />
    </div>
  )
}

function AddKnowledgeModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', category: 'operations', tags: '', excerpt: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title || !form.excerpt) return
    onSubmit({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setSuccess(`"${form.title}" added to knowledge base!`)
    setTimeout(() => { setSuccess(''); setForm({ title: '', category: 'operations', tags: '', excerpt: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Knowledge Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Title" required>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. SSL Renewal Procedure" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" required>
            <Select value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="packages">Packages</option>
              <option value="sales">Sales</option>
              <option value="operations">Operations</option>
              <option value="technical">Technical</option>
            </Select>
          </Field>
          <Field label="Tags" hint="Comma-separated">
            <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="ssl, hosting, guide" />
          </Field>
        </div>
        <Field label="Content" required>
          <Textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={5} placeholder="Write the knowledge entry content..." />
        </Field>
        <SubmitButton disabled={!form.title || !form.excerpt}>Add Entry</SubmitButton>
      </form>
    </Modal>
  )
}
