import { useState } from 'react'
import { MessageSquare, Send, Sparkles, Loader2, Mail, Phone } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  COMMUNICATIONS — Real client communication log
// ══════════════════════════════════════════════════════════════

export default function Communications() {
  const clients = useStore(s => s.clients)
  const messages = useStore(s => s.activity).filter(a =>
    a.text?.includes('email') || a.text?.includes('call') || a.text?.includes('message') || a.text?.includes('proposal')
  )

  const [filter, setFilter] = useState('all')
  const [composing, setComposing] = useState(false)
  const [composeClient, setComposeClient] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const draft = useAI(ai.generate)

  const generateDraft = () => {
    if (!composeClient || !composeSubject) return
    draft.run(
      `Draft a professional email from Cloz Digital to our client "${composeClient}" regarding: "${composeSubject}". Keep it concise, professional, and action-oriented. Sign off as "Cloz Digital Team".`,
      0.7
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Communications</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Client communication log and AI-assisted drafting</p>
        </div>
        <button onClick={() => setComposing(!composing)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Send size={13} /> Compose
        </button>
      </div>

      {/* Compose panel */}
      {composing && (
        <div className="bg-surface border border-accent/30 rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3">AI-Assisted Draft</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Client</label>
              <input list="clients-datalist" value={composeClient} onChange={e => setComposeClient(e.target.value)}
                placeholder="Client name..."
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none" />
              <datalist id="clients-datalist">
                {clients.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Topic</label>
              <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                placeholder="Subject or context..."
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none" />
            </div>
          </div>
          <button onClick={generateDraft} disabled={draft.loading || !composeClient || !composeSubject}
            className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover font-medium disabled:opacity-50">
            {draft.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {draft.loading ? 'Drafting...' : 'AI Draft'}
          </button>
          {draft.error && <div className="mt-3 text-[11px] text-error">{draft.error}</div>}
          {draft.data?.text && (
            <div className="mt-3 p-3 bg-elevated rounded-md text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
              {draft.data.text}
            </div>
          )}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={MessageSquare}
            title="No communications logged yet"
            description="As you work, communication activity (emails sent, calls logged, proposals dispatched) shows up here automatically. For full email management, use the Mail module."
            actionLabel="Open Mail"
            onAction={() => window.location.href = '/management/mail'}
            secondaryActionLabel="AI Draft an Email"
            onSecondaryAction={() => setComposing(true)}
          />
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <span className="ml-auto text-[11px] text-text-tertiary">{messages.length} log entr{messages.length === 1 ? 'y' : 'ies'}</span>
          </div>

          <div className="space-y-2">
            {messages.slice(0, 30).map(m => (
              <div key={m.id} className="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-muted">
                    <Mail size={14} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-text-primary truncate block">{m.text}</span>
                    <span className="text-[10px] text-text-tertiary">{m.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
