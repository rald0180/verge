import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { bandFor } from '../src/lib/scoring.js'
import { fail, ok } from '../src/lib/types.js'
import type {
  ApiResult,
  AuditRequest,
  CoolingAudit,
  Intervention,
  SurfaceFinding,
  SurfaceKind,
} from '../src/lib/types.js'

/**
 * POST /api/audit — street photo in, cooling score out.
 *
 * THE CENTRAL DESIGN DECISION, which CLAUDE.md section 7 requires:
 *
 *   "Cooling effect estimates are ranges from published urban heat island
 *    literature, cited in README.md, applied to an AI estimate of surface
 *    composition."
 *
 * So the model estimates surface composition and chooses WHICH interventions
 * apply. It never supplies a temperature. This is not enforced by asking it
 * politely — the response schema has no field for a temperature at all. The
 * model returns an id from a fixed enum, and the server attaches the published
 * range from COOLING_LIBRARY below. A number the model cannot express is a
 * number it cannot invent.
 *
 * Every figure in that library carries what it measures and at what scale,
 * because those differ wildly and quoting the largest without saying which one
 * it is would be the most misleading thing this project could print. A cool
 * roof lowers roof SURFACE temperature by about 30 °C, indoor peak temperature
 * by 1-3 °C, and neighbourhood AIR temperature by roughly nothing.
 */

export const maxDuration = 60

const MODEL = 'claude-opus-5'

/** Perception and estimation rather than deep reasoning; low is enough. */
const EFFORT = 'low' as const
const MAX_TOKENS = 8_000

/**
 * 5.5 MB of base64, roughly a 4 MB image. The client refuses anything over
 * 4 MB before encoding; this is the backstop for a caller that did not.
 */
const MAX_BASE64_BYTES = 5_500_000
const MEDIA_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

const SURFACE_KINDS: readonly SurfaceKind[] = [
  'dark-asphalt',
  'concrete',
  'dark-roof',
  'light-roof',
  'bare-soil',
  'lawn',
  'shrub',
  'tree-canopy',
  'water',
  'other',
]

const THERMAL_ROLES: readonly SurfaceFinding['thermalRole'][] = [
  'absorbs',
  'reflects',
  'cools',
]

/* -------------------------------------------------------------------------- */
/* The cited literature                                                       */
/* -------------------------------------------------------------------------- */

interface CoolingEntry {
  readonly title: string
  readonly description: string
  readonly coolingEffectC: { readonly low: number; readonly high: number }
  readonly measures: Intervention['measures']
  readonly scaleNote: string
  readonly sourceNote: string
}

/**
 * Published urban heat island cooling ranges. These are the ONLY temperatures
 * this feature will ever print. Each one is traceable to the citation beside
 * it, and the same citations are listed in README.md.
 *
 * Ranges are deliberately conservative: where sources disagree, the low end
 * comes from the more pessimistic study rather than the headline figure.
 */
