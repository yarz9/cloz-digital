import { MessageSquare, Send, Search, Filter, Sparkles, Loader2, Mail, Phone, Video } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const messages = [
  { id: 1, client: 'Peak Athletics', type: 'email', direction: 'sent', subject: 'Invoice reminder - INV-1042', date: '2026-05-12', preview: 'Hi, just a friendly reminder about your outstanding invoice...' },
  { id: 2, client: 'Zenith Consulting', type: 'email', direction: 'received', subject: 'Re: Website updates for Q3', date: '2026-05-12', preview: 'Thanks for the proposal. We would like to proceed with...' },
  { id: 3, client: 'Harmony Yoga', type: 'call', direction: 'outgoing', subject: 'Monthly check-in call', date: '2026-05-11', preview: 'Discussed upcoming content calendar and SEO improvements...' },
  { id: 4, client: 'Brava Interiors', type: 'email', direction: 'sent', subject: 'Domain renewal notice - bravainteriors.ba', date: '2026-05-10', preview: 'Your domain bravainteriors.ba will expire in 14 days...' },
  { id: 5, client: 'Alpine Outdoor Shop', type: 'email', direction: 'sent', subject: 'Growth Care proposal', date: '2026-05-09', preview: 'Please find attached our Growth Care package proposal...' },
  { id: 6, client: 'Stari Grad Restaurant', type: 'call', direction: 'incoming', subject: 'Menu update request', date: '2026-05-08', preview: 'Client requested seasonal menu update on their website...' },
  { id: 7, client: 'Mira Wellness', type: 'email', direction: 'sent', subject: 'Maintenance report - May 2026', date: '2026-05-07', preview: 'Your monthly maintenance report is ready. All plugins updated...' },
]

export default function Communications() {
  const [filter, setFilter] = useState('all')
  const [composing, setComposing] = useState(false)
  const [composeClient, setComposeClient] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const draft = useAI(ai.generate)

  const filtered = filter === 'all' ? messages : messages.filter(m => m.type === filter)

  const generateDraft = () => {
    if (!composeClient || !composeSubject) return
    draft.run(
      `Draft a professional email from Cloz Digital to our client "${composeClient}" regarding: "${composeSubject}". Keep it concise, professional, and action-oriented. Sign off as "Cloz Digital Team".`,
      0.7
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Communications</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Client communication log and AI-assisted drafting</p>
        </div>
        <button
          onClick={() => setComposing(!composing)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
        >
          <Send size={13} /> Compose
        </button>
      </div>

      {/* Compose panel */}
      {composing && (
        <div className="bg-surface border border-accent/30 rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3">New Message</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Client</label>
              <input
                value={composeClient}
                onChange={e => setComposeClient(e.target.value)}
                placeholder="Client name..."
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-tertiary block mb-1">Subject</label>
              <input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={generateDraft}
            disabled={draft.loading || !composeClient || !composeSubject}
            className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover font-medium disabled:opacity-50"
          >
            {draft.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {draft.loading ? 'Drafting...' : 'AI Draft'}
          </button>
          {draft.data?.text && (
            <div className="mt-3 p-3 bg-elevated rounded-md text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
              {draft.data.text}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'email', 'call'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${
              filter === f ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
            }`}
          >{f}</button>
        ))}
        <span className="ml-auto text-[11px] text-text-tertiary">{filtered.length} messages</span>
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                m.type === 'email' ? 'bg-accent-muted' : 'bg-success/10'
              }`}>
                {m.type === 'email' ? <Mail size={14} className="text-accent" /> : <Phone size={14} className="text-success" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-medium">{m.client}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                    m.direction === 'sent' || m.direction === 'outgoing' ? 'bg-accent-muted text-accent' : 'bg-success/10 text-success'
                  }`}>{m.direction}</span>
                </div>
                <span className="text-[12px] text-text-primary">{m.subject}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{m.preview}</p>
              </div>
              <span className="text-[10px] text-text-tertiary shrink-0">{m.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
