// Small status pills with semantic tones.
const TONES = {
  accent:  'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error:   'bg-error/15 text-error',
  muted:   'bg-elevated text-text-tertiary',
  glow:    'bg-accent/15 text-accent shadow-[0_0_12px_rgba(94,141,181,0.3)]',
}
export function Badge({ tone = 'muted', icon: Icon, dot = false, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${TONES[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${tone === 'success' ? 'animate-glow-pulse' : ''}`} />}
      {Icon && <Icon size={9} />}
      {children}
    </span>
  )
}
