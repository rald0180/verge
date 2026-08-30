import { useCallback, useRef, useState } from 'react'

import {
  fetchAirQuality,
  fetchArchiveDaily,
  fetchClimateProjection,
  fetchCurrentWeather,
  fetchElevations,
  sampleRing,
} from '../lib/climate'
import { searchAddress } from '../lib/geocode'
import {
  airScore,
  compositeRisk,
  daysAboveThresholdByYear,
  dryFireScore,
  floodScore,
  heatScore,
  longestDryRun,
  maxOf,
  meanOverWindow,
  median,
} from '../lib/scoring'
import type {
  ApiError,
  ClimateProjection,
  Coordinates,
  GeocodeResult,
  RiskDimension,
  RiskProfile,
  RiskScore,
} from '../lib/types'

/* -------------------------------------------------------------------------- */
/* Windows and constants                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 1991-2020 is the current WMO standard 30-year climate normal. Using the
 * published normal rather than "the last however many years we happened to
 * fetch" means the "today" figure has a name a meteorologist would recognise.
 */
const BASELINE_FROM_YEAR = 1991
const BASELINE_TO_YEAR = 2020

/**
 * The "by 2050" figure is the mean of the last decade of the projection, not a
 * single year. One year of a climate model is noise; a decade is a signal.
 */
const FUTURE_FROM_YEAR = 2041
const FUTURE_TO_YEAR = 2050

const HEAT_THRESHOLD_C = 35
const PROJECTION_LAST_YEAR = 2050
const RING_RADIUS_M = 1000

/** One model, so the response keeps a flat `temperature_2m_max` field. */
const CLIMATE_MODEL = 'MRI_AGCM3_2_S'

/**
 * Verified against the Open-Meteo climate API documentation on 28 Aug 2026.
 *
 * They publish NO SSP designation for this dataset. Their own wording is that
 * the high resolution models are "as close to RCP8.5 as possible within CMIP6".
 * That sentence is quoted rather than paraphrased into an SSP number, because
 * inventing an SSP label would be a fabricated citation — see CLAUDE.md
 * section 5 and the BACKLOG entry this closes.
 */
const SCENARIO_NOTE = `Model ${CLIMATE_MODEL}, CMIP6 HighResMIP downscaled to ~10 km. Open-Meteo publish no SSP for this dataset and describe it as “as close to RCP8.5 as possible within CMIP6”.`

const BASELINE_LABEL = `${BASELINE_FROM_YEAR}–${BASELINE_TO_YEAR} normal`

interface Windows {
  readonly archiveStart: string
  readonly archiveEnd: string
  readonly projectionStart: string
  readonly projectionEnd: string
  readonly archiveLabel: string
}

/**
 * Date windows are computed here, from the caller's clock, and passed down as
 * strings. scoring.ts and climate.ts never read the clock themselves — that is
 * what keeps the scoring reproducible.
 */
