import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '../ui/Button'
import { CONFIDENCE_LABELS, cx } from '../../lib/format'
import type { RiskScore } from '../../lib/types'

interface VerdictProps {
  readonly score: RiskScore
  /** Show the "how we got this" control. */
  readonly showEvidence?: boolean
}

/**
 * The plain-language sentence that sits under a dial.
 *
 * CLAUDE.md section 4: a bare number is a design failure. This is the component
 * that makes sure no dial ever ships without its sentence, and section 7 is why
 * the confidence label is not optional.
 *
 * The evidence is behind a disclosure rather than always on screen. It used to
 * be permanently visible, and four dials each carrying three or four lines of
 * grey source text turned the page into a spreadsheet — the honesty was
 * costing the design far more than it needed to. One click is not hiding it,
 * and the confidence label stays visible either way, so nothing that qualifies
 * a number has moved out of sight.
 */
export function Verdict({ score, showEvidence = true }: VerdictProps) {
  const [open, setOpen] = useState(false)
  const hasEvidence = score.evidence.length > 0

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">{score.headline}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cx(
            'inline-flex rounded-full bg-surface-raised px-4 py-1',
            'text-xs uppercase tracking-widest text-zinc-500',
          )}
        >
          {CONFIDENCE_LABELS[score.confidence]}
        </span>

        {showEvidence && hasEvidence ? (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            How we got this
          </Button>
        ) : null}
      </div>

      {showEvidence && hasEvidence && open ? (
        <ul className="space-y-2 border-t border-white/10 pt-3">
          {score.evidence.map((item) => (
            <li key={`${score.dimension}-${item.label}`} className="text-xs text-zinc-500">
              <span className="text-zinc-300">
                {item.label}: {item.value} {item.unit}
              </span>
              <br />
              {item.source}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
