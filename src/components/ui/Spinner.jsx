// Branded spinner — uses CSS keyframes (not Lucide's icon) so it can be
// tinted via currentColor and sized via CSS.
export function Spinner({ size = 16, className = '' }) {
  const stroke = Math.max(1.5, size / 8)
  return (
    <span
      className={`inline-block animate-spin ${className}`}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `${stroke}px solid currentColor`,
        borderTopColor: 'transparent', opacity: 0.85,
      }}
      aria-label="Loading"
    />
  )
}