const COOLING_LIBRARY: Readonly<Record<string, CoolingEntry>> = {
  'plant-shade-trees': {
    title: 'Plant shade trees on the sun-facing side',
    description:
      'Increase canopy over the hottest surfaces, prioritising afternoon shade on walls and windows.',
    coolingEffectC: { low: 0.3, high: 1.5 },
    measures: 'air temperature',
    scaleNote: 'neighbourhood scale, for a 10-30% increase in canopy cover',
    sourceNote:
      'Global meta-analysis: ~0.3 °C per 10% canopy increase. “Increasing tree canopy lowers urban air temperature by up to 1.5 °C in heat-prone areas”, npj Urban Sustainability (2025): 0.8 °C for a 10% increase, 1.5 °C for 30%.',
  },
  'lighten-roof': {
    title: 'Repaint or re-coat the roof in a light colour',
    description:
      'A high-albedo roof reflects sunlight instead of storing it and re-radiating it into the rooms below.',
    coolingEffectC: { low: 1.2, high: 3.3 },
    measures: 'indoor peak temperature',
    scaleNote: 'one building, non-air-conditioned residential',
    sourceNote:
      'US EPA, Using Cool Roofs to Reduce Heat Islands: maximum indoor temperature lowered 1.2-3.3 °C in non-air-conditioned homes. The neighbourhood air-temperature effect of one roof is far smaller, around 0.3 °C even at full coverage.',
  },
  'green-roof': {
    title: 'Put planting on the roof or a hard upper surface',
    description:
      'Growing medium and plants shade the membrane and cool it by evapotranspiration.',
    coolingEffectC: { low: 0.6, high: 3.0 },
    measures: 'surface temperature',
    scaleNote: 'roof surface; near-surface air fell only ~0.6 °C at full coverage',
    sourceNote:
      '“Green and cool roofs to mitigate urban heat island effects in the Chicago metropolitan area”, Environmental Research Letters 11:064004 (2016): daytime roof surface temperature reduced by under 1 °C at 25% green roof coverage, up to 3 °C at 100%. Near-surface air fell only ~0.6 °C even at full coverage.',
  },
  'lighten-paving': {
    title: 'Lighten or shade the paving',
    description:
      'Replace or coat dark asphalt and concrete with a lighter-coloured, more reflective surface.',
    coolingEffectC: { low: 0.5, high: 4.0 },
    measures: 'air temperature',
    scaleNote: 'street scale; the upper end generally requires active watering',
    sourceNote:
      'Cool Pavements for the Mitigation of Urban Heat Island: A Global Perspective (IntechOpen, 2025): reported cooling of 0.5-4 °C, averaging about 1 °C and reaching 5 °C only where pavement is actively watered.',
  },
  'replace-hard-with-planting': {
    title: 'Swap hard surface for planting',
    description:
      'Convert unused paving, gravel or bare soil to lawn, groundcover or garden bed.',
    coolingEffectC: { low: 1.1, high: 1.3 },
    measures: 'air temperature',
    scaleNote: 'field measurement over grass-covered ground versus hard surface',
    sourceNote:
      'Field studies of grass coverage report mean air temperature reductions of 1.18-1.26 °C relative to comparable hard surfaces.',
  },
  'shade-the-walls': {
    title: 'Shade the walls and windows with planting or a structure',
    description:
      'Vegetation or an external screen intercepts sun before it reaches glass and masonry.',
    coolingEffectC: { low: 0.5, high: 1.9 },
    measures: 'air temperature',
    scaleNote: 'immediately adjacent to the building',
    sourceNote:
      'Greenery placed along pavements and beside buildings is reported to reduce ambient air temperature by up to 1.87 °C; the lower bound reflects studies with sparser planting.',
  },
}

const INTERVENTION_IDS = Object.keys(COOLING_LIBRARY)

/* -------------------------------------------------------------------------- */
/* Schema — note the absence of any temperature field                         */
/* -------------------------------------------------------------------------- */

