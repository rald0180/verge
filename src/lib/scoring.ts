/**
 * Risk maths for the Verge Risk Lens.
 *
 * CLAUDE.md section 3, hard rule 2: every function in this file is pure. No
 * fetch calls, no `Date.now()`, no randomness. Same inputs, same outputs,
 * forever. Timestamps are passed in by the caller.
 *
 * CLAUDE.md section 5, honesty rule: where a published index or guideline
 * exists, we use it and name it. Where one does not, the ramp is our own,
 * it is documented here in full, and the UI labels the result `indicative`.
 * Nothing in this file is a number we made up and then dressed as science.
 *
 * Published sources used below:
 *   - European Air Quality Index (EEA) band structure, 0-100+. NOTE: the values
 *     it is applied to come from the CAMS atmospheric model via Open-Meteo
 *     (11 km over Europe, 45 km elsewhere), not from ground stations. It is a
 *     modelled concentration for a grid cell, and the UI says so — an earlier
 *     version labelled this dial "Measured", which was wrong.
 *   - WHO 2021 global air quality guidelines, 24-hour means:
 *     PM2.5 15 ug/m3, PM10 45 ug/m3.
 *   - Chandler Burning Index (Chandler et al., 1983), a temperature and
 *     relative-humidity fire-weather index.
 */

import type {
  Confidence,
  Evidence,
  ProjectionPoint,
  RiskBand,
  RiskDimension,
  RiskScore,
} from './types.js'

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

/** Clamp `value` into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Linear ramp: returns 0 at or below `zeroAt`, 100 at or above `hundredAt`,
 * and interpolates between. Works in both directions — pass a `zeroAt` that is
 * greater than `hundredAt` for an inverted ramp such as elevation.
 */
export function ramp(value: number, zeroAt: number, hundredAt: number): number {
  if (zeroAt === hundredAt) return value >= hundredAt ? 100 : 0
  const t = (value - zeroAt) / (hundredAt - zeroAt)
  return clamp(t * 100, 0, 100)
}

/** The risk scale from CLAUDE.md section 4. Bands are inclusive of both ends. */
export function bandFor(value: number): RiskBand {
  const v = clamp(value, 0, 100)
  if (v <= 20) return 'low'
  if (v <= 40) return 'moderate'
  if (v <= 60) return 'elevated'
  if (v <= 80) return 'high'
  return 'severe'
}

/** Every score that reaches the UI is an integer in [0, 100]. */
function toScore(value: number): number {
  return Math.round(clamp(value, 0, 100))
}

function makeScore(
  dimension: RiskDimension,
  raw: number,
  confidence: Confidence,
  headline: string,
  evidence: readonly Evidence[],
): RiskScore {
  const value = toScore(raw)
  return { dimension, value, band: bandFor(value), confidence, headline, evidence }
}

/* -------------------------------------------------------------------------- */
/* Heat                                                                       */
/* -------------------------------------------------------------------------- */

export interface HeatInputs {
  /** Mean days per year above 35 °C over the observed baseline period. */
  readonly observedDaysOver35: number
  /** Mean days per year above 35 °C in the 2050 projection window. */
  readonly projectedDaysOver35: number
  /** Baseline period label, e.g. "1991-2020". Carried into the evidence list. */
  readonly baselineLabel: string
  /** Projection label, e.g. "CMIP6 multi-model mean, SSP2-4.5, 2040-2059". */
  readonly scenarioLabel: string
}

/**
 * Heat risk from extreme-heat-day exposure.
 *
 * Method, entirely our own and documented so it can be argued with:
 *   - Exposure term (70%): projected days above 35 °C, ramped 0 -> 60 days.
 *     60 days is roughly two months of extreme heat a year, which we treat as
 *     the top of the scale.
 *   - Acceleration term (30%): the projected-to-observed ratio, ramped 1x -> 4x.
 *     A place that is already hot scores high on exposure; a place that is
 *     about to change fast scores high here. Both matter to a householder.
 *
 * A location with no observed extreme-heat days uses the exposure term alone,
 * because a ratio against zero is undefined rather than infinite.
 */
