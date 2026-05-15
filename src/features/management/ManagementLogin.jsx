import { useState, useRef, useEffect } from 'react'
import { Shield, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ManagementLogin({ onAuthenticated }) {
  const [step, setStep] = useState(1)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step1Done, setStep1Done] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) return setError('Password required')
    setError('')
    setLoading(true)

    try {
      const endpoint = step === 1 ? '/api/management/auth/step-1' : '/api/management/auth/step-2'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Authentication failed')
        setLoading(false)
        return
      }

      if (step === 1) {
        setStep1Done(true)
        setTimeout(() => {
          setStep(2)
          setPassword('')
          setShowPassword(false)
          setStep1Done(false)
        }, 600)
      } else {
        onAuthenticated()
      }
    } catch (err) {
      setError('Connection failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-accent" />
          </div>
          <h1 className="font-display font-bold text-[22px]">Management Access</h1>
          <p className="text-[12px] text-text-tertiary mt-1">Two-step verification required</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
            step === 1 ? 'bg-accent/10 text-accent border border-accent/30' :
            'bg-success/10 text-success border border-success/30'
          }`}>
            {step > 1 ? <CheckCircle size={12} /> : <span className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-bold">1</span>}
            Step 1
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
            step === 2 ? 'bg-accent/10 text-accent border border-accent/30' :
            'bg-elevated text-text-tertiary border border-border'
          }`}>
            <span className="w-4 h-4 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-bold opacity-60">2</span>
            Step 2
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-2">
              {step === 1 ? 'Primary Password' : 'Secondary Password'}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder={step === 1 ? 'Enter primary password' : 'Enter secondary password'}
                autoComplete="off"
                className="w-full bg-elevated border border-border rounded-lg pl-9 pr-10 py-3 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-error/5 border border-error/20 rounded-lg text-[12px] text-error">
              <AlertCircle size={13} />{error}
            </div>
          )}

          {step1Done && (
            <div className="flex items-center gap-2 px-3 py-2 bg-success/5 border border-success/20 rounded-lg text-[12px] text-success">
              <CheckCircle size={13} />Step 1 verified
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim() || step1Done}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-lg text-[13px] font-semibold transition-colors"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" />Verifying...</>
            ) : (
              <>{step === 1 ? 'Continue' : 'Access Management'}<ArrowRight size={14} /></>
            )}
          </button>

          <p className="text-[10px] text-text-tertiary text-center">
            {step === 1 ? 'Step 1 of 2 — Enter the primary management password' : 'Step 2 of 2 — Enter the secondary confirmation password'}
          </p>
        </form>

        <p className="text-[10px] text-text-tertiary text-center mt-4">
          Cloz Digital Management &middot; Secure Access
        </p>
      </div>
    </div>
  )
}
