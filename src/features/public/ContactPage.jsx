import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, MapPin, Clock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { inquiry } from '@/lib/api'

const SERVICES = [
  'New website',
  'Website redesign',
  'Hosting & domain setup',
  'Ongoing maintenance',
  'Care plan',
  'Other',
]

export default function ContactPage() {
  useEffect(() => { document.title = 'Contact — Cloz Digital' }, [])
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', businessName: '', currentWebsite: '',
    serviceNeeded: SERVICES[0], message: '',
    website_url: '',  // honeypot
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!form.name.trim() || form.name.trim().length < 2) return setError('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Please enter a valid email address.')
    if (!form.serviceNeeded) return setError('Please tell us what you need.')
    if (!form.message.trim() || form.message.trim().length < 10) return setError('Please share a few details about your project (at least 10 characters).')

    setLoading(true)
    try {
      const result = await inquiry.submit(form)
      // Redirect to the branded thank-you page with inquiry reference
      const qs = new URLSearchParams({
        id: result.inquiryId || '',
        name: form.name || '',
      }).toString()
      navigate(`/thank-you?${qs}`)
    } catch (err) {
      setError(err.message || 'Could not submit. Please try again or email general@cloz.digital.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16">
          {/* ── Left: Info ── */}
          <div>
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Contact</span>
            <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">Let's talk about your project.</h1>
            <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">
              Tell us about your business. We'll respond within 24 hours with an honest assessment of how we can help.
            </p>

            <div className="mt-10 space-y-5">
              <InfoRow icon={Mail} title="Email">
                <a href="mailto:general@cloz.digital" className="text-text-secondary hover:text-accent transition-colors">general@cloz.digital</a>
              </InfoRow>
              <InfoRow icon={MapPin} title="Location">Sarajevo, Bosnia and Herzegovina</InfoRow>
              <InfoRow icon={Clock} title="Response Time">Within 24 hours, usually same day</InfoRow>
            </div>
          </div>

          {/* ── Right: Form ── */}
          <div>
            <div className="mb-5 flex items-center gap-2 px-3 py-2 bg-success/5 border border-success/15 rounded-md text-[12px] text-success">
              <ShieldCheck size={13} className="shrink-0" />
              <span>No spam. No obligation. Just an honest conversation about your project.</span>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                {/* Honeypot — hidden field that should remain empty */}
                <input
                  type="text" name="website_url" value={form.website_url}
                  onChange={e => update('website_url', e.target.value)}
                  tabIndex={-1} autoComplete="off"
                  style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Name" required>
                    <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" autoComplete="name" disabled={loading} />
                  </Field>
                  <Field label="Email" required>
                    <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@business.com" autoComplete="email" disabled={loading} />
                  </Field>
                </div>
                <Field label="Business Name">
                  <Input value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Your business" autoComplete="organization" disabled={loading} />
                </Field>
                <Field label="Current Website">
                  <Input type="url" value={form.currentWebsite} onChange={e => update('currentWebsite', e.target.value)} placeholder="https:// (if you have one)" autoComplete="url" disabled={loading} />
                </Field>
                <Field label="What do you need?" required>
                  <select value={form.serviceNeeded} onChange={e => update('serviceNeeded', e.target.value)} disabled={loading}
                    className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] text-text-secondary focus:border-accent focus:outline-none transition-colors disabled:opacity-60">
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Tell us more" required>
                  <textarea
                    rows="4" value={form.message} onChange={e => update('message', e.target.value)}
                    placeholder="Brief description of your project or what you're looking for..."
                    disabled={loading}
                    className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors resize-none disabled:opacity-60"
                  />
                </Field>

                {error && (
                  <div className="bg-error/5 border border-error/20 rounded-md px-3 py-2.5 flex items-start gap-2 text-[12px] text-error">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors text-[14px] flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : 'Send Inquiry'}
                </button>

                <p className="text-[11px] text-text-tertiary text-center leading-relaxed">
                  We respond within <span className="text-text-secondary">24 hours</span> — usually the same day.<br/>
                  Direct email: <a href="mailto:general@cloz.digital" className="text-accent hover:text-accent-hover">general@cloz.digital</a>
                </p>
              </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SUBCOMPONENTS
// ══════════════════════════════════════════════════════════════

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ type = 'text', ...props }) {
  return (
    <input
      type={type}
      {...props}
      className="w-full bg-surface border border-border rounded-md px-4 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors disabled:opacity-60"
    />
  )
}

function InfoRow({ icon: Icon, title, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="text-accent mt-0.5 shrink-0" />
      <div>
        <h3 className="text-[14px] font-medium">{title}</h3>
        <p className="text-[13px] text-text-secondary">{children}</p>
      </div>
    </div>
  )
}
