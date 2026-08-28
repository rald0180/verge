import { MapPin } from 'lucide-react'

import { Card } from '../ui/Card'
import { ErrorState } from '../ui/ErrorState'
import { RiskDial } from './RiskDial'
import { Skeleton } from '../ui/Skeleton'
import { Verdict } from './Verdict'
import type { ApiError, RiskDimension, RiskScore } from '../../lib/types'

const ORDER: readonly RiskDimension[] = ['heat', 'flood', 'air', 'dryfire']

interface RiskGridProps {
  readonly scores?: Readonly<Record<RiskDimension, RiskScore>>
  readonly loading?: boolean
  readonly error?: ApiError
  readonly onRetry?: () => void
}

/**
 * The four dials.
 *
 * All three non-happy states are built here alongside the happy path, per
 * CLAUDE.md section 3, hard rule 3: skeleton while loading, ErrorState on
 * failure with a retry, and an empty state before an address is entered.
 */
export function RiskGrid({ scores, loading = false, error, onRetry }: RiskGridProps) {
  if (error) {
    return (
      <ErrorState
        error={error}
        {...(onRetry ? { onRetry } : {})}
        title="Could not build a risk profile"
      />
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ORDER.map((dimension) => (
          <Card key={dimension}>
            <div className="flex flex-col items-center gap-4">
              <Skeleton shape="circle" className="h-28 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!scores) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-quiet">
            <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium text-zinc-100">
              Nothing to show until you name a street
            </p>
            <p className="text-sm text-zinc-400">
              Enter an address above and Verge will pull real observations and
              downscaled projections for that exact coordinate.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ORDER.map((dimension) => (
        <Card key={dimension}>
          <div className="flex flex-col gap-6">
            <RiskDial score={scores[dimension]} />
            <Verdict score={scores[dimension]} />
          </div>
        </Card>
      ))}
    </div>
  )
}
