import { CircleAlert } from 'lucide-react'

import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CoolingScore } from '../audit/CoolingScore'
import { Interventions } from '../audit/Interventions'
import { PlanList } from '../planner/PlanList'
import { RiskGrid } from '../lens/RiskGrid'
import { SurfaceOverlay } from '../audit/SurfaceOverlay'
import { DIMENSION_META } from '../../lib/format'
import type { AdaptationPlan, CoolingAudit, RiskProfile } from '../../lib/types'
import type { Step } from '../../hooks/useStep'

interface SummaryPageProps {
  readonly profile: RiskProfile
  readonly plan?: AdaptationPlan
  readonly audit?: CoolingAudit
  /** Object URL of the audited photo, when there is one. */
  readonly previewUrl?: string
  readonly onGoTo: (step: Step) => void
}

/**
 * One card per step that was skipped.
 *
 * The summary has to be honest about being incomplete. Rendering a plan-shaped
 * gap in silence would let someone screenshot a half-finished report and read
 * it as the whole answer.
 */
function SkippedNotice({
  title,
  body,
  actionLabel,
  onGo,
}: {
  readonly title: string
  readonly body: string
  readonly actionLabel: string
  readonly onGo: () => void
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
          <CircleAlert className="h-5 w-5 text-zinc-400" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        <p className="max-w-md text-sm text-zinc-400">{body}</p>
        <Button variant="ghost" size="sm" onClick={onGo}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  )
}

/**
 * The final page: everything the three steps produced, in one place.
 *
 * Nothing is recomputed here. Every number on this page was already calculated
 * and shown on the step that produced it, so the summary cannot disagree with
 * the flow that built it.
 */
export function SummaryPage({ profile, plan, audit, previewUrl, onGoTo }: SummaryPageProps) {
  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Your address</p>
          <p className="text-2xl font-semibold tracking-tight text-zinc-100">
            {profile.place.shortName}
          </p>
          <p className="max-w-lg text-sm text-zinc-400">{profile.place.displayName}</p>

          <Badge score={profile.composite} />

          <p className="mx-auto max-w-lg text-sm text-zinc-400">
            Scored {profile.composite} of 100 across four dimensions, weighted equally.
            The biggest driver here is {DIMENSION_META[profile.dominant].label.toLowerCase()}.
          </p>
        </div>
      </Card>

      <section className="space-y-4">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
          What this address faces
        </p>
        <RiskGrid scores={profile.scores} dominant={profile.dominant} />
      </section>

      <section className="space-y-4">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
          What to do about it
        </p>
        {plan ? (
          <PlanList plan={plan} />
        ) : (
          <SkippedNotice
            title="No plan built yet"
            body="The adaptation planner turns these four scores into a ranked, costed list of things you can actually do. It takes three questions about your place."
            actionLabel="Build a plan"
            onGo={() => onGoTo('plan')}
          />
        )}
      </section>

      <section className="space-y-4">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
          Your street
        </p>
        {audit ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {previewUrl ? (
              <SurfaceOverlay previewUrl={previewUrl} surfaces={audit.surfaces} />
            ) : null}
            <div className="space-y-4">
              <CoolingScore audit={audit} />
              <Interventions interventions={audit.interventions} />
            </div>
          </div>
        ) : (
          <SkippedNotice
            title="No street photo audited"
            body="A photo of your street, yard or balcony gets a cooling score and three specific changes, read from the surfaces actually in the frame."
            actionLabel="Audit a photo"
            onGo={() => onGoTo('audit')}
          />
        )}
      </section>
    </div>
  )
}
