import { ImagePlus, MapPin } from 'lucide-react'

import { AddressSearch } from './components/lens/AddressSearch'
import { AppShell } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { Badge } from './components/ui/Badge'
import { Card } from './components/ui/Card'
import { CoolingScore } from './components/audit/CoolingScore'
import { DIMENSION_META } from './lib/format'
import { DwellingForm } from './components/planner/DwellingForm'
import { ErrorState } from './components/ui/ErrorState'
import { Interventions } from './components/audit/Interventions'
import { PhotoDrop } from './components/audit/PhotoDrop'
import { PlanList } from './components/planner/PlanList'
import { RiskGrid } from './components/lens/RiskGrid'
import { SectionHeading } from './components/layout/SectionHeading'
import { Skeleton } from './components/ui/Skeleton'
import { SurfaceOverlay } from './components/audit/SurfaceOverlay'
import { TrendChart } from './components/lens/TrendChart'
import { useRiskProfile } from './hooks/useRiskProfile'
import { usePlan } from './hooks/usePlan'
import { useStreetAudit } from './hooks/useStreetAudit'
import type { GeocodeResult, RiskProfile } from './lib/types'

interface PlaceCardProps {
  readonly place: GeocodeResult
  readonly profile?: RiskProfile
}

/**
 * The resolved address, and once the data lands, the headline verdict.
 *
 * Section 4 of CLAUDE.md: no bare numbers. The composite score always arrives
 * with the sentence that explains what it means and which dimension drove it.
 */
function PlaceCard({ place, profile }: PlaceCardProps) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-6">
        <div className="flex min-w-0 flex-col items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-quiet">
            <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-zinc-100">{place.shortName}</p>
            <p className="text-sm text-zinc-400">{place.displayName}</p>
            <p className="text-xs text-zinc-500">
              {place.coordinates.latitude.toFixed(4)},{' '}
              {place.coordinates.longitude.toFixed(4)}
            </p>
          </div>
        </div>

        {profile ? (
          <div className="shrink-0 space-y-2">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Overall risk
            </p>
            <Badge score={profile.composite} />
            <p className="mx-auto max-w-xs text-sm text-zinc-400">
              Scored {profile.composite} of 100 across four dimensions, weighted
              equally. The biggest driver here is{' '}
              {DIMENSION_META[profile.dominant].label.toLowerCase()}.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export default function App() {
  const lens = useRiskProfile()
  const planner = usePlan()
  const audit = useStreetAudit()

  const lensState = lens.state
  const busy = lensState.status === 'locating' || lensState.status === 'loading'
  const lensError = lensState.status === 'error' ? lensState.error : undefined
  const profile = lensState.status === 'ready' ? lensState.profile : undefined

  const place =
    lensState.status === 'loading'
      ? lensState.place
      : lensState.status === 'ready'
        ? lensState.profile.place
        : undefined

  return (
    <AppShell>
      {/* Hero */}
      <section className="space-y-4 pt-4 md:pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">
          Climate adaptation that starts at your front door
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-accent-text">
          Climate reports tell you the planet is in trouble. Verge tells you what to do
          about your house.
        </p>
      </section>

      {/* Feature 1 — Risk Lens */}
      <section className="space-y-8 pt-4">
        <SectionHeading
          eyebrow="Step one"
          title="Risk Lens"
          description="Four dimensions, scored 0 to 100 for your coordinate: heat, flood, air, and drought and fire weather."
        />

        <Card>
          <AddressSearch
            onSearch={(query) => {
              // A plan is about one risk profile. A new address invalidates it.
              planner.reset()
              void lens.load(query)
            }}
            loading={busy}
            {...(lensError ? { error: lensError.message } : {})}
          />
        </Card>

        {place ? <PlaceCard place={place} {...(profile ? { profile } : {})} /> : null}

        <RiskGrid
          loading={busy}
          {...(profile ? { scores: profile.scores, dominant: profile.dominant } : {})}
          {...(lensError ? { error: lensError } : {})}
          onRetry={() => void lens.retry()}
        />

        {/*
          The chart always shows heat, even when another dimension dominates.
          Heat is the only one of the four with a real observed-versus-projected
          series behind it — there is no keyless 2050 projection for air quality
          or local flooding, and drawing one would be a fabricated trend.
        */}
        {lensError ? null : (
          <TrendChart
            loading={busy}
            {...(profile ? { projection: profile.projection } : {})}
            {...(profile ? { band: profile.scores.heat.band } : {})}
          />
        )}
      </section>

      {/* Feature 2 — Adaptation Planner */}
      <section className="space-y-8 pt-4">
        <SectionHeading
          eyebrow="Step two"
          title="Adaptation Planner"
        />

        <DwellingForm
          disabled={!profile}
          loading={planner.state.status === 'loading'}
          onSubmit={(dwelling) => {
            if (profile) void planner.build(profile, dwelling)
          }}
        />

        <PlanList
          loading={planner.state.status === 'loading'}
          {...(planner.state.status === 'ready' ? { plan: planner.state.plan } : {})}
          {...(planner.state.status === 'error' ? { error: planner.state.error } : {})}
          onRetry={() => void planner.retry()}
        />
      </section>

      {/* Feature 3 — Street Audit */}
      <section className="space-y-8 pt-4">
        <SectionHeading
          eyebrow="Step three"
          title="Street Audit"
        />

        {/*
          The drop zone stays mounted on error, not just when idle. It used to
          render only in the idle state, so a photo the server rejected left the
          user on an error card with no way back — ErrorState only offers its
          button for retryable failures, and "that file is unreadable" is not
          one. The only recovery was reloading the page.

          Re-dropping is also the correct recovery for the retryable failures:
          the file is not retained in state, so even a network error needs the
          photo choosing again. One affordance covers every case.
        */}
        {audit.state.status === 'error' ? (
          <ErrorState error={audit.state.error} title="Could not audit that photo" />
        ) : null}

        {audit.state.status === 'idle' || audit.state.status === 'error' ? (
          <PhotoDrop onSelect={(file, previewUrl) => void audit.analyse(file, previewUrl)} />
        ) : null}

        {audit.state.status === 'analysing' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}

        {audit.state.status === 'ready' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SurfaceOverlay
                previewUrl={audit.state.previewUrl}
                surfaces={audit.state.audit.surfaces}
              />
              <div className="space-y-4">
                <CoolingScore audit={audit.state.audit} />
                <Interventions interventions={audit.state.audit.interventions} />
              </div>
            </div>

            {/* Same dead end existed after a success: no way to audit a
                second photo without reloading. */}
            <Button variant="ghost" size="sm" onClick={audit.reset}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Audit another photo
            </Button>
          </div>
        ) : null}
      </section>
    </AppShell>
  )
}