export function heatScore(inputs: HeatInputs): RiskScore {
  const { observedDaysOver35, projectedDaysOver35, baselineLabel, scenarioLabel } =
    inputs

  const exposure = ramp(projectedDaysOver35, 0, 60)
  const hasBaseline = observedDaysOver35 > 0
  const acceleration = hasBaseline
    ? ramp(projectedDaysOver35 / observedDaysOver35, 1, 4)
    : exposure

  const raw = 0.7 * exposure + 0.3 * acceleration

  const headline = hasBaseline
    ? `Your street sees about ${Math.round(observedDaysOver35)} days a year above 35 °C today, and is projected to see about ${Math.round(projectedDaysOver35)} by 2050.`
    : `Your street rarely passes 35 °C today, and is projected to see about ${Math.round(projectedDaysOver35)} days a year above it by 2050.`

  return makeScore('heat', raw, 'modelled', headline, [
    {
      label: 'Days above 35 °C, today',
      value: Math.round(observedDaysOver35),
      unit: 'days per year',
      source: `Open-Meteo ERA5 archive, ${baselineLabel}`,
    },
    {
      label: 'Days above 35 °C, 2050',
      value: Math.round(projectedDaysOver35),
      unit: 'days per year',
      source: scenarioLabel,
    },
  ])
}

/* -------------------------------------------------------------------------- */
/* Flood                                                                      */
/* -------------------------------------------------------------------------- */

export interface FloodInputs {
  /** Elevation at the address, metres above sea level. */
  readonly elevationM: number
  /** Median elevation of the sampled ring around the address. */
  readonly neighbourhoodMedianElevationM: number
  /** Heaviest 24-hour rainfall in the archive for this cell, millimetres. */
  readonly maxDailyRainfallMm: number
  /** Archive period label, e.g. "1940-2025". */
  readonly archiveLabel: string
}

/**
 * Indicative flood exposure. NOT a flood map. CLAUDE.md section 7 requires the
 * word "indicative" to travel with every one of these numbers, which is why the
 * confidence field below is hard-coded rather than passed in.
 *
 * Method, entirely our own:
 *   - Terrain term (60%): the address's elevation minus the median elevation of
 *     the surrounding sample ring. Sitting 5 m or more below your surroundings
 *     scores 100, sitting 10 m or more above scores 0. Water collects in local
 *     low points; this is the cheapest honest proxy for that.
 *   - Rainfall term (40%): heaviest recorded 24-hour total, ramped 20 -> 200 mm.
 *
 * What this deliberately ignores: drainage, river systems, storm surge, soil
 * infiltration, and every piece of built stormwater infrastructure. Those are
 * exactly the things a real flood study models, and their absence is why this
 * is labelled indicative everywhere it appears.
 */
export function floodScore(inputs: FloodInputs): RiskScore {
  const {
    elevationM,
    neighbourhoodMedianElevationM,
    maxDailyRainfallMm,
    archiveLabel,
  } = inputs

  const relativeElevationM = elevationM - neighbourhoodMedianElevationM
  // Inverted ramp: -5 m relative -> 100, +10 m relative -> 0.
  const terrain = ramp(relativeElevationM, 10, -5)
  const rainfall = ramp(maxDailyRainfallMm, 20, 200)

  const raw = 0.6 * terrain + 0.4 * rainfall

  const position =
    relativeElevationM < -1
      ? `about ${Math.abs(Math.round(relativeElevationM))} m lower than the ground around it`
      : relativeElevationM > 1
        ? `about ${Math.round(relativeElevationM)} m higher than the ground around it`
        : 'level with the ground around it'

  const headline = `This spot sits ${position}, and the heaviest day of rain on record here is about ${Math.round(maxDailyRainfallMm)} mm. Indicative only — not a flood map.`

  return makeScore('flood', raw, 'indicative', headline, [
    {
      label: 'Elevation relative to surroundings',
      value: Math.round(relativeElevationM * 10) / 10,
      unit: 'm',
      source: 'Open-Meteo elevation API, 1 km sample ring',
    },
    {
      label: 'Heaviest 24-hour rainfall on record',
      value: Math.round(maxDailyRainfallMm),
      unit: 'mm',
      source: `Open-Meteo ERA5 archive, ${archiveLabel}`,
    },
  ])
}

