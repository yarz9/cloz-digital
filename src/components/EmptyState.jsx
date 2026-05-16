import { Plus } from 'lucide-react'

// ══════════════════════════════════════════════════════════════
//  EmptyState — Production-grade "no data" component
//  Use anywhere a list/grid/table can be empty.
// ══════════════════════════════════════════════════════════════

export default function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center mb-4">
          <Icon size={22} className="text-text-tertiary" />
        </div>
      )}
      <h3 className="text-[15px] font-display font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && (
        <p className="text-[12px] text-text-tertiary max-w-[420px] leading-relaxed mb-5">{description}</p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-semibold transition-colors"
            >
              <Plus size={12} />
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-1.5 bg-elevated hover:bg-raised text-text-secondary px-4 py-2 rounded-md text-[12px] font-medium transition-colors"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
