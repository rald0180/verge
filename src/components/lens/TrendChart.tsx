import { LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'

import { BAND_STYLES } from '../../lib/format'
import { Card } from '../ui/Card'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import type { ApiError, ClimateProjection, RiskBand } from '../../lib/types'

interface TrendChartProps {
  readonly projection?: ClimateProjection
  /** Colours the projected series from the risk scale. */
  readonly band?: RiskBand
  readonly loading?: boolean
  readonly error?: ApiError
  readonly onRetry?: () => void
}

interface TrendRow {
  readonly year: number
  readonly observed: number | null
  readonly projected: number | null
}

const OBSERVED_COLOUR = '#A1A1AA' // zinc-400. The historical series is deliberately neutral.

/**
 * Observed history against the modelled future, for the dominant risk.
 *
 * The two series are drawn separately and styled differently on purpose. A
 * single continuous line would imply the projection is a measurement, and
 * CLAUDE.md section 7 does not allow that ambiguity.
 */
function toRows(projection: ClimateProjection): readonly TrendRow[] {
  const byYear = new Map<number, { observed: number | null; projected: number | null }>()

  for (const point of projection.observed) {
    byYear.set(point.year, { observed: point.value, projected: null })
  }
  for (const point of projection.projected) {
    const existing = byYear.get(point.year)
    byYear.set(point.year, {
      observed: existing?.observed ?? null,
      projected: point.value,
    })
  }

  return [...byYear.entries()]
    .map(([year, values]) => ({ year, ...values }))
    .sort((a, b) => a.year - b.year)
}

export function TrendChart({
  projection,
  band = 'elevated',
  loading = false,
  error,
  onRetry,
}: TrendChartProps) {
  if (error) {
    return (
      <ErrorState
        error={error}
        {...(onRetry ? { onRetry } : {})}
        title="Could not load the trend"
      />
    )
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    )
  }

  if (!projection) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-quiet">
            <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
          <p className="max-w-md text-sm text-zinc-400">
            Once an address resolves, this chart shows what has already been measured
            here against what the models expect by 2050.
          </p>
        </div>
      </Card>
    )
  }

  const rows = toRows(projection)
  const projectedColour = BAND_STYLES[band].hex

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {projection.label}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Historical reanalysis in grey, modelled projection in colour. {projection.scenario}
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...rows]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#71717A', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#71717A', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: '#0A0F0D',
                  border: '1px solid rgb(255 255 255 / 0.1)',
                  borderRadius: '1rem',
                  color: '#F4F4F5',
                  fontSize: 12,
                }}
                formatter={(value: number | string) => `${value} ${projection.unit}`}
              />
              <Line
                type="monotone"
                dataKey="observed"
                name="Recorded"
                stroke={OBSERVED_COLOUR}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke={projectedColour}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
