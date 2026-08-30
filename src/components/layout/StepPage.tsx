import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface StepPageProps {
  /** Changing this key is what triggers the transition. */
  readonly stepKey: string
  readonly children: ReactNode
}

/**
 * Fades and lifts a step into place when the page changes.
 *
 * Now that each step is its own page rather than a section further down a
 * scroll, there is no motion to tell the user anything happened — the content
 * would simply be replaced between frames. 300 ms, ease-out, no bounce, per
 * CLAUDE.md section 4, and skipped entirely when the user has asked for
 * reduced motion.
 */
export function StepPage({ stepKey, children }: StepPageProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return <div className="space-y-8">{children}</div>

  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-8"
    >
      {children}
    </motion.div>
  )
}
