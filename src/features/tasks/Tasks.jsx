import { useState } from 'react'
import { CheckSquare, Plus, Clock, AlertTriangle, User, Calendar, CheckCircle } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

const priorityColors = { high: 'text-error', medium: 'text-warning', low: 'text-text-tertiary' }
const statusColors = { 'todo': 'bg-elevated text-text-secondary', 'in-progress': 'bg-info/10 text-info', 'done': 'bg-success/10 text-success' }

export default function Tasks() {
  const tasks = useStore(s => s.tasks)
  const clients = useStore(s => s.clients)
  const addTask = useStore(s => s.addTask)
  const updateTask = useStore(s => s.updateTask)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter)

  const toggleStatus = (task) => {
    const next = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo'
    updateTask(task.id, { status: next })
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Tasks & Operations</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{tasks.filter(t => t.status !== 'done').length} open · {tasks.filter(t => t.priority === 'high' && t.status !== 'done').length} high priority</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> Add Task
        </button>
      </div>

      <div className="flex gap-1">
        {['all', 'todo', 'in-progress', 'done'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${filter === s ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'}`}>
            {s === 'in-progress' ? 'In Progress' : s}
            <span className="ml-1 opacity-60">{tasks.filter(t => s === 'all' || t.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-4 hover:border-border-strong transition-colors">
            <button onClick={() => toggleStatus(t)} className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-success border-success' : 'border-border hover:border-accent'}`}>
              {t.status === 'done' && <CheckCircle size={12} className="text-white" />}
            </button>
            <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'high' ? 'bg-error' : t.priority === 'medium' ? 'bg-warning' : 'bg-text-tertiary'}`} />
            <div className="flex-1 min-w-0">
              <span className={`text-[13px] font-medium ${t.status === 'done' ? 'line-through text-text-tertiary' : ''}`}>{t.title}</span>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-text-tertiary">
                {t.client && <span>{t.client}</span>}
                {t.client && <span>·</span>}
                <span className="capitalize">{t.module}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Calendar size={9} /> {t.due}</span>
              </div>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[t.status]}`}>{t.status === 'in-progress' ? 'In Progress' : t.status}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="text-[13px] text-text-tertiary mb-3">No tasks found</p>
            <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Create your first task</button>
          </div>
        )}
      </div>

      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addTask} clients={clients} />
    </div>
  )
}

function AddTaskModal({ open, onClose, onSubmit, clients }) {
  const [form, setForm] = useState({ title: '', priority: 'medium', due: '', client: '', module: 'general' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title) return
    onSubmit(form)
    setSuccess(`Task "${form.title}" created!`)
    setTimeout(() => { setSuccess(''); setForm({ title: '', priority: 'medium', due: '', client: '', module: 'general' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Task Title" required>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Due Date">
            <Input type="date" value={form.due} onChange={e => set('due', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client">
            <Select value={form.client} onChange={e => set('client', e.target.value)}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Module">
            <Select value={form.module} onChange={e => set('module', e.target.value)}>
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="hosting">Hosting</option>
              <option value="maintenance">Maintenance</option>
              <option value="proposals">Proposals</option>
              <option value="content">Content</option>
            </Select>
          </Field>
        </div>
        <SubmitButton disabled={!form.title}>Create Task</SubmitButton>
      </form>
    </Modal>
  )
}
