import { cx } from '../../lib/format'

interface SkeletonProps {
  /** Layout only — height, width, and grid placement. */
  readonly className?: string
  /** Dials and avatars want a circle. */
  readonly shape?: 'block' | 'circle'
}

/** The loading state for everything. Never a spinner, never a bare "Loading…". */
export function Skeleton({ className, shape = 'block' }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-hidden="true"
      className={cx(
        'animate-pulse bg-surface-raised',
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        className,
      )}
    />
  )
}
