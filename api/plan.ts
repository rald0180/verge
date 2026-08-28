import type { VercelRequest, VercelResponse } from '@vercel/node'

import { fail } from '../src/lib/types.js'
import type {
  AdaptationPlan,
  ApiResult,
  BudgetBand,
  DwellingType,
  PlanRequest,
  RiskDimension,
  Tenure,
} from '../src/lib/types.js'

/**
 * POST /api/plan — risk profile in, ranked adaptation plan out.
 *
 * The Anthropic key is read here and only here. It never reaches the client
 * bundle (CLAUDE.md section 3, hard rule 6).
 *
 * Phase 1 ships the contract: the route exists, validates its input properly,
 * and answers with a typed ApiResult either way. The model call lands in Phase
 * 3. Until it does, this returns `not-implemented` rather than a fabricated
 * plan — a demo that invents costed advice is exactly what section 5 forbids.
 */

const DWELLING_TYPES: readonly string[] = ['house', 'apartment', 'sharehouse']
const TENURES: readonly string[] = ['own', 'rent']
const BUDGETS: readonly string[] = ['under-100', '100-500', '500-2000', 'over-2000']
const DIMENSIONS: readonly RiskDimension[] = ['heat', 'flood', 'air', 'dryfire']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validate the body before anything expensive happens. */
function parsePlanRequest(body: unknown): PlanRequest | null {
  if (!isObject(body)) return null

  const { dwelling, placeName, dominantRisk, scores } = body
  if (!isObject(dwelling) || !isObject(scores)) return null
  if (typeof placeName !== 'string' || placeName.trim().length === 0) return null
  if (typeof dominantRisk !== 'string') return null
  if (!DIMENSIONS.includes(dominantRisk as RiskDimension)) return null

  const { type, tenure, budget } = dwelling
  if (typeof type !== 'string' || !DWELLING_TYPES.includes(type)) return null
  if (typeof tenure !== 'string' || !TENURES.includes(tenure)) return null
  if (typeof budget !== 'string' || !BUDGETS.includes(budget)) return null

  const validated: Record<RiskDimension, number> = {
    heat: 0,
    flood: 0,
    air: 0,
    dryfire: 0,
  }
  for (const dimension of DIMENSIONS) {
    const value = scores[dimension]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    validated[dimension] = Math.min(100, Math.max(0, value))
  }

  return {
    dwelling: {
      type: type as DwellingType,
      tenure: tenure as Tenure,
      budget: budget as BudgetBand,
    },
    placeName: placeName.trim().slice(0, 200),
    dominantRisk: dominantRisk as RiskDimension,
    scores: validated,
  }
}

export default function handler(request: VercelRequest, response: VercelResponse): void {
  if (request.method !== 'POST') {
    const body: ApiResult<AdaptationPlan> = fail('invalid-input', 'Use POST.')
    response.status(405).json(body)
    return
  }

  const parsed = parsePlanRequest(request.body)
  if (!parsed) {
    const body: ApiResult<AdaptationPlan> = fail(
      'invalid-input',
      'The plan request was missing a dwelling, a place name, or the four risk scores.',
    )
    response.status(400).json(body)
    return
  }

  // TODO (Phase 3): call Claude with a strict JSON tool definition, parse the
  // response inside a try/catch, validate every field of every action against
  // AdaptationAction before it goes back over the wire, and sort by impact per
  // dollar. Renters get renter-safe actions only — filter on
  // parsed.dwelling.tenure, do not merely ask the model nicely.
  const body: ApiResult<AdaptationPlan> = fail(
    'not-implemented',
    'The adaptation planner is not wired up yet. It arrives in Phase 3.',
  )
  response.status(501).json(body)
}
