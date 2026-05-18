// Scroll-triggered reveal. Fades in + slides up the first time an
// element enters the viewport. CSS transition would do the same with
// IntersectionObserver, but Framer Motion gives us spring physics and
// staggered children for almost no extra weight.

import { motion, useReducedMotion } from 'framer-motion'

export function Reveal({
  as = 'div',
  delay = 0,
  y = 24,
  once = true,
  className = '',
  children,
  ...rest
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    // Honour user preference — no transform, no animation.
    return <MotionTag className={className} {...rest}>{children}</MotionTag>
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px 0px -80px 0px' }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.16, 1, 0.3, 1], // ease-emphasis from the CSS system
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

// Wrap a group of children to cascade their reveals. Pair with
// motion.* children or <RevealItem>.
export function RevealStagger({ children, className = '', delay = 0, gap = 0.08, once = true }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-60px 0px' }}
      variants={{
        hidden: {},
        show:   { transition: { delayChildren: delay, staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ className = '', y = 18, children, ...rest }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
