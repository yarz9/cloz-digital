// Hairline scroll-progress bar fixed at the top of the viewport.
// CSS gradient + scaleX transform — 60fps no matter the page length.

import { motion, useScroll, useSpring } from 'framer-motion'

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 30, mass: 0.4 })
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none bg-gradient-to-r from-accent via-accent/70 to-accent/30"
    />
  )
}
