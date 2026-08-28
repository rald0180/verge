/**
 * Every Open-Meteo call in the project, typed and wrapped.
 *
 * All six endpoints are free, keyless and CORS-enabled, so these run straight
 * from the browser. Nothing here computes a risk score — that is scoring.ts,
 * which stays pure. This file only fetches and validates.
 *
 * Every function returns ApiResult<T>. Nothing throws.
 */

import { fail, ok } from './types'
import type {
  AirQualityResponse,
  ApiResult,
  ArchiveDailyResponse,
  ClimateDailyResponse,
  Coordinates,
  ElevationResponse,
  ForecastCurrentResponse,
} from './types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const CLIMATE_URL = 'https://climate-api.open-meteo.com/v1/climate'
const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'

/* -------------------------------------------------------------------------- */
/* Transport                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One fetch path for every endpoint, so the failure modes are handled once.
 * The caller supplies a type guard; a 200 that does not satisfy it is a
 * bad-response, not a crash.
 */
async function getJson<T>(
  url: URL,
  isValid: (value: unknown) => value is T,
  label: string,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    })
  } catch {
    if (signal?.aborted) return fail('network', 'Request cancelled.')
    return fail('network', `Could not reach the ${label} service.`, { retryable: true })
  }

  if (response.status === 429) {
    return fail('rate-limited', `The ${label} service is rate limiting us. Try again shortly.`, {
      retryable: true,
      status: 429,
    })
  }

  if (!response.ok) {
    return fail('upstream', `The ${label} service returned an error.`, {
      retryable: true,
      status: response.status,
    })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return fail('bad-response', `The ${label} service returned unreadable data.`)
  }

  if (!isValid(payload)) {
    return fail('bad-response', `The ${label} data was not in the expected shape.`)
  }

  return ok(payload)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isNumberOrNullArray(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.every(isNumberOrNull)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

/* -------------------------------------------------------------------------- */
/* Elevation                                                                  */
/* -------------------------------------------------------------------------- */

function isElevationResponse(value: unknown): value is ElevationResponse {
  return (
    isObject(value) &&
    Array.isArray(value.elevation) &&
    value.elevation.every((entry) => typeof entry === 'number')
  )
}

/** Metres per degree of latitude. Close enough for a 1 km sample ring. */
const METRES_PER_DEGREE_LAT = 111_320

/**
 * Build a sample ring around a point: the centre plus eight compass points at
 * `radiusMetres`. The flood term needs to know whether an address sits in a
 * local dip, which needs its surroundings, not just its own elevation.
 */
export function sampleRing(
  centre: Coordinates,
  radiusMetres = 1000,
): readonly Coordinates[] {
  const dLat = radiusMetres / METRES_PER_DEGREE_LAT
  const dLon =
    radiusMetres /
    (METRES_PER_DEGREE_LAT * Math.cos((centre.latitude * Math.PI) / 180))

  const offsets: readonly (readonly [number, number])[] = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.7, 0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [-0.7, -0.7],
  ]

  return offsets.map(([latFactor, lonFactor]) => ({
    latitude: centre.latitude + latFactor * dLat,
    longitude: centre.longitude + lonFactor * dLon,
  }))
}

/**
 * Elevation for a list of coordinates, in the order given.
 * Open-Meteo accepts up to 100 coordinates per request.
 */
export async function fetchElevations(
  points: readonly Coordinates[],
  signal?: AbortSignal,
): Promise<ApiResult<readonly number[]>> {
  if (points.length === 0) {
    return fail('invalid-input', 'No coordinates were supplied for elevation.')
  }

  const url = new URL(ELEVATION_URL)
  url.searchParams.set('latitude', points.map((p) => p.latitude.toFixed(5)).join(','))
  url.searchParams.set('longitude', points.map((p) => p.longitude.toFixed(5)).join(','))

  const result = await getJson(url, isElevationResponse, 'elevation', signal)
  if (!result.ok) return result

  if (result.data.elevation.length !== points.length) {
    return fail('bad-response', 'The elevation service returned the wrong number of points.')
  }

  return ok(result.data.elevation)
}

/* -------------------------------------------------------------------------- */
/* Air quality                                                                */
/* -------------------------------------------------------------------------- */

function isAirQualityResponse(value: unknown): value is AirQualityResponse {
  if (!isObject(value) || !isObject(value.current)) return false
  const current = value.current
  return (
    typeof current.time === 'string' &&
    isNumberOrNull(current.pm2_5 ?? null) &&
    isNumberOrNull(current.pm10 ?? null) &&
    isNumberOrNull(current.ozone ?? null) &&
    isNumberOrNull(current.european_aqi ?? null)
  )
}