/* -------------------------------------------------------------------------- */
/* Air                                                                        */
/* -------------------------------------------------------------------------- */

export interface AirInputs {
  /** European AQI for the coordinate. Null when the provider omits it. */
  readonly europeanAqi: number | null
  /** The same air on the US scale, shown alongside so the two can be compared. */
  readonly usAqi: number | null
  readonly pm25: number | null
  readonly pm10: number | null
  readonly ozone: number | null
}

/**
 * Air quality risk.
 *
 * Primary path: the European Air Quality Index is already a 0-100+ scale with
 * published bands (0-20 good, 20-40 fair, 40-60 moderate, 60-80 poor, 80-100
 * very poor, above 100 extremely poor). Those band edges line up with our own
 * risk scale, so we clamp it into [0, 100] and use it directly rather than
 * inventing a second scale on top of a scale.
 *
 * Fallback path, used only when the provider returns no EAQI: PM2.5 against the
 * WHO 2021 24-hour guideline of 15 ug/m3, anchored so that the guideline value
 * scores 50. This is our anchor choice, not a WHO one, and it is stated here.
 */
export function airScore(inputs: AirInputs): RiskScore {
  const { europeanAqi, usAqi, pm25, pm10, ozone } = inputs

  const evidence: Evidence[] = []
  if (pm25 !== null) {
    evidence.push({
      label: 'PM2.5',
      value: Math.round(pm25 * 10) / 10,
      unit: 'µg/m³',
      source: 'CAMS model via Open-Meteo, current hour (WHO 24-h guideline: 15)',
    })
  }
  if (pm10 !== null) {
    evidence.push({
      label: 'PM10',
      value: Math.round(pm10 * 10) / 10,
      unit: 'µg/m³',
      source: 'CAMS model via Open-Meteo, current hour (WHO 24-h guideline: 45)',
    })
  }
  if (ozone !== null) {
    evidence.push({
      label: 'Ozone',
      value: Math.round(ozone),
      unit: 'µg/m³',
      source: 'CAMS model via Open-Meteo, current hour',
    })
  }

  if (usAqi !== null) {
    evidence.push({
      label: 'US AQI, same air',
      value: Math.round(usAqi),
      unit: 'index',
      source:
        'The two indices are scored differently and will not agree — this is the same reading, not a second measurement',
    })
  }

  if (europeanAqi !== null) {
    evidence.unshift({
      label: 'European AQI',
      value: Math.round(europeanAqi),
      unit: 'index',
      source:
        'CAMS atmospheric model via Open-Meteo, served on a 0.1° grid — a regional forecast, not a sensor, so it will differ from nearby monitoring stations',
    })
    const raw = clamp(europeanAqi, 0, 100)
    return makeScore(
      'air',
      raw,
      'modelled',
      `Air across this area rates ${Math.round(europeanAqi)} on the European Air Quality Index right now, where anything under 20 is good and over 80 is very poor. This is a modelled grid cell, not a sensor on your street.`,
      evidence,
    )
  }

  if (pm25 !== null) {
    const raw = ramp(pm25, 0, 30) // 15 ug/m3 (the WHO guideline) lands on 50.
    return makeScore(
      'air',
      raw,
      'modelled',
      `Fine particles are modelled at about ${Math.round(pm25)} µg/m³ across this area right now. The World Health Organization's 24-hour guideline is 15 µg/m³.`,
      evidence,
    )
  }

  return makeScore(
    'air',
    0,
    'indicative',
    'No air quality reading is available for this coordinate right now.',
    evidence,
  )
}

/* -------------------------------------------------------------------------- */
/* Drought and fire weather                                                   */
/* -------------------------------------------------------------------------- */

export interface DryFireInputs {
  /** Longest run of days below 1 mm rain in the recent archive window. */
  readonly maxConsecutiveDryDays: number
  readonly temperatureC: number
  readonly relativeHumidityPct: number
  /** Reported for context only. See the TODO below. */
  readonly windSpeedKmh: number
  readonly archiveLabel: string
}

