import { Clock, Wallet } from 'lucide-react'

import { Card } from '../ui/Card'
import { DIMENSION_META, formatCostRange, formatEffort } from '../../lib/format'
import type { AdaptationAction } from '../../lib/types'

interface ActionCardProps {
  readonly action: AdaptationAction
}

/**
 * One recommended action.
 *
 * Every number here carries its unit and its framing: costs say "estimate",
 * because CLAUDE.md section 7 does not let a USD figure from a language model
 * stand on the page looking like a quote.
 */
export function ActionCard({ action }: ActionCardProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-100">{action.title}</h3>
          {/*
            Deliberately NOT the Badge primitive. Badge paints from the risk
            scale, so a high-impact action — the best thing on the page —
            rendered as "SEVERE · 90" in red, and announced to screen readers
            as "risk, 90 out of 100". Exactly backwards. Section 4 also
            reserves those five colours for risk levels only.
          */}
          <span className="shrink-0 rounded-full bg-surface-raised px-4 py-1 text-xs uppercase tracking-widest text-zinc-300">
            Impact {action.impactScore}
            <span className="sr-only"> out of 100, the model’s own estimate</span>
          </span>
        </div>

        <p className="text-sm text-zinc-400">{action.what}</p>

        <div className="flex flex-wrap justify-center gap-2">
          {action.reduces.map((dimension) => (
            <span
              key={dimension}
              className="rounded-full bg-surface-raised px-4 py-1 text-xs uppercase tracking-widest text-zinc-400"
            >
              {DIMENSION_META[dimension].label}
            </span>
          ))}
          {action.renterSafe ? (
            <span className="rounded-full bg-accent-quiet px-4 py-1 text-xs uppercase tracking-widest text-accent-text">
              Renter safe
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <div>
              <dt className="text-xs uppercase tracking-widest text-zinc-500">
                Estimated cost
              </dt>
              <dd className="text-sm text-zinc-100">
                {formatCostRange(action.estimatedCostUsd.low, action.estimatedCostUsd.high)}
                <span className="text-zinc-500"> estimate, USD</span>
              </dd>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <div>
              <dt className="text-xs uppercase tracking-widest text-zinc-500">Effort</dt>
              <dd className="text-sm text-zinc-100">{formatEffort(action.effortHours)}</dd>
            </div>
          </div>
        </dl>

        <p className="text-sm text-zinc-500">{action.paybackNote}</p>
      </div>
    </Card>
  )
}