/** Current PM2.5, PM10, ozone and European AQI for one coordinate. */
export async function fetchAirQuality(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<ApiResult<AirQualityResponse>> {
  const url = new URL(AIR_QUALITY_URL)
  url.searchParams.set('latitude', coordinates.latitude.toFixed(5))
  url.searchParams.set('longitude', coordinates.longitude.toFixed(5))
  url.searchParams.set('current', 'pm2_5,pm10,ozone,european_aqi')
  return getJson(url, isAirQualityResponse, 'air quality', signal)
}

/* -------------------------------------------------------------------------- */
/* Historical archive                                                         */
/* -------------------------------------------------------------------------- */

function isArchiveDailyResponse(value: unknown): value is ArchiveDailyResponse {
  if (!isObject(value) || !isObject(value.daily)) return false
  const daily = value.daily
  return (
    isStringArray(daily.time) &&
    isNumberOrNullArray(daily.temperature_2m_max) &&
    isNumberOrNullArray(daily.precipitation_sum)
  )
}

/**
 * Daily maximum temperature and daily rainfall from the ERA5 reanalysis
 * archive. Dates are ISO `YYYY-MM-DD` and are supplied by the caller — this
 * module never reads the clock, so the whole pipeline stays reproducible.
 */
export async function fetchArchiveDaily(
  coordinates: Coordinates,
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<ApiResult<ArchiveDailyResponse>> {
  const url = new URL(ARCHIVE_URL)
  url.searchParams.set('latitude', coordinates.latitude.toFixed(5))
  url.searchParams.set('longitude', coordinates.longitude.toFixed(5))
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum')
  url.searchParams.set('timezone', 'auto')
  return getJson(url, isArchiveDailyResponse, 'climate archive', signal)
}

/* -------------------------------------------------------------------------- */
/* Downscaled projections                                                     */
/* -------------------------------------------------------------------------- */

function isClimateDailyResponse(value: unknown): value is ClimateDailyResponse {
  if (!isObject(value) || !isObject(value.daily)) return false
  const daily = value.daily
  return isStringArray(daily.time) && isNumberOrNullArray(daily.temperature_2m_max)
}

/**
 * Downscaled CMIP6 daily maxima out to 2050.
 *
 * A single model is requested deliberately: asking Open-Meteo for several
 * models suffixes every field with the model name, which changes the response
 * shape. One model keeps `temperature_2m_max` plain and keeps the label honest
 * — the UI says which model it is rather than claiming a multi-model mean.
 *
 * TODO (Phase 2): confirm from the Open-Meteo climate API documentation which
 * SSP emissions scenario the downscaled HighResMIP set is served under, and
 * put that exact string in the scenario label. Until it is confirmed, no
 * scenario is asserted anywhere in the UI. Do not guess this one — a wrong
 * scenario label is precisely the fabricated citation CLAUDE.md section 5
 * rules out.
 */
export async function fetchClimateProjection(
  coordinates: Coordinates,
  startDate: string,
  endDate: string,
  model = 'MRI_AGCM3_2_S',
  signal?: AbortSignal,
): Promise<ApiResult<ClimateDailyResponse>> {
  const url = new URL(CLIMATE_URL)
  url.searchParams.set('latitude', coordinates.latitude.toFixed(5))
  url.searchParams.set('longitude', coordinates.longitude.toFixed(5))
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('models', model)
  url.searchParams.set('daily', 'temperature_2m_max')
  return getJson(url, isClimateDailyResponse, 'climate projection', signal)
}

/* -------------------------------------------------------------------------- */
/* Current conditions                                                         */
/* -------------------------------------------------------------------------- */

function isForecastCurrentResponse(value: unknown): value is ForecastCurrentResponse {
  if (!isObject(value) || !isObject(value.current)) return false
  const current = value.current
  return (
    typeof current.time === 'string' &&
    isNumberOrNull(current.temperature_2m ?? null) &&
    isNumberOrNull(current.relative_humidity_2m ?? null) &&
    isNumberOrNull(current.wind_speed_10m ?? null)
  )
}

/** Temperature, humidity and wind right now — the fire-weather inputs. */
export async function fetchCurrentWeather(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<ApiResult<ForecastCurrentResponse>> {
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', coordinates.latitude.toFixed(5))
  url.searchParams.set('longitude', coordinates.longitude.toFixed(5))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m')
  url.searchParams.set('wind_speed_unit', 'kmh')
  url.searchParams.set('timezone', 'auto')
  return getJson(url, isForecastCurrentResponse, 'weather', signal)
}
