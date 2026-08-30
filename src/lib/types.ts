/**
 * The single source of truth for every shape in Verge.
 *
 * CLAUDE.md section 3, hard rule 1: every API response gets a named type, and
 * there is no `any` anywhere in this project. If a new shape shows up in a
 * component or a fetch wrapper, it gets added here first.
 */

/* -------------------------------------------------------------------------- */
/* Result envelope                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every fallible boundary in the app — geocoding, climate fetches, both
 * serverless functions — returns this instead of throwing. React never sees a
 * raw exception, so every consumer is forced to render an error state.
 */
export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiError }

/** Machine-readable failure reasons. The UI branches on these, not on strings. */
export type ApiErrorKind =
  | 'invalid-input' // caller sent something we refuse to process
  | 'not-found' // the address matched nothing
  | 'rate-limited' // HTTP 429, back off and offer retry
  | 'network' // fetch rejected, DNS, offline
  | 'upstream' // provider returned a non-2xx we cannot interpret
  | 'bad-response' // 2xx but the payload was not the shape we expect
  | 'too-large' // the uploaded photo exceeds our limit
  | 'not-implemented' // a route that exists but is not wired up in this phase

export interface ApiError {
  readonly kind: ApiErrorKind
  /** Plain-language, safe to render directly to a user. No stack traces. */
  readonly message: string
  /** Whether a retry button is worth showing. */
  readonly retryable: boolean
  /** Upstream HTTP status where we have one. */
  readonly status?: number
}

export const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data })

/** Build a bare ApiError, for the places that hold one in state. */
export const apiError = (
  kind: ApiErrorKind,
  message: string,
  options: { retryable?: boolean; status?: number } = {},
): ApiError => ({
  kind,
  message,
  retryable: options.retryable ?? false,
  ...(options.status === undefined ? {} : { status: options.status }),
})

export const fail = <T>(
  kind: ApiErrorKind,
  message: string,
  options: { retryable?: boolean; status?: number } = {},
): ApiResult<T> => ({ ok: false, error: apiError(kind, message, options) })

/* -------------------------------------------------------------------------- */
/* Place                                                                      */
/* -------------------------------------------------------------------------- */

export interface Coordinates {
  readonly latitude: number
  readonly longitude: number
}

/** A resolved address. Comes from Nominatim, normalised into our own shape. */
export interface GeocodeResult {
  readonly coordinates: Coordinates
  /** Full display string, e.g. "12 Rokeby Rd, Subiaco WA 6008, Australia". */
  readonly displayName: string
  /** Short label for headings, e.g. "Subiaco WA". */
  readonly shortName: string
  /** Nominatim's own id, used as a stable React key. */
  readonly osmId: string
  readonly country: string | null
}

/* -------------------------------------------------------------------------- */
/* Risk                                                                       */
/* -------------------------------------------------------------------------- */

/** The four dimensions of the Risk Lens. Locked. There is no fifth. */
export type RiskDimension = 'heat' | 'flood' | 'air' | 'dryfire'

/** The risk scale from CLAUDE.md section 4. Bands are inclusive of both ends. */
export type RiskBand = 'low' | 'moderate' | 'elevated' | 'high' | 'severe'

/**
 * How much weight a number deserves. Rendered next to every score, because
 * CLAUDE.md section 7 forbids presenting an indicative figure as an
 * authoritative one.
 */
export type Confidence =
  | 'observed' // measured data from a station or reanalysis grid
  | 'modelled' // downscaled CMIP6 projection
  | 'indicative' // our own composite proxy, explicitly not authoritative

/** One supporting number behind a score. Every dial can show its working. */
export interface Evidence {
  readonly label: string
  readonly value: number
  readonly unit: string
  /** Where the number came from, e.g. "Open-Meteo ERA5 archive, 1991-2020". */
  readonly source: string
}

export interface RiskScore {
  readonly dimension: RiskDimension
  /** 0-100, always an integer. */
  readonly value: number
  readonly band: RiskBand
  readonly confidence: Confidence
  /** One plain-language sentence. Never a bare number. */
  readonly headline: string
  /** The supporting numbers, for the "how we got this" disclosure. */
  readonly evidence: readonly Evidence[]
}

/** A single point on the observed-versus-projected chart. */
export interface ProjectionPoint {
  readonly year: number
  readonly value: number
}

/**
 * The hero chart's data. Observed history and modelled future for one
 * dimension, kept as separate series so the chart can style them differently
 * and never imply the projection is a measurement.
 */
