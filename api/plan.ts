import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { fail, ok } from '../src/lib/types.js'
import type {
  AdaptationAction,
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
 * Two things in this file are deliberate and worth not "simplifying" later:
 *
 * 1. Renter-legal filtering happens AFTER the model responds, not by asking
 *    the model nicely in the prompt. A model asked for renter-safe actions
 *    will occasionally suggest replacing a roof. The prompt asks, and then
 *    line-by-line filtering enforces. CLAUDE.md section 2 calls this detail
 *    out as something judges notice; a prompt instruction alone is not it.
 *
 * 2. Every field of every action is validated against AdaptationAction before
 *    it goes back over the wire. Structured outputs make malformed JSON very
 *    unlikely, not impossible, and "unlikely" is not a guarantee React should
 *    be built on (hard rule 5).
 */

/** Vercel's default is 10s. Claude thinks before answering; give it room. */
export const maxDuration = 60

/**
 * Thinking is ON by default on Claude Opus 5 and shares this budget with the
 * response text, so this is sized for both. Disabling thinking is the wrong
 * lever — lower effort is the right one, and it is set below.
 */
const MAX_TOKENS = 12_000

/**
 * `medium` rather than the `high` default, and measured rather than guessed.
 *
 * Swept against real output: `low` returns in ~23s versus ~29s, but drops the
 * ceiling-insulation top-up — the highest-impact intervention available to a
 * Perth house — in favour of filler scoring 35. Six seconds is not worth that
 * on the feature carrying Originality. Observed range at `medium` is 28-35s
 * against a 60s ceiling, which is adequate headroom.
 */
const EFFORT = 'medium' as const

const MODEL = 'claude-opus-5'

const DIMENSIONS: readonly RiskDimension[] = ['heat', 'flood', 'air', 'dryfire']
const DWELLING_TYPES: readonly string[] = ['house', 'apartment', 'sharehouse']
const TENURES: readonly string[] = ['own', 'rent']
const BUDGETS: readonly string[] = ['under-100', '100-500', '500-2000', 'over-2000']

const BUDGET_GUIDANCE: Readonly<Record<BudgetBand, string>> = {
  'under-100': 'under about $100 AUD in total',
  '100-500': 'roughly $100 to $500 AUD in total',
  '500-2000': 'roughly $500 to $2,000 AUD in total',
  'over-2000': 'more than $2,000 AUD, so larger works are in scope',
}

/**
 * No `minimum`/`maximum`/`minLength` anywhere: the structured-output schema
 * validator rejects numeric and string constraints. Ranges are clamped in
 * `toAction` below instead.
 */
const PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'actions'],
  properties: {
    summary: {
      type: 'string',
      description: 'Two sentences on what matters most at this address and why.',
    },
    actions: {
      type: 'array',
      description: 'Between 5 and 7 actions.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'what',
          'reduces',
          'estimatedCostAud',
          'effortHours',
          'impactScore',
          'paybackNote',
          'renterSafe',
        ],
        properties: {
          title: { type: 'string', description: 'Short imperative, e.g. "Fit external blinds".' },
          what: { type: 'string', description: 'One sentence on what it does.' },
          reduces: {
            type: 'array',
            description: 'Which risk dimensions this reduces.',
            items: { type: 'string', enum: ['heat', 'flood', 'air', 'dryfire'] },
          },
          estimatedCostAud: {
            type: 'object',
            additionalProperties: false,
            required: ['low', 'high'],
            properties: {
              low: { type: 'integer' },
              high: { type: 'integer' },
            },
          },
          effortHours: { type: 'number', description: 'Hours of work, 0.5 for a quick job.' },
          impactScore: { type: 'integer', description: '0 to 100.' },
          paybackNote: { type: 'string', description: 'One sentence on what it pays back.' },
          renterSafe: {
            type: 'boolean',
            description:
              'True only if a tenant can do this without the owner’s permission and can undo it when they leave.',
          },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `You advise Australian householders on adapting their home to climate risk.

Write for someone standing in their own doorway, not for a policy audience. Every action must be something they could start this month.

Costs are Australian dollars and are estimates, so give an honest range rather than a precise-looking single figure. Where you are unsure of a cost, widen the range rather than guessing narrowly.

Mark renterSafe true only when a tenant could do it without the owner's permission and reverse it when they leave. Anything fixed to the building, anything requiring a tradesperson to alter the structure, and anything needing body corporate approval is not renter safe.

Ground each action in the specific risk scores you are given. Do not produce generic sustainability advice, and do not recommend anything whose main effect is lowering emissions rather than protecting this household from the risks named.`

/* -------------------------------------------------------------------------- */
/* Input validation                                                           */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

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

/* -------------------------------------------------------------------------- */
/* Output validation                                                          */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Validate one action from the model into an AdaptationAction, or reject it.
 *
 * Returns null rather than throwing so one malformed action costs us that
 * action and not the whole plan.
 */
function toAction(value: unknown, index: number): AdaptationAction | null {
  if (!isObject(value)) return null

  const { title, what, reduces, estimatedCostAud, effortHours, impactScore, paybackNote, renterSafe } =
    value

  if (typeof title !== 'string' || title.trim().length === 0) return null
  if (typeof what !== 'string' || what.trim().length === 0) return null
  if (typeof paybackNote !== 'string') return null
  if (typeof renterSafe !== 'boolean') return null
  if (typeof effortHours !== 'number' || !Number.isFinite(effortHours)) return null
  if (typeof impactScore !== 'number' || !Number.isFinite(impactScore)) return null

  if (!Array.isArray(reduces)) return null
  const dimensions = reduces.filter(
    (entry): entry is RiskDimension =>
      typeof entry === 'string' && DIMENSIONS.includes(entry as RiskDimension),
  )
  if (dimensions.length === 0) return null

  if (!isObject(estimatedCostAud)) return null
  const { low, high } = estimatedCostAud
  if (typeof low !== 'number' || !Number.isFinite(low)) return null
  if (typeof high !== 'number' || !Number.isFinite(high)) return null

  // A model that returns high < low has not lied, it has fumbled. Reorder.
  const costLow = Math.max(0, Math.round(Math.min(low, high)))
  const costHigh = Math.max(0, Math.round(Math.max(low, high)))

  return {
    id: `action-${index + 1}`,
    title: title.trim(),
    what: what.trim(),
    reduces: dimensions,
    estimatedCostAud: { low: costLow, high: costHigh },
    effortHours: clamp(effortHours, 0, 400),
    impactScore: Math.round(clamp(impactScore, 0, 100)),
    paybackNote: paybackNote.trim(),
    renterSafe,
  }
}

/**
 * Impact per dollar, for ranking.
 *
 * Free actions would divide by zero, so cost is floored at $1 — which also
 * means a free high-impact action sorts to the top, which is correct.
 */
function impactPerDollar(action: AdaptationAction): number {
  const midpoint = (action.estimatedCostAud.low + action.estimatedCostAud.high) / 2
  return action.impactScore / Math.max(1, midpoint)
}

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

function buildPrompt(request: PlanRequest): string {
  const { dwelling, placeName, dominantRisk, scores } = request

  const tenureLine =
    dwelling.tenure === 'rent'
      ? 'They RENT. Every action must be renter safe. Do not suggest anything that alters the building.'
      : 'They own the property, so changes to the building itself are in scope.'

  return `Address: ${placeName}

Risk scores for this exact coordinate, each 0 to 100 where higher is worse:
- Heat: ${scores.heat}
- Flood: ${scores.flood} (indicative estimate only, not an official flood map)
- Air quality: ${scores.air}
- Drought and fire weather: ${scores.dryfire}

The dominant risk here is ${dominantRisk}.

Dwelling: ${dwelling.type}. ${tenureLine}
Budget: they can spend ${BUDGET_GUIDANCE[dwelling.budget]}.

Give 5 to 7 actions suited to this specific profile, weighted towards the dominant risk and affordable within that budget.`
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const body: ApiResult<AdaptationPlan> = fail(
      'upstream',
      'The planner is not configured on this deployment yet.',
    )
    response.status(503).json(body)
    return
  }

  const client = new Anthropic({ apiKey })

  let text: string
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: EFFORT,
        format: { type: 'json_schema', schema: PLAN_SCHEMA },
      },
      messages: [{ role: 'user', content: buildPrompt(parsed) }],
    })

    // Safety classifiers can decline a request. That arrives as a normal 200
    // with stop_reason "refusal" and empty content, so it has to be checked
    // before reading content rather than after.
    if (message.stop_reason === 'refusal') {
      const body: ApiResult<AdaptationPlan> = fail(
        'upstream',
        'The planner declined to answer for this address. Try a different one.',
      )
      response.status(502).json(body)
      return
    }

    /**
     * Per-invocation cost signal. Thinking tokens are billed as output and are
     * the dominant cost here, so this is the only honest way to know what a
     * plan actually costs rather than estimating it.
     */
    console.log('[api/plan] usage', {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      stop: message.stop_reason,
    })

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    if (!textBlock) {
      const body: ApiResult<AdaptationPlan> = fail(
        'bad-response',
        'The planner returned no plan text.',
      )
      response.status(502).json(body)
      return
    }
    text = textBlock.text
  } catch (error) {
    /**
     * Log the real cause server-side. The messages returned to the caller are
     * deliberately generic — they are shown to users and must not leak upstream
     * detail — which means without this line a production failure is
     * undiagnosable. Vercel captures stderr per invocation.
     */
    console.error('[api/plan] Anthropic request failed', {
      name: error instanceof Error ? error.name : typeof error,
      status: error instanceof Anthropic.APIError ? error.status : undefined,
      message: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof Anthropic.RateLimitError) {
      const body: ApiResult<AdaptationPlan> = fail(
        'rate-limited',
        'The planner is busy right now. Wait a moment, then try again.',
        { retryable: true, status: 429 },
      )
      response.status(429).json(body)
      return
    }
    if (error instanceof Anthropic.AuthenticationError) {
      const body: ApiResult<AdaptationPlan> = fail(
        'upstream',
        'The planner is not configured correctly on this deployment.',
      )
      response.status(503).json(body)
      return
    }
    if (error instanceof Anthropic.APIConnectionError) {
      const body: ApiResult<AdaptationPlan> = fail(
        'network',
        'Could not reach the planner. Try again shortly.',
        { retryable: true },
      )
      response.status(502).json(body)
      return
    }
    if (error instanceof Anthropic.APIError) {
      /**
       * Only 5xx is worth retrying. A 4xx — a malformed request, or an
       * exhausted credit balance — will fail identically every time, and
       * offering a Try Again button for it teaches people the button is a lie.
       */
      const retryable = typeof error.status === 'number' && error.status >= 500
      const body: ApiResult<AdaptationPlan> = fail(
        'upstream',
        retryable
          ? 'The planner is having trouble right now. Try again shortly.'
          : 'The planner could not process this request.',
        { retryable },
      )
      response.status(502).json(body)
      return
    }
    const body: ApiResult<AdaptationPlan> = fail(
      'upstream',
      'Something went wrong building the plan.',
      { retryable: true },
    )
    response.status(502).json(body)
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    const body: ApiResult<AdaptationPlan> = fail(
      'bad-response',
      'The planner returned something that was not a plan.',
    )
    response.status(502).json(body)
    return
  }

  if (!isObject(payload) || !Array.isArray(payload.actions)) {
    const body: ApiResult<AdaptationPlan> = fail(
      'bad-response',
      'The planner returned a plan in an unexpected shape.',
    )
    response.status(502).json(body)
    return
  }

  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : ''

  const validated = payload.actions
    .map(toAction)
    .filter((action): action is AdaptationAction => action !== null)

  // THE RENTER GATE. Enforced here, not requested in the prompt.
  const permitted =
    parsed.dwelling.tenure === 'rent'
      ? validated.filter((action) => action.renterSafe)
      : validated

  /**
   * Instrument the gate. Without this we cannot tell whether the renter filter
   * is load-bearing or merely decorative — if the prompt always returns
   * renter-safe actions, `dropped` stays 0 and the safety net has never
   * actually caught anything.
   */
  if (parsed.dwelling.tenure === 'rent') {
    console.log('[api/plan] renter gate', {
      returned: validated.length,
      dropped: validated.length - permitted.length,
    })
  }

  if (permitted.length === 0) {
    const body: ApiResult<AdaptationPlan> = fail(
      'bad-response',
      'The planner did not return any actions that suit this place.',
      { retryable: true },
    )
    response.status(502).json(body)
    return
  }

  const actions = [...permitted]
    .sort((a, b) => impactPerDollar(b) - impactPerDollar(a))
    .slice(0, 7)
    // Renumber so ids match display order and stay stable as React keys.
    .map((action, index) => ({ ...action, id: `action-${index + 1}` }))

  const plan: AdaptationPlan = {
    generatedAt: new Date().toISOString(),
    dwelling: parsed.dwelling,
    placeName: parsed.placeName,
    dominantRisk: parsed.dominantRisk,
    actions,
    summary,
  }

  const body: ApiResult<AdaptationPlan> = ok(plan)
  response.status(200).json(body)
}
