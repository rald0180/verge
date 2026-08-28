import type { ReactNode } from 'react'

import { cx } from '../../lib/format'

interface CardProps {
  readonly children: ReactNode
  /** `raised` is for a card sitting on top of another surface. */
  readonly tone?: 'default' | 'raised'
  /** Turn off the standard padding when the card holds a full-bleed child. */
  readonly padded?: boolean
  readonly className?: string
}

/**
 * The only card in the project. Radius, surface and ring come from the visual
 * system in CLAUDE.md section 4 and are not overridable — `className` is for
 * layout (span, height), not for skinning.
 */
export function Card({
  children,
  tone = 'default',
  padded = true,
  className,
}: CardProps) {
  return (
    <div
      className={cx(
        'rounded-2xl ring-1 ring-white/10',
        tone === 'raised' ? 'bg-surface-raised' : 'bg-surface',
        padded && 'p-6 md:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}