const AUDIT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'sceneIsOutdoor',
    'coolingScore',
    'canopyCoverPct',
    'imperviousPct',
    'surfaces',
    'interventions',
  ],
  properties: {
    sceneIsOutdoor: {
      type: 'boolean',
      description:
        'False if this is not an outdoor scene showing ground, buildings or planting — for example an indoor room, a document, or a portrait.',
    },
    coolingScore: {
      type: 'integer',
      description:
        '0 to 100. How well this spot handles heat. Higher is cooler: heavy shade and planting score high, unbroken dark hard surface scores low.',
    },
    canopyCoverPct: {
      type: 'integer',
      description: 'Share of the visible frame under tree canopy, 0 to 100.',
    },
    imperviousPct: {
      type: 'integer',
      description:
        'Share of the visible frame that is hard sealed surface — asphalt, concrete, paving, roofing — 0 to 100.',
    },
    surfaces: {
      type: 'array',
      description: 'The distinct surfaces visible, largest first.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'label', 'coveragePct', 'thermalRole'],
        properties: {
          kind: { type: 'string', enum: SURFACE_KINDS },
          label: {
            type: 'string',
            description: 'Plain description of this surface as it appears, e.g. "Dark bitumen road".',
          },
          coveragePct: { type: 'integer' },
          thermalRole: { type: 'string', enum: THERMAL_ROLES },
        },
      },
    },
    interventions: {
      type: 'array',
      description: 'Exactly three, most useful first, chosen for what is actually visible.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'rationale'],
        properties: {
          id: { type: 'string', enum: INTERVENTION_IDS },
          rationale: {
            type: 'string',
            description:
              'One sentence on why this suits THIS photo, referring to what you can actually see.',
          },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `You assess how well an outdoor spot handles summer heat, from a single photograph.

Estimate what you can genuinely see. If the frame shows only part of a property, judge only that part. If a surface is ambiguous, choose the closest match and let the coverage percentage carry your uncertainty rather than inventing detail.

Coverage percentages are of the visible frame, not of the property.

Choose the three interventions that would most help THIS spot, given what is actually in the photograph. Do not choose an intervention for something you cannot see — do not suggest roof work if no roof is visible.

Never state a temperature, a degree figure, or a cost. You are not asked for one and there is nowhere to put it.`

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const clampPct = (value: number): number =>
  Math.round(Math.min(100, Math.max(0, value)))

function parseAuditRequest(body: unknown): AuditRequest | 'too-large' | null {
  if (!isObject(body)) return null

  const { imageBase64, mediaType } = body
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) return null
  if (typeof mediaType !== 'string' || !MEDIA_TYPES.includes(mediaType)) return null
  if (imageBase64.length > MAX_BASE64_BYTES) return 'too-large'

  return { imageBase64, mediaType: mediaType as AuditRequest['mediaType'] }
}

function toSurface(value: unknown): SurfaceFinding | null {
  if (!isObject(value)) return null
  const { kind, label, coveragePct, thermalRole } = value

  if (typeof kind !== 'string' || !SURFACE_KINDS.includes(kind as SurfaceKind)) return null
  if (typeof label !== 'string' || label.trim().length === 0) return null
  if (typeof coveragePct !== 'number' || !Number.isFinite(coveragePct)) return null
  if (
    typeof thermalRole !== 'string' ||
    !THERMAL_ROLES.includes(thermalRole as SurfaceFinding['thermalRole'])
  ) {
    return null
  }

  return {
    kind: kind as SurfaceKind,
    label: label.trim(),
    coveragePct: clampPct(coveragePct),
    thermalRole: thermalRole as SurfaceFinding['thermalRole'],
  }
}

/**
 * Turn a model-chosen id into a full Intervention by looking up the published
 * figures. The model's `rationale` is the only free text that survives, and it
 * is appended to our description rather than replacing it.
 */
function toIntervention(value: unknown): Intervention | null {
  if (!isObject(value)) return null
  const { id, rationale } = value
  if (typeof id !== 'string') return null

  const entry = COOLING_LIBRARY[id]
  if (!entry) return null

  const why = typeof rationale === 'string' && rationale.trim().length > 0
    ? ` ${rationale.trim()}`
    : ''

  return {
    title: entry.title,
    description: `${entry.description}${why}`,
    coolingEffectC: entry.coolingEffectC,
    measures: entry.measures,
    scaleNote: entry.scaleNote,
    sourceNote: entry.sourceNote,
  }
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    const body: ApiResult<CoolingAudit> = fail('invalid-input', 'Use POST.')
    response.status(405).json(body)
    return
  }

  const parsed = parseAuditRequest(request.body)

  if (parsed === 'too-large') {
    const body: ApiResult<CoolingAudit> = fail(
      'too-large',
      'That photo is too large. Please use one under 4 MB.',
    )
    response.status(413).json(body)
    return
  }

  if (parsed === null) {
    const body: ApiResult<CoolingAudit> = fail(
      'invalid-input',
      'Send a JPEG, PNG or WebP image encoded as base64.',
    )
    response.status(400).json(body)
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const body: ApiResult<CoolingAudit> = fail(
      'upstream',
      'The street audit is not configured on this deployment yet.',
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
        format: { type: 'json_schema', schema: AUDIT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: parsed.mediaType,
                data: parsed.imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Assess how well this spot handles summer heat.',
            },
          ],
        },
      ],
    })

    console.log('[api/audit] usage', {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      stop: message.stop_reason,
    })

    if (message.stop_reason === 'refusal') {
      const body: ApiResult<CoolingAudit> = fail(
        'upstream',
        'That photo could not be analysed. Try a different one.',
      )
      response.status(502).json(body)
      return
    }

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    if (!textBlock) {
      const body: ApiResult<CoolingAudit> = fail(
        'bad-response',
        'The street audit returned no result.',
      )
      response.status(502).json(body)
      return
    }
    text = textBlock.text
  } catch (error) {
    console.error('[api/audit] Anthropic request failed', {
      name: error instanceof Error ? error.name : typeof error,
      status: error instanceof Anthropic.APIError ? error.status : undefined,
      message: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof Anthropic.RateLimitError) {
      const body: ApiResult<CoolingAudit> = fail(
        'rate-limited',
        'The street audit is busy right now. Wait a moment, then try again.',
        { retryable: true, status: 429 },
      )
      response.status(429).json(body)
      return
    }
    if (error instanceof Anthropic.AuthenticationError) {
      const body: ApiResult<CoolingAudit> = fail(
        'upstream',
        'The street audit is not configured correctly on this deployment.',
      )
      response.status(503).json(body)
      return
    }
    if (error instanceof Anthropic.APIConnectionError) {
      const body: ApiResult<CoolingAudit> = fail(
        'network',
        'Could not reach the street audit. Try again shortly.',
        { retryable: true },
      )
      response.status(502).json(body)
      return
    }
    if (error instanceof Anthropic.APIError) {
      const retryable = typeof error.status === 'number' && error.status >= 500
      const body: ApiResult<CoolingAudit> = fail(
        'upstream',
        retryable
          ? 'The street audit is having trouble right now. Try again shortly.'
          : 'The street audit could not process that photo.',
        { retryable },
      )
      response.status(502).json(body)
      return
    }
    const body: ApiResult<CoolingAudit> = fail(
      'upstream',
      'Something went wrong analysing that photo.',
      { retryable: true },
    )
    response.status(502).json(body)
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    const body: ApiResult<CoolingAudit> = fail(
      'bad-response',
      'The street audit returned something unreadable.',
    )
    response.status(502).json(body)
    return
  }

  if (!isObject(payload)) {
    const body: ApiResult<CoolingAudit> = fail(
      'bad-response',
      'The street audit returned an unexpected shape.',
    )
    response.status(502).json(body)
    return
  }

  // A photo of a kitchen has no cooling score, and guessing one would be worse
  // than saying so.
  if (payload.sceneIsOutdoor === false) {
    const body: ApiResult<CoolingAudit> = fail(
      'invalid-input',
      'That does not look like an outdoor scene. Try a photo of your street, yard or balcony.',
    )
    response.status(422).json(body)
    return
  }

  const { coolingScore, canopyCoverPct, imperviousPct } = payload
  if (
    typeof coolingScore !== 'number' ||
    typeof canopyCoverPct !== 'number' ||
    typeof imperviousPct !== 'number'
  ) {
    const body: ApiResult<CoolingAudit> = fail(
      'bad-response',
      'The street audit returned an unexpected shape.',
    )
    response.status(502).json(body)
    return
  }

  const surfaces = Array.isArray(payload.surfaces)
    ? payload.surfaces
        .map(toSurface)
        .filter((surface): surface is SurfaceFinding => surface !== null)
    : []

  const interventions = Array.isArray(payload.interventions)
    ? payload.interventions
        .map(toIntervention)
        .filter((item): item is Intervention => item !== null)
        .slice(0, 3)
    : []

  if (surfaces.length === 0 || interventions.length === 0) {
    const body: ApiResult<CoolingAudit> = fail(
      'bad-response',
      'The street audit could not read enough from that photo.',
      { retryable: true },
    )
    response.status(502).json(body)
    return
  }

  const score = clampPct(coolingScore)

  const audit: CoolingAudit = {
    generatedAt: new Date().toISOString(),
    coolingScore: score,
    // Inverted: a high cooling score is a LOW heat risk. See types.ts.
    band: bandFor(100 - score),
    canopyCoverPct: clampPct(canopyCoverPct),
    imperviousPct: clampPct(imperviousPct),
    surfaces,
    interventions,
    caveat:
      'Surface percentages are a vision model’s estimate from one photograph, not a survey. The cooling figures are published ranges for each type of intervention, measured in other places under other conditions — they are not a prediction for this address.',
  }

  const body: ApiResult<CoolingAudit> = ok(audit)
  response.status(200).json(body)
}
