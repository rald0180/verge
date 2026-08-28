import { Card } from '../ui/Card'
import type { Intervention } from '../../lib/types'

interface InterventionsProps {
  readonly interventions: readonly Intervention[]
}

/**
 * The three things worth doing to this street.
 *
 * Each cooling figure is a published range with its source printed next to it.
 * CLAUDE.md section 7: the range comes from urban heat island literature cited
 * in README.md, the surface composition it is applied to comes from a model,
 * and both of those uncertainties are stated rather than averaged away into a
 * single confident-looking number.
 */
export function Interventions({ interventions }: InterventionsProps) {
  return (
    <div className="space-y-4">
      {interventions.map((intervention) => (
        <Card key={intervention.title}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-medium text-zinc-100">{intervention.title}</h3>
              <span className="shrink-0 rounded-full bg-accent-quiet px-4 py-1 text-xs uppercase tracking-widest text-accent-text">
                −{intervention.coolingEffectC.low} to −{intervention.coolingEffectC.high} °C
              </span>
            </div>

            <p className="text-sm text-zinc-400">{intervention.description}</p>
            <p className="text-xs text-zinc-500">{intervention.sourceNote}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