/**
 * The Chandler Burning Index (Chandler et al., 1983), a published fire-weather
 * index computed from dry-bulb temperature and relative humidity alone.
 *
 * Its own published bands: below 50 low, 50-75 moderate, 75-90 high, 90-97.5
 * very high, above 97.5 extreme.
 *
 * ONE HONEST CAVEAT. The index is defined over *monthly mean afternoon*
 * temperature and humidity. We feed it the current hour, which is what live
 * weather stations publishing a CBI generally do, but it is not what the
 * original definition specifies — so the band edges above should be read as
 * approximate here rather than as the published thresholds applied exactly.
 * Verified against the source definition on 28 Aug 2026.
 */
export function chandlerBurningIndex(
  temperatureC: number,
  relativeHumidityPct: number,
): number {
  const rh = clamp(relativeHumidityPct, 0, 100)
  const t = temperatureC
  const cbi =
    (((110 - 1.373 * rh) - 0.54 * (10.2 - t)) *
      (124 * Math.pow(10, -0.0142 * rh))) /
    60
  return clamp(cbi, 0, 100)
}

/**
 * Drought and fire-weather risk.
 *
 * Method:
 *   - Fire-weather term (50%): the Chandler Burning Index above, whose scale is
 *     already 0-100 and whose bands sit close enough to ours to use directly.
 *   - Dryness term (50%): longest run of consecutive dry days in the archive
 *     window, ramped 0 -> 30 days. Our ramp, not a published one.
 *
 * TODO (wind): CLAUDE.md section 2 names wind as part of the fire-weather
 * proxy, and the Chandler index does not use it. The intended method is the
 * wind term of the McArthur Forest Fire Danger Index, which additionally needs
 * a drought factor derived from a soil-moisture deficit model we do not have a
 * keyless source for. Rather than invent a wind multiplier, wind speed is
 * fetched, reported as evidence, and left out of the arithmetic until the
 * drought factor has a real source. Nothing here is weighted by wind today.
 */
export function dryFireScore(inputs: DryFireInputs): RiskScore {
  const {
    maxConsecutiveDryDays,
    temperatureC,
    relativeHumidityPct,
    windSpeedKmh,
    archiveLabel,
  } = inputs

  const fireWeather = chandlerBurningIndex(temperatureC, relativeHumidityPct)
  const dryness = ramp(maxConsecutiveDryDays, 0, 30)
  const raw = 0.5 * fireWeather + 0.5 * dryness

  const headline = `The longest dry run on record here is about ${Math.round(maxConsecutiveDryDays)} days, and today's temperature and humidity put fire weather at ${Math.round(fireWeather)} on the Chandler index.`

  return makeScore('dryfire', raw, 'indicative', headline, [
    {
      label: 'Longest run of dry days',
      value: Math.round(maxConsecutiveDryDays),
      unit: 'days',
      source: `Open-Meteo ERA5 archive, ${archiveLabel}`,
    },
    {
      label: 'Chandler Burning Index',
      value: Math.round(fireWeather),
      unit: 'index',
      source: 'Computed from current temperature and humidity',
    },
    {
      label: 'Wind speed',
      value: Math.round(windSpeedKmh),
      unit: 'km/h',
      source: 'Open-Meteo forecast, current hour — context only, not scored',
    },
  ])
}

/* -------------------------------------------------------------------------- */
/* Composite                                                                  */
/* -------------------------------------------------------------------------- */

export interface CompositeResult {
  readonly composite: number
  readonly band: RiskBand
  readonly dominant: RiskDimension
}

/**
 * Combine the four dimensions into one headline number.
 *
 * The four are weighted equally, on purpose. There is no published basis for
 * saying heat matters 1.4 times as much as air quality to a given household,
 * and inventing weights would be exactly the kind of fabricated number
 * CLAUDE.md section 5 forbids. Equal weighting is a stated assumption, not a
 * finding, and the UI says so.
 *
 * `dominant` is the highest-scoring dimension, with ties broken in the fixed
 * order heat, flood, air, dryfire so the function stays deterministic.
 */
