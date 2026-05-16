import { useState, useMemo } from 'react'
import { UserPlus, CheckCircle2, Circle, Sparkles, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  ONBOARDING — Workflow progress for real new clients
// ══════════════════════════════════════════════════════════════

const STANDARD_STEPS = [
  { key: 'welcome',     label: 'Welcome email sent' },
  { key: 'access',      label: 'Access credentials created' },
  { key: 'discovery',   label: 'Discovery call completed' },
  { key: 'content',     label: 'Content collection' },
  { key: 'design',      label: 'Design mockup review' },
  { key: 'development', label: 'Development kickoff' },
]

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date() - new Date(dateStr)) / 86400000)
}

export default function Onboarding() {
  const clients = useStore(s => s.clients)
  const updateClient = useStore(s => s.updateClient)

  // Onboarding-eligible: clients added within the last 60 days who aren't fully onboarded
  const onboardingClients = useMemo(() => {
    return clients
      .map(c => {
        const days = daysSince(c.since)
        const steps = c.onboardingSteps || STANDARD_STEPS.reduce((acc, s) => ({ ...acc, [s.key]: false }), {})
        const completedCount = STANDARD_STEPS.filter(s => steps[s.key]).length
        return { ...c, steps, completedCount, days }
      })
      .filter(c => c.completedCount < STANDARD_STEPS.length || (c.days != null && c.days <= 60))
      .sort((a, b) => (a.completedCount === b.completedCount ? (a.days || 0) - (b.days || 0) : a.completedCount - b.completedCount))
  }, [clients])

  const [selectedId, setSelectedId] = useState(null)
  const selected = onboardingClients.find(c => c.id === selectedId) || onboardingClients[0]

  const welcomeEmail = useAI(ai.generate)

  const generateWelcome = () => {
    if (!selected) return
    welcomeEmail.run(
      `Write a warm, professional welcome email for a new client "${selected.name}" who signed up for our "${selected.package}" web design package at Cloz Digital. Include: greeting, what to expect next, timeline overview, and how to reach us. Keep it concise and friendly. Write in a professional but approachable tone.`,
      0.7
    )
  }

  const progress = (steps) => {
    const done = STANDARD_STEPS.filter(s => steps[s.key]).length
    return Math.round((done / STANDARD_STEPS.length) * 100)
  }

  const toggleStep = (client, stepKey) => {
    const newSteps = { ...client.steps, [stepKey]: !client.steps[stepKey] }
    updateClient(client.id, { onboardingSteps: newSteps })
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Client Onboarding</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Track and manage new client onboarding workflows</p>
        </div>
        <button onClick={() => window.location.href = '/management/clients'}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <UserPlus size={13} /> New Client
        </button>
      </div>

      {onboardingClients.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={UserPlus}
            title="No clients in onboarding"
            description="Once you register a new client, a 6-step onboarding workflow appears here so you can track progress from welcome email through development kickoff."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Client list */}
          <div className="space-y-2">
            {onboardingClients.map(c => (
              <div key={c.id} onClick={() => setSelectedId(c.id)}
                className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                  selected?.id === c.id ? 'border-accent' : 'border-border hover:border-border-strong'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium truncate">{c.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                    c.completedCount === STANDARD_STEPS.length ? 'bg-success/10 text-success' : 'bg-accent-muted text-accent'
                  }`}>
                    {c.completedCount === STANDARD_STEPS.length ? 'Done' : 'In Progress'}
                  </span>
                </div>
                <div className="text-[11px] text-text-tertiary mb-2">{c.package || 'No package'} · Started {c.since || '—'}</div>
                <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress(c.steps)}%` }} />
                </div>
                <span className="text-[10px] text-text-tertiary mt-1">{progress(c.steps)}% complete</span>
              </div>
            ))}
          </div>

          {selected && (
            <>
              {/* Steps detail */}
              <div className="bg-surface border border-border rounded-lg p-5">
                <h2 className="font-display font-semibold text-[14px] mb-4">{selected.name}</h2>
                <div className="space-y-3">
                  {STANDARD_STEPS.map(step => {
                    const done = selected.steps[step.key]
                    return (
                      <button key={step.key} onClick={() => toggleStep(selected, step.key)}
                        className="flex items-center gap-3 w-full text-left hover:bg-elevated/50 -mx-1 px-1 py-1 rounded">
                        {done ? <CheckCircle2 size={16} className="text-success shrink-0" /> : <Circle size={16} className="text-text-tertiary shrink-0" />}
                        <span className={`text-[12px] ${done ? 'text-text-secondary line-through' : 'text-text-primary font-medium'}`}>
                          {step.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <button onClick={generateWelcome} disabled={welcomeEmail.loading}
                    className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover font-medium">
                    {welcomeEmail.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {welcomeEmail.loading ? 'Generating…' : 'Generate Welcome Email'}
                  </button>
                </div>
              </div>

              {/* AI Email draft */}
              <div className="bg-surface border border-border rounded-lg p-5">
                <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2">
                  <Sparkles size={13} className="text-accent" /> AI Email Draft
                </h2>
                {welcomeEmail.loading ? (
                  <div className="flex items-center gap-2 py-8 justify-center">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    <span className="text-[11px] text-text-tertiary">Drafting welcome email…</span>
                  </div>
                ) : welcomeEmail.error ? (
                  <div className="text-[11px] text-error">{welcomeEmail.error}</div>
                ) : welcomeEmail.data?.text ? (
                  <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
                    {welcomeEmail.data.text}
                  </div>
                ) : (
                  <p className="text-[12px] text-text-tertiary py-8 text-center">Click "Generate Welcome Email" to draft</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
