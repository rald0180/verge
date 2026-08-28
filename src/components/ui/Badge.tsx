import { bandFor } from '../../lib/scoring'
import { BAND_STYLES, cx } from '../../lib/format'

interface BadgeProps {
  /** A risk score, 0-100. The badge picks its own colour from the risk scale. */
  readonly score: number
  /** Show the number as well as the band name. */
  readonly showValue?: boolean
  readonly className?: string
}

/**
 * A risk pill. Give it a score and it decides its own colour — no caller is
 * allowed to pass a risk colour in, which is what stops the five reserved
 * colours from drifting onto things that are not risk levels.
 */
export function Badge({ score, showValue = true, className }: BadgeProps) {
  const band = bandFor(score)
  const style = BAND_STYLES[band]
  const rounded = Math.round(score)

  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 rounded-full px-4 py-1',
        'text-xs font-medium uppercase tracking-widest',
        style.chip,
        className,
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', style.fill)} aria-hidden="true" />
      {showValue ? `${style.label} · ${rounded}` : style.label}
      <span className="sr-only">{` risk, ${rounded} out of 100`}</span>
    </span>
  )
}
