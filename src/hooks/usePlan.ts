import { useCallback, useRef, useState } from 'react'

import { apiError } from '../lib/types'
import type {
  AdaptationPlan,
  ApiError,
  ApiResult,
  DwellingProfile,
  RiskProfile,
} from '../lib/types'

export type PlanState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly plan: AdaptationPlan }
  | { readonly status: 'error'; readonly error: ApiError }

export interface UsePlan {
  readonly state: PlanState
  readonly build: (profile: RiskProfile, dwelling: DwellingProfile) => Promise<void>
  readonly retry: () => Promise<void>
  readonly reset: () => void
}

/**
 * The Adaptation Planner state machine.
 *
 * Only the four scores and the place name go over the wire — not the whole
 * risk profile. The evidence arrays, the coordinates and the full street
 * address stay in the browser. The planner does not need to know exactly
 * where someone lives to tell them their roof is dark.
 */
export function usePlan(): UsePlan {
  const [state, setState] = useState<PlanState>({ status: 'idle' })
  const lastArgsRef = useRef<{ profile: RiskProfile; dwelling: DwellingProfile } | null>(null)

  const build = useCallback(async (profile: RiskProfile, dwelling: DwellingProfile) => {
    lastArgsRef.current = { profile, dwelling }
    setState({ status: 'loading' })

    const body = {
      dwelling,
      placeName: profile.place.shortName,
      dominantRisk: profile.dominant,
      scores: {
        heat: profile.scores.heat.value,
        flood: profile.scores.flood.value,
        air: profile.scores.air.value,
        dryfire: profile.scores.dryfire.value,
      },
    }

    let response: Response
    try {
      response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      setState({
        status: 'error',
        error: apiError('network', 'Could not reach the planner.', { retryable: true }),
      })
      return
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      setState({
        status: 'error',
        error: apiError('bad-response', 'The planner returned unreadable data.'),
      })
      return
    }

    if (typeof payload !== 'object' || payload === null || !('ok' in payload)) {
      setState({
        status: 'error',
        error: apiError('bad-response', 'The planner returned an unexpected shape.'),
      })
      return
    }

    const result = payload as ApiResult<AdaptationPlan>

    // The server already wrote a typed, user-safe message. Pass it through.
    if (!result.ok) {
      setState({ status: 'error', error: result.error })
      return
    }

    setState({ status: 'ready', plan: result.data })
  }, [])

  const retry = useCallback(async () => {
    const last = lastArgsRef.current
    if (last) await build(last.profile, last.dwelling)
  }, [build])

  const reset = useCallback(() => {
    lastArgsRef.current = null
    setState({ status: 'idle' })
  }, [])

  return { state, build, retry, reset }
}
