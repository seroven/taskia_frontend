import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function WorldsCoverGrid({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence>
      <ul className="worlds-cover-grid">{children}</ul>
    </AnimatePresence>
  )
}

export function WorldsCoverItem({
  index,
  children,
  delayStep = 0.04,
  delayCap = 0.2,
  duration = 0.24,
  y = 12,
  scale = 0.97,
}: {
  index: number
  children: ReactNode
  delayStep?: number
  delayCap?: number
  duration?: number
  y?: number
  scale?: number
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y, scale }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * delayStep, delayCap), duration }}
    >
      {children}
    </motion.li>
  )
}
