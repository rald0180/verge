import { Card } from '../ui/Card'
import type { Intervention } from '../../lib/types'

interface InterventionsProps {
  readonly interventions: readonly Intervention[]
}

/**
 * The three things worth doing to this spot.
 *
 * Every degree figure here is a published range from the literature cited
 * beneath it, selected server-side — the model chooses which intervention
 * applies, never what it is worth. See api/audit.ts.
 *
 * `measures` is rendered next to the number rather than buried in the citation
 * because it is the difference between a true statement and a misleading one:
 * a cool roof is worth ~30 °C of roof surface, 1-3 °C indoors, and almost
 * nothing to the street's air. A bare "−3 °C" would be indefensible.
 */
export function Interventions({ interventions }: InterventionsProps) {
  return (
    <div className="space-y-4">
      {interventions.map((intervention) => (
        <Card key={intervention.title}>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-100">{intervention.title}</h3>

            <p className="text-sm text-zinc-400">{intervention.description}</p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-quiet px-4 py-1 text-xs uppercase tracking-widest text-accent-text">
                −{intervention.coolingEffectC.low} to −{intervention.coolingEffectC.high} °C
              </span>
              <span className="text-xs uppercase tracking-widest text-zinc-500">
                {intervention.measures}
              </span>
            </div>

            <p className="text-xs text-zinc-500">
              Published range at {intervention.scaleNote}.
            </p>

            <p className="text-xs text-zinc-500">{intervention.sourceNote}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
