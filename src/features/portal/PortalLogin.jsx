import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { portal, setToken, setCachedClient } from '@/lib/portalApi'

// ══════════════════════════════════════════════════════════════
//  PORTAL LOGIN — Passwordless magic-link auth
// ══════════════════════════════════════════════════════════════

export default function PortalLogin() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState(params.get('email') || '')
  const [step, setStep] = useState('request')  // request | sent | verifying | error
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { document.title = 'Sign in — Cloz Digital Portal' }, [])

  // If a verify token is present, exchange it immediately
  useEffect(() => {
    const token = params.get('token')
    if (token) {
      setStep('verifying')
      portal.verifyMagicLink(token)
        .then(res => {
          setToken(res.accessToken)
          setCachedClient(res.client)
          navigate('/portal/dashboard', { replace: true })
        })
        .catch(e => {
          setError(e.message)
          setStep('error')
        })
    }
  }, []) // eslint-disable-line

  const handleRequest = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError('Enter a valid email address.')
    }
    setLoading(true)
    try {
      await portal.requestMagicLink(email.trim())
      setStep('sent')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-accent" />
          </div>
          <h1 className="font-display font-bold text-[24px]">Client Portal</h1>
          <p className="text-[12px] text-text-tertiary mt-1">Your private Cloz Digital workspace</p>
        </div>

        {step === 'request' && (
          <form onSubmit={handleRequest} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-2">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@business.com" autoComplete="email" required autoFocus
                  className="w-full bg-elevated border border-border rounded-lg pl-9 pr-3 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-error/5 border border-error/20 rounded-lg text-[12px] text-error">
                <AlertCircle size={13} />{error}
              </div>
            )}

            <button type="submit" disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-lg text-[13px] font-semibold transition-colors">
              {loading ? <><Loader2 size={14} className="animate-spin" />Sending link...</> : <>Send Sign-in Link<ArrowRight size={14} /></>}
            </button>

            <p className="text-[11px] text-text-tertiary text-center leading-relaxed">
              We'll email you a secure one-time link.<br/>
              No password required.
            </p>
          </form>
        )}

        {step === 'sent' && (
          <div className="bg-surface border border-success/30 rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 size={22} className="text-success" />
            </div>
            <h2 className="font-display font-bold text-[17px] mb-2">Check your inbox</h2>
            <p className="text-[12px] text-text-secondary leading-relaxed mb-4">
              If <strong className="text-text-primary">{email}</strong> belongs to a Cloz Digital client,
              we just sent a sign-in link. It expires in 30 minutes.
            </p>
            <button onClick={() => { setStep('request'); setEmail('') }}
              className="text-[12px] text-text-tertiary hover:text-text-primary underline">
              Use a different email
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <Loader2 size={22} className="animate-spin text-accent mx-auto mb-3" />
            <p className="text-[13px] text-text-secondary">Verifying your sign-in link…</p>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-surface border border-error/30 rounded-xl p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-4">
              <AlertCircle size={22} className="text-error" />
            </div>
            <h2 className="font-display font-bold text-[17px] mb-2">Sign-in failed</h2>
            <p className="text-[12px] text-error mb-4">{error}</p>
            <button onClick={() => { setStep('request'); setError(''); navigate('/portal/login', { replace: true }) }}
              className="text-[12px] text-accent hover:text-accent-hover underline">
              Request a new link
            </button>
          </div>
        )}

        <p className="text-[10px] text-text-tertiary text-center mt-6">
          Not a Cloz Digital client yet?{' '}
          <a href="/contact" className="text-accent hover:text-accent-hover">Get in touch →</a>
        </p>
      </div>
    </div>
  )
}
