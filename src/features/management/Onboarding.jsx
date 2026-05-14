import { UserPlus, CheckCircle2, Circle, Clock, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const clients = [
  {
    id: 1, name: 'Sarajevo Dental Clinic', package: 'Launch Care', startDate: '2026-05-10', status: 'in-progress',
    steps: [
      { label: 'Welcome email sent', done: true },
      { label: 'Access credentials created', done: true },
      { label: 'Discovery call completed', done: true },
      { label: 'Content collection', done: false },
      { label: 'Design mockup review', done: false },
      { label: 'Development kickoff', done: false },
    ]
  },
  {
    id: 2, name: 'Alpine Outdoor Shop', package: 'Growth Care', startDate: '2026-05-06', status: 'in-progress',
    steps: [
      { label: 'Welcome email sent', done: true },
      { label: 'Access credentials created', done: true },
      { label: 'Discovery call completed', done: true },
      { label: 'Content collection', done: true },
      { label: 'Design mockup review', done: false },
      { label: 'Development kickoff', done: false },
    ]
  },
  {
    id: 3, name: 'Mostar Photography Studio', package: 'Presence Care', startDate: '2026-04-28', status: 'completed',
    steps: [
      { label: 'Welcome email sent', done: true },
      { label: 'Access credentials created', done: true },
      { label: 'Discovery call completed', done: true },
      { label: 'Content collection', done: true },
      { label: 'Design mockup review', done: true },
      { label: 'Development kickoff', done: true },
    ]
  },
]

export default function Onboarding() {
  const [selected, setSelected] = useState(clients[0])
  const welcomeEmail = useAI(ai.generate)

  const generateWelcome = () => {
    welcomeEmail.run(
      `Write a warm, professional welcome email for a new client "${selected.name}" who signed up for our "${selected.package}" web design package at Cloz Digital. Include: greeting, what to expect next, timeline overview, and how to reach us. Keep it concise and friendly. Write in a professional but approachable tone.`,
      0.7
    )
  }

  const progress = (steps) => Math.round((steps.filter(s => s.done).length / steps.length) * 100)

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Client Onboarding</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Track and manage new client onboarding workflows</p>
        </div>
        <button className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <UserPlus size={13} /> New Client
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Client list */}
        <div className="space-y-2">
          {clients.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                selected.id === c.id ? 'border-accent' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium">{c.name}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  c.status === 'completed' ? 'bg-success/10 text-success' : 'bg-accent-muted text-accent'
                }`}>{c.status === 'completed' ? 'Done' : 'In Progress'}</span>
              </div>
              <div className="text-[11px] text-text-tertiary mb-2">{c.package} · Started {c.startDate}</div>
              <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress(c.steps)}%` }} />
              </div>
              <span className="text-[10px] text-text-tertiary mt-1">{progress(c.steps)}% complete</span>
            </div>
          ))}
        </div>

        {/* Steps detail */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4">{selected.name}</h2>
          <div className="space-y-3">
            {selected.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 size={16} className="text-success shrink-0" />
                ) : (
                  <Circle size={16} className="text-text-tertiary shrink-0" />
                )}
                <span className={`text-[12px] ${step.done ? 'text-text-secondary line-through' : 'text-text-primary font-medium'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={generateWelcome}
              disabled={welcomeEmail.loading}
              className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover font-medium"
            >
              {welcomeEmail.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {welcomeEmail.loading ? 'Generating...' : 'Generate Welcome Email'}
            </button>
          </div>
        </div>

        {/* AI Generated email */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2">
            <Sparkles size={13} className="text-accent" /> AI Email Draft
          </h2>
          {welcomeEmail.loading ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-[11px] text-text-tertiary">Drafting welcome email...</span>
            </div>
          ) : welcomeEmail.data?.text ? (
            <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
              {welcomeEmail.data.text}
            </div>
          ) : (
            <p className="text-[12px] text-text-tertiary py-8 text-center">Click "Generate Welcome Email" to draft</p>
          )}
        </div>
      </div>
    </div>
  )
}
