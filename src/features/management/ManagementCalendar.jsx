import { useState } from 'react'
import { Calendar, Clock, Users, CheckSquare, Globe, Receipt, Plus } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, SubmitButton, SuccessBanner } from '@/components/Modal'

const typeConfig = {
  meeting: { color: 'bg-accent', text: 'text-accent', icon: Users },
  maintenance: { color: 'bg-info', text: 'text-info', icon: CheckSquare },
  delivery: { color: 'bg-success', text: 'text-success', icon: CheckSquare },
  deadline: { color: 'bg-error', text: 'text-error', icon: Clock },
  billing: { color: 'bg-warning', text: 'text-warning', icon: Receipt },
  task: { color: 'bg-text-tertiary', text: 'text-text-tertiary', icon: CheckSquare },
}

export default function ManagementCalendar() {
  const events = useStore(s => s.calendarEvents)
  const addCalendarEvent = useStore(s => s.addCalendarEvent)
  const clients = useStore(s => s.clients)
  const [showAdd, setShowAdd] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const grouped = [...events].sort((a, b) => a.date.localeCompare(b.date)).reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  const formatDate = (d) => {
    if (d === today) return 'Today'
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Calendar</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Upcoming events, deadlines, and client meetings</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Calendar size={13} /> Add Event
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: events.length },
          { label: 'Meetings', value: events.filter(e => e.type === 'meeting').length },
          { label: 'Deadlines', value: events.filter(e => e.type === 'deadline').length },
          { label: 'Tasks', value: events.filter(e => e.type === 'maintenance' || e.type === 'task' || e.type === 'delivery').length },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <span className="text-[11px] text-text-tertiary">{s.label}</span>
            <div className="text-[22px] font-display font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dateEvents]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[12px] font-semibold ${date === today ? 'text-accent' : 'text-text-secondary'}`}>
                {formatDate(date)}
              </span>
              {date === today && <span className="text-[9px] bg-accent-muted text-accent px-1.5 py-0.5 rounded font-medium">TODAY</span>}
            </div>
            <div className="space-y-1.5 ml-2 border-l-2 border-border pl-4">
              {dateEvents.map((event) => {
                const config = typeConfig[event.type] || typeConfig.task
                const Icon = config.icon
                return (
                  <div key={event.id} className="bg-surface border border-border rounded-lg p-3 hover:border-border-strong transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${config.color}/15`}>
                        <Icon size={12} className={config.text} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[12px] font-medium">{event.title}</span>
                        {event.client && <span className="text-[10px] text-text-tertiary ml-2">{event.client}</span>}
                      </div>
                      {event.time && (
                        <span className="text-[11px] text-text-tertiary font-mono">{event.time}</span>
                      )}
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${config.color}/10 ${config.text}`}>{event.type}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="text-[13px] text-text-tertiary mb-3">No events yet</p>
            <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Add your first event</button>
          </div>
        )}
      </div>

      <AddEventModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addCalendarEvent} clients={clients} />
    </div>
  )
}

function AddEventModal({ open, onClose, onSubmit, clients }) {
  const [form, setForm] = useState({ title: '', date: '', time: '', type: 'meeting', client: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title || !form.date) return
    onSubmit({ ...form, client: form.client || null, time: form.time || null })
    setSuccess(`Event "${form.title}" added!`)
    setTimeout(() => { setSuccess(''); setForm({ title: '', date: '', time: '', type: 'meeting', client: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Event Title" required>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Discovery call — New Client" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="meeting">Meeting</option>
              <option value="maintenance">Maintenance</option>
              <option value="delivery">Delivery</option>
              <option value="deadline">Deadline</option>
              <option value="billing">Billing</option>
              <option value="task">Task</option>
            </Select>
          </Field>
          <Field label="Client">
            <Select value={form.client} onChange={e => set('client', e.target.value)}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <SubmitButton disabled={!form.title || !form.date}>Add Event</SubmitButton>
      </form>
    </Modal>
  )
}
