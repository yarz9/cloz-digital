import { useState, useRef, useEffect } from 'react'
import { Shield, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, User } from 'lucide-react'
import { useUser, OPERATORS } from '@/contexts/UserContext'

// ══════════════════════════════════════════════════════════════
//  MANAGEMENT LOGIN — Password → User Selection → Personalized
// ══════════════════════════════════════════════════════════════

export default function ManagementLogin({ onAuthenticated, initialStep = 1 }) {
  // Three steps: 1 = primary password, 2 = secondary password, 3 = pick operator
  const [step, setStep] = useState(initialStep)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [stepDone, setStepDone] = useState(false)
  const inputRef = useRef(null)
  const { setUser } = useUser()

  useEffect(() => { inputRef.current?.focus() }, [step])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step === 3) return
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

      setStepDone(true)
      setTimeout(() => {
        setPassword('')
        setShowPassword(false)
        setStepDone(false)
        setStep(step + 1)
      }, 500)
    } catch {
      setError('Connection failed')
    }
    setLoading(false)
  }

  const handleSelectUser = (operatorId) => {
    setUser(operatorId)
    onAuthenticated()
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            {step < 3 ? <Shield size={22} className="text-accent" /> : <User size={22} className="text-accent" />}
          </div>
          <h1 className="font-display font-bold text-[22px]">
            {step < 3 ? 'Management Access' : 'Who is signing in?'}
          </h1>
          <p className="text-[12px] text-text-tertiary mt-1">
            {step < 3 ? 'Two-step verification required' : 'Your selection personalizes briefings and recommendations'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2, 3].map((s, i) => (
            <>
              <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                step === s ? 'bg-accent/10 text-accent border border-accent/30' :
                step > s ? 'bg-success/10 text-success border border-success/30' :
                'bg-elevated text-text-tertiary border border-border'
              }`}>
                {step > s ? <CheckCircle size={12} /> : <span className="w-4 h-4 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-bold">{s}</span>}
                {s === 1 ? 'Pass 1' : s === 2 ? 'Pass 2' : 'User'}
              </div>
              {i < 2 && <div className="w-6 h-px bg-border" />}
            </>
          ))}
        </div>

        {/* Password steps */}
        {step < 3 && (
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
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-error/5 border border-error/20 rounded-lg text-[12px] text-error">
                <AlertCircle size={13} />{error}
              </div>
            )}

            {stepDone && (
              <div className="flex items-center gap-2 px-3 py-2 bg-success/5 border border-success/20 rounded-lg text-[12px] text-success">
                <CheckCircle size={13} />Step {step} verified
              </div>
            )}

            <button type="submit" disabled={loading || !password.trim() || stepDone}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-lg text-[13px] font-semibold transition-colors">
              {loading ? <><Loader2 size={14} className="animate-spin" />Verifying...</> : <>Continue<ArrowRight size={14} /></>}
            </button>
          </form>
        )}

        {/* User selection */}
        {step === 3 && (
          <div className="space-y-3">
            {Object.values(OPERATORS).map(op => (
              <button
                key={op.id}
                onClick={() => handleSelectUser(op.id)}
                className="w-full flex items-center gap-4 bg-surface hover:bg-elevated border border-border hover:border-accent rounded-xl p-5 transition-all text-left group"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-display font-bold text-white shrink-0"
                  style={{ background: op.color }}
                >
                  {op.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[15px]">{op.fullName}</span>
                  </div>
                  <p className="text-[12px] text-text-tertiary mt-0.5">{op.title}</p>
                  <p className="text-[11px] text-text-tertiary mt-1.5 truncate">
                    {op.responsibilities.slice(0, 3).join(' · ')}
                  </p>
                </div>
                <ArrowRight size={16} className="text-text-tertiary group-hover:text-accent transition-colors shrink-0" />
              </button>
            ))}
            <p className="text-[10px] text-text-tertiary text-center mt-5">
              This selection only personalizes the experience. Both operators have full access.
            </p>
          </div>
        )}

        <p className="text-[10px] text-text-tertiary text-center mt-4">
          Cloz Digital Management &middot; Secure Access
        </p>
      </div>
    </div>
  )
}