export function compositeRisk(
  scores: Readonly<Record<RiskDimension, RiskScore>>,
): CompositeResult {
  const order: readonly RiskDimension[] = ['heat', 'flood', 'air', 'dryfire']

  const total = order.reduce((sum, dimension) => sum + scores[dimension].value, 0)
  const composite = toScore(total / order.length)

  let dominant: RiskDimension = 'heat'
  for (const dimension of order) {
    if (scores[dimension].value > scores[dominant].value) dominant = dimension
  }

  return { composite, band: bandFor(composite), dominant }
}

/**
 * Longest run of consecutive days below `thresholdMm` of rain.
 *
 * Lives here rather than in climate.ts because it is arithmetic over an array
 * and has to be unit-testable without a network. Nulls in the series are gaps
 * in the archive, and a gap breaks the run rather than extending it — the
 * conservative reading.
 */
export function longestDryRun(
  dailyPrecipitationMm: readonly (number | null)[],
  thresholdMm = 1,
): number {
  let longest = 0
  let current = 0
  for (const value of dailyPrecipitationMm) {
    if (value !== null && value < thresholdMm) {
      current += 1
      if (current > longest) longest = current
    } else {
      current = 0
    }
  }
  return longest
}

/** Mean days per year above `thresholdC`, given a daily maximum series. */
export function meanDaysAboveThreshold(
  dailyMaxC: readonly (number | null)[],
  years: number,
  thresholdC = 35,
): number {
  if (years <= 0) return 0
  const count = dailyMaxC.reduce<number>(
    (total, value) => (value !== null && value > thresholdC ? total + 1 : total),
    0,
  )
  return count / years
}

/** Median of a numeric sample. Returns 0 for an empty sample. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const lower = sorted[mid - 1]
  const upper = sorted[mid]
  if (sorted.length % 2 === 0 && lower !== undefined && upper !== undefined) {
    return (lower + upper) / 2
  }
  return upper ?? 0
}

/* -------------------------------------------------------------------------- */
/* Series helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Count days above `thresholdC` in each calendar year of a daily series.
 *
 * Years with fewer than `minDaysInYear` readings are dropped entirely. Without
 * that guard, a series ending in August would render a final year showing a
 * collapse in hot days that is an artefact of the request window, not a change
 * in the climate — a chart that lies by omission.
 *
 * `time` and `dailyMaxC` are parallel arrays as returned by Open-Meteo; a
 * length mismatch yields an empty result rather than a silent misalignment.
 */
export function daysAboveThresholdByYear(
  time: readonly string[],
  dailyMaxC: readonly (number | null)[],
  thresholdC = 35,
  minDaysInYear = 300,
): readonly ProjectionPoint[] {
  if (time.length !== dailyMaxC.length) return []

  const hot = new Map<number, number>()
  const observedDays = new Map<number, number>()

  for (let index = 0; index < time.length; index += 1) {
    const stamp = time[index]
    const value = dailyMaxC[index]
    if (stamp === undefined || value === undefined || value === null) continue

    const year = Number.parseInt(stamp.slice(0, 4), 10)
    if (!Number.isFinite(year)) continue

    observedDays.set(year, (observedDays.get(year) ?? 0) + 1)
    if (value > thresholdC) hot.set(year, (hot.get(year) ?? 0) + 1)
  }

  return [...observedDays.entries()]
    .filter(([, days]) => days >= minDaysInYear)
    .map(([year]) => ({ year, value: hot.get(year) ?? 0 }))
    .sort((a, b) => a.year - b.year)
}

/**
 * Mean value across the points falling inside [fromYear, toYear] inclusive.
 * Returns 0 when the window contains no points, which the caller must treat as
 * "no data" rather than as "zero hot days".
 */
export function meanOverWindow(
  points: readonly ProjectionPoint[],
  fromYear: number,
  toYear: number,
): number {
  const inWindow = points.filter(
    (point) => point.year >= fromYear && point.year <= toYear,
  )
  if (inWindow.length === 0) return 0
  const total = inWindow.reduce((sum, point) => sum + point.value, 0)
  return total / inWindow.length
}

/** Largest non-null value in a series. Returns 0 for an all-null series. */
export function maxOf(values: readonly (number | null)[]): number {
  let largest = 0
  let seen = false
  for (const value of values) {
    if (value === null) continue
    if (!seen || value > largest) {
      largest = value
      seen = true
    }
  }
  return seen ? largest : 0
}
