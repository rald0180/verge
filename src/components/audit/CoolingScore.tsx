import { Thermometer } from 'lucide-react'

import { BAND_STYLES, cx } from '../../lib/format'
import { Card } from '../ui/Card'
import type { CoolingAudit } from '../../lib/types'

interface CoolingScoreProps {
  readonly audit: CoolingAudit
}

/**
 * The cooling score, big.
 *
 * `audit.band` is the heat-risk band implied by the score, not the score's own
 * position on the scale — a cooling score of 90 is a good result and paints
 * emerald, not red. See the note on CoolingAudit in types.ts.
 */
export function CoolingScore({ audit }: CoolingScoreProps) {
  const style = BAND_STYLES[audit.band]

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Cooling score
            </p>
            <p className={cx('mt-2 text-5xl font-semibold tracking-tight', style.text)}>
              {Math.round(audit.coolingScore)}
              <span className="text-2xl text-zinc-500"> / 100</span>
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Higher is cooler. This frame reads as {style.label.toLowerCase()} heat risk.
            </p>
          </div>

          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-quiet">
            <Thermometer className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-widest text-zinc-500">
              Tree canopy
            </dt>
            <dd className="mt-1 text-sm text-zinc-100">
              about {Math.round(audit.canopyCoverPct)}% of the frame
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-zinc-500">
              Hard surfaces
            </dt>
            <dd className="mt-1 text-sm text-zinc-100">
              about {Math.round(audit.imperviousPct)}% of the frame
            </dd>
          </div>
        </dl>

        <p className="text-xs text-zinc-500">{audit.caveat}</p>
      </div>
    </Card>
  )
}
