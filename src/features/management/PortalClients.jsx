import { useState, useEffect } from 'react'
import {
  Users, Plus, Loader2, AlertCircle, X, Mail, CheckCircle2,
  Send, Trash2, RefreshCw, Globe,
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  ADMIN: PORTAL CLIENTS — Onboarding + viewing portal users
// ══════════════════════════════════════════════════════════════

async function api(path, options = {}) {
  const res = await fetch(`/api/portal-admin${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

export default function PortalClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [success, setSuccess] = useState(null)

  const load = () => {
    setLoading(true)
    api('/clients').then(d => { setClients(d.clients || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    if (!confirm('Delete this portal client and ALL their portal data? This cannot be undone.')) return
    try { await api(`/clients/${id}`, { method: 'DELETE' }); load() }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">Portal Clients</h1>
          <p className="text-[12px] text-text-secondary mt-1">Onboard and manage clients who have access to the Cloz Digital portal</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-semibold">
            <Plus size={13} />Onboard Client
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error/5 border border-error/20 rounded-md p-3 text-[12px] text-error flex items-center gap-2">
          <AlertCircle size={13} /><span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}

      {success && (
        <div className="bg-success/5 border border-success/20 rounded-md p-3 text-[12px] text-success flex items-center gap-2">
          <CheckCircle2 size={13} />
          <span className="flex-1">
            <strong>{success.business_name}</strong> onboarded.
            {success.welcomeSent ? ' Welcome email sent.' : ' Welcome email skipped (Resend not configured).'}
          </span>
          <button onClick={() => setSuccess(null)}><X size={13} /></button>
        </div>
      )}

      {showForm && <OnboardForm onCancel={() => setShowForm(false)} onSuccess={(c) => { setSuccess(c); setShowForm(false); load() }} />}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
      ) : clients.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Users}
            title="No portal clients yet"
            description="Onboard your first client. They'll receive a welcome email with a passwordless sign-in link to their private workspace."
            actionLabel="Onboard First Client"
            onAction={() => setShowForm(true)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(c => (
            <div key={c.id} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-accent-muted flex items-center justify-center text-[14px] font-display font-bold text-accent">
                {c.business_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium truncate">{c.business_name}</span>
                  {c.status === 'suspended' && <span className="text-[9px] uppercase tracking-wider bg-error/10 text-error px-1.5 py-0.5 rounded">Suspended</span>}
                </div>
                <div className="text-[11px] text-text-tertiary flex items-center gap-2 mt-0.5 flex-wrap">
                  <Mail size={10} />{c.email}
                  {c.package && <><span>·</span><span>{c.package}</span></>}
                  {c.industry && <><span>·</span><span>{c.industry}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => remove(c.id)} title="Delete"
                  className="p-1.5 text-text-tertiary hover:text-error rounded">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OnboardForm({ onCancel, onSuccess }) {
  const [form, setForm] = useState({
    business_name: '', contact_name: '', email: '', phone: '',
    industry: '', website: '', logo_url: '',
    brand_colors: { accent: '#5E8DB5', primary: '#F5F5F7', bg: '#0B0B0D' },
    brand_fonts: { heading: '', body: '' },
    voice_guidelines: '',
    package: 'Presence Care',
    hosting_provider: '', domain_registrar: '',
    domain_expiry: '', ssl_expiry: '', mrr: 0,
    send_welcome: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updateColor = (k, v) => setForm(f => ({ ...f, brand_colors: { ...f.brand_colors, [k]: v } }))
  const updateFont = (k, v) => setForm(f => ({ ...f, brand_fonts: { ...f.brand_fonts, [k]: v } }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.business_name.trim() || !form.email.trim()) {
      return setError('Business name and email are required.')
    }
    setSubmitting(true)
    try {
      const result = await api('/clients', { method: 'POST', body: JSON.stringify(form) })
      onSuccess({ business_name: form.business_name, welcomeSent: result.welcomeSent })
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-accent/20 rounded-xl p-6 space-y-4">
      <h3 className="font-display font-semibold text-[16px] mb-2">Onboard Portal Client</h3>

      <div className="grid md:grid-cols-2 gap-3">
        <FormField label="Business Name" required>
          <input value={form.business_name} onChange={e => update('business_name', e.target.value)} required
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
        </FormField>
        <FormField label="Contact Name">
          <input value={form.contact_name} onChange={e => update('contact_name', e.target.value)}
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
        </FormField>
        <FormField label="Email" required>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
        </FormField>
        <FormField label="Phone">
          <input value={form.phone} onChange={e => update('phone', e.target.value)}
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
        </FormField>
        <FormField label="Industry">
          <input value={form.industry} onChange={e => update('industry', e.target.value)}
            placeholder="e.g. Dental clinic, Restaurant, Law firm"
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
        </FormField>
        <FormField label="Website">
          <input value={form.website} onChange={e => update('website', e.target.value)}
            placeholder="https://"
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
        </FormField>
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-3">Brand Kit</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <FormField label="Logo URL">
            <input value={form.logo_url} onChange={e => update('logo_url', e.target.value)}
              placeholder="https://..."
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
          <FormField label="Voice Guidelines">
            <input value={form.voice_guidelines} onChange={e => update('voice_guidelines', e.target.value)}
              placeholder="e.g. Professional but warm. Avoid jargon."
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <FormField label="Accent Color">
            <div className="flex gap-1">
              <input type="color" value={form.brand_colors.accent} onChange={e => updateColor('accent', e.target.value)}
                className="w-10 h-9 bg-elevated border border-border rounded cursor-pointer" />
              <input value={form.brand_colors.accent} onChange={e => updateColor('accent', e.target.value)}
                className="flex-1 bg-elevated border border-border rounded-md px-2 py-2 text-[11px] font-mono focus:border-accent focus:outline-none" />
            </div>
          </FormField>
          <FormField label="Heading Font">
            <input value={form.brand_fonts.heading} onChange={e => updateFont('heading', e.target.value)}
              placeholder="e.g. Plus Jakarta Sans"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
          <FormField label="Body Font">
            <input value={form.brand_fonts.body} onChange={e => updateFont('body', e.target.value)}
              placeholder="e.g. Inter"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-3">Plan & Infrastructure</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <FormField label="Package">
            <select value={form.package} onChange={e => update('package', e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
              <option value="">None</option><option>Launch Care</option>
              <option>Growth Care</option><option>Presence Care</option>
            </select>
          </FormField>
          <FormField label="MRR (BAM)">
            <input type="number" value={form.mrr} onChange={e => update('mrr', e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
          <FormField label="Hosting Provider">
            <input value={form.hosting_provider} onChange={e => update('hosting_provider', e.target.value)}
              placeholder="e.g. Hetzner, Vercel"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
          <FormField label="Domain Registrar">
            <input value={form.domain_registrar} onChange={e => update('domain_registrar', e.target.value)}
              placeholder="e.g. BH Telecom, Namecheap"
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
          <FormField label="Domain Expiry">
            <input type="date" value={form.domain_expiry} onChange={e => update('domain_expiry', e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
          <FormField label="SSL Expiry">
            <input type="date" value={form.ssl_expiry} onChange={e => update('ssl_expiry', e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          </FormField>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12px] text-text-secondary pt-3 border-t border-border">
        <input type="checkbox" checked={form.send_welcome} onChange={e => update('send_welcome', e.target.checked)}
          className="accent-accent" />
        Send welcome email with portal sign-in link
      </label>

      {error && (
        <div className="bg-error/5 border border-error/20 rounded-md p-3 text-[12px] text-error flex items-center gap-2">
          <AlertCircle size={13} />{error}
        </div>
      )}

      <div className="flex items-center gap-2 justify-end pt-3 border-t border-border">
        <button type="button" onClick={onCancel} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Cancel</button>
        <button type="submit" disabled={submitting}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-md text-[12px] font-semibold">
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Onboard & Send Welcome
        </button>
      </div>
    </form>
  )
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
