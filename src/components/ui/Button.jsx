// Premium Button — variants: primary (gradient), secondary (ghost),
// subtle, danger, link. Sizes: sm / md / lg. CSS-only motion.
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:   'button-premium focus-ring',
  secondary: 'button-premium ghost focus-ring',
  subtle:    'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors focus-ring',
  danger:    'inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold text-white bg-error/85 hover:bg-error transition-all focus-ring shadow-[0_4px_14px_rgba(239,68,68,0.25)]',
  link:      'inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors focus-ring',
}
const SIZES = {
  sm: 'text-[11px] !px-2.5 !py-1.5',
  md: '',
  lg: 'text-[14px] !px-6 !py-3',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${VARIANTS[variant]} ${SIZES[size]} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon ? <Icon size={13} /> : null}
      {children}
      {IconRight ? <IconRight size={13} /> : null}
    </button>
  )
}
