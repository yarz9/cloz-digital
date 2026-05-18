// CountUp — animates a number from 0 to `to` the first time the
// element scrolls into view. Spring-driven for a soft settle.

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

export function CountUp({
  to,
  duration = 1.6,
  format,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px 0px' })
  const reduce = useReducedMotion()
  const [val, setVal] = useState(reduce ? to : 0)

  useEffect(() => {
    if (!inView || reduce) return
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      // Ease-out cubic so the final digits ease in nicely
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(to * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setVal(to)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration, reduce])

  const display = format
    ? format(val)
    : decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString()

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  )
}
