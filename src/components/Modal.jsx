import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, wide }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className={`bg-surface border border-border rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-[16px]">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-elevated rounded transition-colors">
            <X size={16} className="text-text-tertiary" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

// Reusable form field components
export function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-text-tertiary block mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
      {hint && <span className="text-[10px] text-text-tertiary mt-1 block">{hint}</span>}
    </div>
  )
}

export function Input({ ...props }) {
  return (
    <input
      {...props}
      className={`w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors ${props.className || ''}`}
    />
  )
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] text-text-primary focus:border-accent focus:outline-none transition-colors ${props.className || ''}`}
    >
      {children}
    </select>
  )
}

export function Textarea({ ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none transition-colors ${props.className || ''}`}
    />
  )
}

export function SubmitButton({ children, loading, disabled }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Processing...' : children}
    </button>
  )
}

export function SuccessBanner({ message }) {
  if (!message) return null
  return (
    <div className="bg-success/10 border border-success/20 rounded-md px-4 py-2.5 text-[12px] text-success font-medium">
      {message}
    </div>
  )
}
