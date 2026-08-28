import { CONFIDENCE_LABELS, cx } from '../../lib/format'
import type { RiskScore } from '../../lib/types'

interface VerdictProps {
  readonly score: RiskScore
  /** Show the supporting numbers under the sentence. */
  readonly showEvidence?: boolean
}

/**
 * The plain-language sentence that sits under a dial.
 *
 * CLAUDE.md section 4: a bare number is a design failure. This is the component
 * that makes sure no dial ever ships without its sentence, and section 7 is why
 * the confidence label is not optional.
 */
export function Verdict({ score, showEvidence = true }: VerdictProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400">{score.headline}</p>

      <p
        className={cx(
          'inline-flex rounded-full bg-surface-raised px-4 py-1',
          'text-xs uppercase tracking-widest text-zinc-500',
        )}
      >
        {CONFIDENCE_LABELS[score.confidence]}
      </p>

      {showEvidence && score.evidence.length > 0 ? (
        <ul className="space-y-1 pt-2">
          {score.evidence.map((item) => (
            <li key={`${score.dimension}-${item.label}`} className="text-xs text-zinc-500">
              <span className="text-zinc-400">
                {item.label}: {item.value} {item.unit}
              </span>{' '}
              — {item.source}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
