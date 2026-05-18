// MagneticButton — the button (or its inner label) tugs subtly toward
// the cursor on hover, then springs back. Use sparingly — only on
// hero / final CTAs.

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

export function MagneticButton({
  as = 'button',
  href,
  className = '',
  pullStrength = 0.25, // 0 = no pull, 1 = follow cursor 1:1
  children,
  ...rest
}) {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 })

  const onMove = (e) => {
    if (reduce || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * pullStrength)
    y.set((e.clientY - (r.top + r.height / 2)) * pullStrength)
  }
  const onLeave = () => { x.set(0); y.set(0) }

  // Render as <a> if href is provided so existing layouts (Link, anchor) still work.
  const Tag = href ? motion.a : motion[as] || motion.button

  return (
    <Tag
      ref={ref}
      href={href}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}
