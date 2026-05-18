// SpotlightCard — a soft radial highlight follows the cursor across
// the surface, then fades when the cursor leaves. Pure CSS variable
// + transform-only; zero re-renders.
//
// Use as a drop-in replacement for `.card-premium` when the card is
// hoverable and you want a premium "alive" feel.

import { useRef } from 'react'

export function SpotlightCard({
  as: Tag = 'div',
  className = '',
  spotlightColor = 'rgba(94, 141, 181, 0.18)', // accent at low alpha
  children,
  ...rest
}) {
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
    el.style.setProperty('--spot-opacity', '1')
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--spot-opacity', '0')
  }

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`spotlight-card ${className}`}
      style={{ '--spot-color': spotlightColor }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
