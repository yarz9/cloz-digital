// Shimmering skeleton placeholders. CSS-only.
export function Skeleton({ className = '', as: Tag = 'div', style }) {
  return <Tag className={`shimmer-loader ${className}`} style={style} />
}
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 8}%` }} />
      ))}
    </div>
  )
}
export function SkeletonCard() {
  return (
    <div className="card-premium space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  )
}