export interface ClimateProjection {
  readonly dimension: RiskDimension
  /** e.g. "Days above 35 °C per year". */
  readonly label: string
  readonly unit: string
  readonly observed: readonly ProjectionPoint[]
  readonly projected: readonly ProjectionPoint[]
  /** e.g. "CMIP6 multi-model mean, SSP2-4.5". Shown verbatim in the UI. */
  readonly scenario: string
  /**
   * The two numbers the chart exists to communicate, pre-computed over their
   * named windows so the chart never has to re-derive them and risk using a
   * different window than the heat dial did.
   */
  readonly baselineMean: number
  readonly projectedMean: number
  /** e.g. "1991–2020 average". */
  readonly baselineWindowLabel: string
  /** e.g. "2041–2050 average". */
  readonly projectedWindowLabel: string
}

export interface RiskProfile {
  readonly place: GeocodeResult
  /** ISO timestamp, set by the caller — never read from inside scoring.ts. */
  readonly generatedAt: string
  readonly scores: Readonly<Record<RiskDimension, RiskScore>>
  /** Weighted composite, 0-100. */
  readonly composite: number
  readonly compositeBand: RiskBand
  /** The dimension driving the composite. Feeds the hero chart and the plan. */
  readonly dominant: RiskDimension
  readonly projection: ClimateProjection
}

/* -------------------------------------------------------------------------- */
/* Adaptation planner                                                         */
/* -------------------------------------------------------------------------- */

export type DwellingType = 'house' | 'apartment' | 'sharehouse'
export type Tenure = 'own' | 'rent'
/**
 * Budget bands in USD. Kept coarse on purpose: three inputs, nothing more.
 *
 * Pitched at US costs rather than converted from the old AUD ladder at an
 * exchange rate — a rate conversion would have produced $65 / $325 / $1,300,
 * which is neither memorable nor how anyone thinks about a home budget. These
 * are the tiers a US household actually shops in: supplies, a weekend project,
 * a significant purchase, and work that needs a contractor.
 */
export type BudgetBand = 'under-100' | '100-500' | '500-2500' | 'over-2500'

export interface DwellingProfile {
  readonly type: DwellingType
  readonly tenure: Tenure
  readonly budget: BudgetBand
}

/** A cost range in USD. Always a range, always labelled as an estimate. */
export interface CostEstimate {
  readonly low: number
  readonly high: number
}

export interface AdaptationAction {
  readonly id: string
  readonly title: string
  /** What it does, in one sentence. */
  readonly what: string
  /** Which of the four dimensions this reduces. At least one. */
  readonly reduces: readonly RiskDimension[]
  readonly estimatedCostUsd: CostEstimate
  readonly effortHours: number
  /** 0-100. The model's own estimate of how much this moves the needle. */
  readonly impactScore: number
  /** e.g. "Pays for itself in about three summers of lower cooling bills." */
  readonly paybackNote: string
  /** True when a renter can do this without the owner's permission. */
  readonly renterSafe: boolean
}

export interface AdaptationPlan {
  readonly generatedAt: string
  readonly dwelling: DwellingProfile
  readonly placeName: string
  readonly dominantRisk: RiskDimension
  /** 5-7 actions, ranked by impact with a bounded cost penalty, before they reach React. */
  readonly actions: readonly AdaptationAction[]
  readonly summary: string
}

/** Request body for POST /api/plan. Validated on the server before use. */
export interface PlanRequest {
  readonly dwelling: DwellingProfile
  readonly placeName: string
  readonly dominantRisk: RiskDimension
  /** The four scores, flattened to keep the payload small. */
  readonly scores: Readonly<Record<RiskDimension, number>>
}

/* -------------------------------------------------------------------------- */
/* Street audit                                                               */
/* -------------------------------------------------------------------------- */

export type SurfaceKind =
  | 'dark-asphalt'
  | 'concrete'
  | 'dark-roof'
  | 'light-roof'
  | 'bare-soil'
  | 'lawn'
  | 'shrub'
  | 'tree-canopy'
  | 'water'
  | 'other'

/** One surface the vision model believes it can see in the photo. */
export interface SurfaceFinding {
  readonly kind: SurfaceKind
  readonly label: string
  /** Share of the visible frame, 0-100. An estimate, labelled as one. */
  readonly coveragePct: number
  /** Whether this surface absorbs or reflects heat. Drives the overlay colour. */
  readonly thermalRole: 'absorbs' | 'reflects' | 'cools'
}

