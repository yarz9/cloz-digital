// Premium Card primitives. Composes the `card-premium` class from
// the premium design system, with optional sheen on hover.

export function Card({ as: Tag = 'div', sheen = false, glow = false, className = '', children, ...rest }) {
  return (
    <Tag {...rest}
      className={`card-premium ${sheen ? 'with-sheen' : ''} ${glow ? 'bg-glow' : ''} ${className}`}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, eyebrow, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            {Icon && <Icon size={11} />}
            {eyebrow}
          </div>
        )}
        <h3 className="font-display font-semibold text-[15px] text-text-primary leading-tight">{title}</h3>
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, sub, trend, icon: Icon, glow = true }) {
  const trendUp = trend?.startsWith('+')
  return (
    <Card glow={glow} className="hover-lift">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent font-semibold mb-1.5">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="font-display font-bold text-[26px] text-text-primary leading-none">
        <span className="text-gradient-static">{value ?? '—'}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {trend && (
          <span className={`text-[10px] font-mono font-semibold ${trendUp ? 'text-success' : 'text-error'}`}>{trend}</span>
        )}
        {sub && <span className="text-[10px] text-text-tertiary">{sub}</span>}
      </div>
    </Card>
  )
}
