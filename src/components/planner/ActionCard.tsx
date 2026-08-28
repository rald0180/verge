import { Clock, Wallet } from 'lucide-react'

import { Badge } from '../ui/Badge'
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
 * because CLAUDE.md section 7 does not let an AUD figure from a language model
 * stand on the page looking like a quote.
 */
export function ActionCard({ action }: ActionCardProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-sm font-medium text-zinc-100">{action.title}</h3>
          <Badge score={action.impactScore} />
        </div>

        <p className="text-sm text-zinc-400">{action.what}</p>

        <div className="flex flex-wrap gap-2">
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
          <div className="flex items-start gap-2">
            <Wallet className="mt-1 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <div>
              <dt className="text-xs uppercase tracking-widest text-zinc-500">
                Estimated cost
              </dt>
              <dd className="text-sm text-zinc-100">
                {formatCostRange(action.estimatedCostAud.low, action.estimatedCostAud.high)}
                <span className="text-zinc-500"> estimate, AUD</span>
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="mt-1 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
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