/**
 * A suggested change with its expected local cooling effect.
 *
 * CLAUDE.md section 7: the range comes from published urban heat island
 * literature cited in README.md, not from the model. `sourceNote` carries the
 * citation into the UI so the number is never presented bare.
 */
export interface Intervention {
  readonly title: string
  readonly description: string
  /** The published range in °C. Never produced by the model — see api/audit.ts. */
  readonly coolingEffectC: { readonly low: number; readonly high: number }
  /**
   * WHAT the range measures. Structural rather than prose because the
   * distinction is the whole honesty argument: a cool roof drops roof *surface*
   * temperature by ~30 °C, indoor peak temperature by 1-3 °C, and neighbourhood
   * *air* temperature by almost nothing. Quoting the biggest of those three
   * without saying which one it is would be the single most misleading number
   * this project could print.
   */
  readonly measures: 'air temperature' | 'surface temperature' | 'indoor peak temperature'
  /** The study scale the figure came from, e.g. "neighbourhood scale". */
  readonly scaleNote: string
  /**
   * Full citation for the range.
   *
   * Not rendered — it was three sentences per card and buried the figure it
   * supported. It stays on the payload as the in-code provenance for each
   * number; the reader-facing citations live in README.md, per CLAUDE.md
   * section 7.
   */
  readonly sourceNote: string
}

export interface CoolingAudit {
  readonly generatedAt: string
  /** 0-100. Higher is cooler, so this one is inverted against the risk scale. */
  readonly coolingScore: number
  /**
   * The heat-risk band implied by the score, i.e. `bandFor(100 - coolingScore)`.
   * Stored rather than derived at render time so nothing can accidentally paint
   * a well-shaded street red. A cooling score of 90 is a `low` band.
   */
  readonly band: RiskBand
  readonly canopyCoverPct: number
  readonly imperviousPct: number
  readonly surfaces: readonly SurfaceFinding[]
  /** Exactly three, per the spec. */
  readonly interventions: readonly Intervention[]
  /** The uncertainty statement rendered under the score. Never optional. */
  readonly caveat: string
}

/** Request body for POST /api/audit. */
export interface AuditRequest {
  /** Base64 image payload without the data-URL prefix. */
  readonly imageBase64: string
  readonly mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

/* -------------------------------------------------------------------------- */
/* Open-Meteo and Nominatim wire formats                                      */
/* -------------------------------------------------------------------------- */

/** One entry from nominatim.openstreetmap.org/search?format=jsonv2. */
export interface NominatimPlace {
  readonly place_id: number
  readonly lat: string
  readonly lon: string
  readonly display_name: string
  readonly name?: string
  readonly address?: Readonly<Record<string, string>>
}

/** api.open-meteo.com/v1/elevation */
export interface ElevationResponse {
  readonly elevation: readonly number[]
}

/** air-quality-api.open-meteo.com/v1/air-quality, current block. */
export interface AirQualityResponse {
  readonly current: {
    readonly time: string
    readonly pm2_5: number | null
    readonly pm10: number | null
    readonly ozone: number | null
    readonly european_aqi: number | null
    /**
     * The same air on the US scale.
     *
     * Fetched purely so the disclosure can show both. The two indices disagree
     * sharply — CAMS output for Sydney on 30 Aug 2026 was European AQI 62 and
     * US AQI 86 from one set of concentrations — and someone comparing our
     * number against a US-scale app has no way to know that without seeing them
     * side by side.
     */
    readonly us_aqi: number | null
  }
}

/** archive-api.open-meteo.com/v1/archive, daily block. */
export interface ArchiveDailyResponse {
  readonly daily: {
    readonly time: readonly string[]
    readonly temperature_2m_max: readonly (number | null)[]
    readonly precipitation_sum: readonly (number | null)[]
  }
}

/** climate-api.open-meteo.com/v1/climate, daily block. */
export interface ClimateDailyResponse {
  readonly daily: {
    readonly time: readonly string[]
    readonly temperature_2m_max: readonly (number | null)[]
  }
}

/** api.open-meteo.com/v1/forecast, current block used by the fire proxy. */
export interface ForecastCurrentResponse {
  readonly current: {
    readonly time: string
    readonly temperature_2m: number | null
    readonly relative_humidity_2m: number | null
    readonly wind_speed_10m: number | null
  }
}