function buildWindows(now: Date): Windows {
  const lastCompleteYear = now.getUTCFullYear() - 1
  // Guard the app against outliving its own projection window.
  const projectionStartYear = Math.min(now.getUTCFullYear(), PROJECTION_LAST_YEAR)

  return {
    archiveStart: `${BASELINE_FROM_YEAR}-01-01`,
    archiveEnd: `${lastCompleteYear}-12-31`,
    projectionStart: `${projectionStartYear}-01-01`,
    projectionEnd: `${PROJECTION_LAST_YEAR}-12-31`,
    archiveLabel: `${BASELINE_FROM_YEAR}–${lastCompleteYear}`,
  }
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

export type RiskProfileState =
  | { readonly status: 'idle' }
  | { readonly status: 'locating'; readonly query: string }
  /** Address resolved; the five climate requests are in flight. */
  | { readonly status: 'loading'; readonly place: GeocodeResult }
  | { readonly status: 'ready'; readonly profile: RiskProfile }
  | { readonly status: 'error'; readonly error: ApiError }

export interface UseRiskProfile {
  readonly state: RiskProfileState
  readonly load: (query: string) => Promise<void>
  readonly retry: () => Promise<void>
  readonly reset: () => void
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useRiskProfile(): UseRiskProfile {
  const [state, setState] = useState<RiskProfileState>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)
  const lastQueryRef = useRef<string>('')

  const load = useCallback(async (query: string) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const { signal } = controller
    lastQueryRef.current = query

    setState({ status: 'locating', query })

    const located = await searchAddress(query, signal)
    if (signal.aborted) return

    if (!located.ok) {
      setState({ status: 'error', error: located.error })
      return
    }

    const place = located.data[0]
    if (!place) {
      setState({
        status: 'error',
        error: {
          kind: 'not-found',
          message: 'That address did not resolve to a coordinate.',
          retryable: false,
        },
      })
      return
    }

    setState({ status: 'loading', place })

    const coordinates: Coordinates = place.coordinates
    const windows = buildWindows(new Date())
    const ring = sampleRing(coordinates, RING_RADIUS_M)

    /**
     * Five requests in parallel. Every one of them feeds a dial, so if any
     * single source fails the whole profile fails and offers a retry.
     *
     * The alternative — rendering three dials and a fourth showing zero —
     * would paint "we could not reach the air quality service" as a green,
     * low-risk result. A missing measurement is not a good measurement.
     */
    const [archive, projection, elevations, air, current] = await Promise.all([
      fetchArchiveDaily(coordinates, windows.archiveStart, windows.archiveEnd, signal),
      fetchClimateProjection(
        coordinates,
        windows.projectionStart,
        windows.projectionEnd,
        CLIMATE_MODEL,
        signal,
      ),
      fetchElevations(ring, signal),
      fetchAirQuality(coordinates, signal),
      fetchCurrentWeather(coordinates, signal),
    ])

    if (signal.aborted) return

    for (const result of [archive, projection, elevations, air, current]) {
      if (!result.ok) {
        setState({ status: 'error', error: result.error })
        return
      }
    }

    // Narrow all five. The loop above guarantees these, but the compiler
    // cannot see through it and we are not reaching for a non-null assertion.
    if (
      !archive.ok ||
      !projection.ok ||
      !elevations.ok ||
      !air.ok ||
      !current.ok
    ) {
      return
    }

    /* ---------------------------------------------------------------- heat */

    const observedByYear = daysAboveThresholdByYear(
      archive.data.daily.time,
      archive.data.daily.temperature_2m_max,
      HEAT_THRESHOLD_C,
    )
    const projectedByYear = daysAboveThresholdByYear(
      projection.data.daily.time,
      projection.data.daily.temperature_2m_max,
      HEAT_THRESHOLD_C,
    )

    const observedMean = meanOverWindow(
      observedByYear,
      BASELINE_FROM_YEAR,
      BASELINE_TO_YEAR,
    )
    const projectedMean = meanOverWindow(
      projectedByYear,
      FUTURE_FROM_YEAR,
      FUTURE_TO_YEAR,
    )

    const heat = heatScore({
      observedDaysOver35: observedMean,
      projectedDaysOver35: projectedMean,
      baselineLabel: BASELINE_LABEL,
      scenarioLabel: SCENARIO_NOTE,
    })

    /* --------------------------------------------------------------- flood */

    const centreElevation = elevations.data[0] ?? 0
    const ringElevations = [...elevations.data].slice(1)

    const flood = floodScore({
      elevationM: centreElevation,
      neighbourhoodMedianElevationM: median(ringElevations),
      maxDailyRainfallMm: maxOf(archive.data.daily.precipitation_sum),
      archiveLabel: windows.archiveLabel,
    })

    /* ----------------------------------------------------------------- air */

    const airCurrent = air.data.current
    const airResult = airScore({
      // Coalesced rather than passed straight through: the response guard in
      // climate.ts accepts an ABSENT field as well as a null one, so a provider
      // that simply omits a pollutant leaves `undefined` here. That clears the
      // `!== null` checks inside airScore and reaches Math.round(undefined),
      // painting NaN on the dial. Null is the only "we do not have this" value
      // the scoring understands.
      europeanAqi: airCurrent.european_aqi ?? null,
      usAqi: airCurrent.us_aqi ?? null,
      pm25: airCurrent.pm2_5 ?? null,
      pm10: airCurrent.pm10 ?? null,
      ozone: airCurrent.ozone ?? null,
    })

    /* ------------------------------------------------------------- dryfire */

    const weather = current.data.current
    const dryfire = dryFireScore({
      maxConsecutiveDryDays: longestDryRun(archive.data.daily.precipitation_sum),
      temperatureC: weather.temperature_2m ?? 0,
      relativeHumidityPct: weather.relative_humidity_2m ?? 0,
      windSpeedKmh: weather.wind_speed_10m ?? 0,
      archiveLabel: windows.archiveLabel,
    })

    /* ----------------------------------------------------------- composite */

    const scores: Record<RiskDimension, RiskScore> = {
      heat,
      flood,
      air: airResult,
      dryfire,
    }
    const { composite, band, dominant } = compositeRisk(scores)

    const climateProjection: ClimateProjection = {
      // Heat is the only dimension with a genuine observed-versus-projected
      // series. See the note in App.tsx on why the chart is not switched to
      // whichever dimension happens to dominate.
      dimension: 'heat',
      label: `Days above ${HEAT_THRESHOLD_C} °C per year`,
      unit: 'days',
      observed: observedByYear,
      projected: projectedByYear,
      scenario: SCENARIO_NOTE,
      // The same windows the heat dial used, so the chart and the dial can
      // never disagree about what "today" and "by 2050" mean.
      baselineMean: observedMean,
      projectedMean,
      baselineWindowLabel: `${BASELINE_FROM_YEAR}–${BASELINE_TO_YEAR} average`,
      projectedWindowLabel: `${FUTURE_FROM_YEAR}–${FUTURE_TO_YEAR} average`,
    }

    const profile: RiskProfile = {
      place,
      generatedAt: new Date().toISOString(),
      scores,
      composite,
      compositeBand: band,
      dominant,
      projection: climateProjection,
    }

    setState({ status: 'ready', profile })
  }, [])

  const retry = useCallback(async () => {
    if (lastQueryRef.current) await load(lastQueryRef.current)
  }, [load])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    lastQueryRef.current = ''
    setState({ status: 'idle' })
  }, [])

  return { state, load, retry, reset }
}
