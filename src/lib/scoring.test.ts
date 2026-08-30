import { describe, expect, it } from 'vitest'

import {
  airScore,
  bandFor,
  chandlerBurningIndex,
  clamp,
  compositeRisk,
  daysAboveThresholdByYear,
  dryFireScore,
  floodScore,
  heatScore,
  longestDryRun,
  maxOf,
  meanDaysAboveThreshold,
  meanOverWindow,
  median,
  ramp,
} from './scoring'
import type { RiskDimension, RiskScore } from './types'

/**
 * scoring.ts is pure by contract (CLAUDE.md section 3, hard rule 2), which is
 * the whole reason these tests need no network, no clock and no mocking.
 *
 * The heat case below is the one that matters most: it locks in the figures
 * derived independently in Python from real ERA5 and CMIP6 data for Subiaco
 * before any UI existed. If someone edits a ramp, that test fails.
 */

describe('primitives', () => {
  it('clamps, including NaN to the minimum', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
    expect(clamp(Number.NaN, 3, 10)).toBe(3)
  })

  it('ramps forward and inverted', () => {
    expect(ramp(0, 0, 100)).toBe(0)
    expect(ramp(50, 0, 100)).toBe(50)
    expect(ramp(200, 0, 100)).toBe(100)
    // Inverted, as the flood terrain term uses it: lower is worse.
    expect(ramp(10, 10, -5)).toBe(0)
    expect(ramp(-5, 10, -5)).toBe(100)
    expect(ramp(-20, 10, -5)).toBe(100)
  })

  it('places band boundaries exactly where section 4 says', () => {
    expect(bandFor(0)).toBe('low')
    expect(bandFor(20)).toBe('low')
    expect(bandFor(21)).toBe('moderate')
    expect(bandFor(40)).toBe('moderate')
    expect(bandFor(41)).toBe('elevated')
    expect(bandFor(60)).toBe('elevated')
    expect(bandFor(61)).toBe('high')
    expect(bandFor(80)).toBe('high')
    expect(bandFor(81)).toBe('severe')
    expect(bandFor(100)).toBe('severe')
  })
})

describe('series helpers', () => {
  it('breaks a dry run on a wet day and on a gap in the archive', () => {
    expect(longestDryRun([0, 0, 0, 5, 0, 0])).toBe(3)
    // A null is a hole in the record, not a dry day. It breaks the run.
    expect(longestDryRun([0, 0, null, 0, 0, 0, 0])).toBe(4)
    expect(longestDryRun([])).toBe(0)
    expect(longestDryRun([10, 10])).toBe(0)
  })

  it('counts days above a threshold per year and drops partial years', () => {
    const time: string[] = []
    const temps: number[] = []
    // 2020 gets a full year, 40 of them hot. 2021 gets only 10 days.
    for (let d = 0; d < 365; d += 1) {
      time.push(`2020-01-${String((d % 28) + 1).padStart(2, '0')}`)
      temps.push(d < 40 ? 40 : 20)
    }
    for (let d = 0; d < 10; d += 1) {
      time.push(`2021-01-${String(d + 1).padStart(2, '0')}`)
      temps.push(40)
    }
    const points = daysAboveThresholdByYear(time, temps, 35)
    expect(points).toHaveLength(1)
    expect(points[0]).toEqual({ year: 2020, value: 40 })
  })

  it('returns nothing when the parallel arrays disagree in length', () => {
    expect(daysAboveThresholdByYear(['2020-01-01'], [1, 2], 35)).toEqual([])
  })

  it('averages only inside the requested window', () => {
    const points = [
      { year: 2019, value: 10 },
      { year: 2020, value: 20 },
      { year: 2021, value: 30 },
    ]
    expect(meanOverWindow(points, 2020, 2021)).toBe(25)
    expect(meanOverWindow(points, 2030, 2040)).toBe(0)
  })

  it('finds a maximum across nulls, and medians odd, even and empty', () => {
    expect(maxOf([1, null, 9, 3])).toBe(9)
    expect(maxOf([null, null])).toBe(0)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBe(0)
  })

  it('averages days above a threshold per year', () => {
    expect(meanDaysAboveThreshold([40, 40, 20, null], 2, 35)).toBe(1)
    expect(meanDaysAboveThreshold([40], 0, 35)).toBe(0)
  })
})

describe('heat', () => {
  /**
   * Ground truth for Rokeby Road, Subiaco, computed from the ERA5 archive
   * (1991-2020 normal) and the CMIP6 projection (2041-2050) before the UI
   * existed: 14.93 observed days above 35 C, 37.60 projected.
   */
  it('reproduces the verified Subiaco figure', () => {
    const score = heatScore({
      observedDaysOver35: 14.93,
      projectedDaysOver35: 37.6,
      baselineLabel: '1991-2020 normal',
      scenarioLabel: 'CMIP6 test',
    })
    expect(score.value).toBe(59)
    expect(score.band).toBe('elevated')
    expect(score.confidence).toBe('modelled')
    expect(score.headline).toContain('15')
    expect(score.headline).toContain('38')
  })

  it('falls back to exposure alone when there is no baseline to divide by', () => {
    const score = heatScore({
      observedDaysOver35: 0,
      projectedDaysOver35: 30,
      baselineLabel: 'x',
      scenarioLabel: 'y',
    })
    // Exposure ramps 0->60 days, so 30 days is 50, used for both terms.
    expect(score.value).toBe(50)
    expect(score.headline).toContain('rarely passes 35')
  })
})

describe('flood', () => {
  const base = { maxDailyRainfallMm: 100, archiveLabel: '1991-2025' }

  it('scores a hollow far above a rise, and is always labelled indicative', () => {
    const low = floodScore({ ...base, elevationM: 10, neighbourhoodMedianElevationM: 22.5 })
    const high = floodScore({ ...base, elevationM: 30, neighbourhoodMedianElevationM: 22.5 })
    expect(low.value).toBeGreaterThan(high.value)
    expect(low.confidence).toBe('indicative')
    expect(high.confidence).toBe('indicative')
    expect(low.headline).toContain('not a flood map')
  })

  it('reproduces the two real Subiaco coordinates', () => {
    // -31.9511: sits 7.5 m above its surroundings.
    expect(floodScore({ ...base, elevationM: 37.5, neighbourhoodMedianElevationM: 30 }).value).toBe(28)
    // -31.9460: sits 12.5 m below. Same street, 570 m north.
    expect(floodScore({ ...base, elevationM: 17.5, neighbourhoodMedianElevationM: 30 }).value).toBe(78)
  })
})

describe('air', () => {
  it('uses the European AQI directly and never claims to be measured', () => {
    const score = airScore({ europeanAqi: 22, usAqi: 41, pm25: 5.3, pm10: 8.2, ozone: 56 })
    expect(score.value).toBe(22)
    // CAMS is a model at 45 km, not a sensor. See scoring.ts.
    expect(score.confidence).toBe('modelled')
    expect(score.headline).toContain('not a sensor on your street')
  })

  it('falls back to PM2.5 against the WHO guideline, which lands on 50', () => {
    const score = airScore({ europeanAqi: null, usAqi: null, pm25: 15, pm10: null, ozone: null })
    expect(score.value).toBe(50)
  })

  it('reports no reading rather than inventing a good one', () => {
    const score = airScore({ europeanAqi: null, usAqi: null, pm25: null, pm10: null, ozone: null })
    expect(score.headline).toContain('No air quality reading')
  })
})

describe('drought and fire', () => {
  it('matches the published Chandler formula', () => {
    const t = 30
    const rh = 20
    const expected =
      (((110 - 1.373 * rh) - 0.54 * (10.2 - t)) * (124 * Math.pow(10, -0.0142 * rh))) / 60
    expect(chandlerBurningIndex(t, rh)).toBeCloseTo(Math.min(100, expected), 6)
  })

  it('reports wind but does not let it change the score', () => {
    const calm = dryFireScore({
      maxConsecutiveDryDays: 21,
      temperatureC: 30,
      relativeHumidityPct: 20,
      windSpeedKmh: 0,
      archiveLabel: 'x',
    })
    const gale = dryFireScore({ ...{
      maxConsecutiveDryDays: 21,
      temperatureC: 30,
      relativeHumidityPct: 20,
      archiveLabel: 'x',
    }, windSpeedKmh: 90 })
    // Wind is deliberately unscored — see the TODO in scoring.ts.
    expect(gale.value).toBe(calm.value)
    const windEvidence = gale.evidence.find((e) => e.label === 'Wind speed')
    expect(windEvidence?.value).toBe(90)
    expect(windEvidence?.source).toContain('not scored')
  })
})

describe('composite', () => {
  const make = (dimension: RiskDimension, value: number): RiskScore => ({
    dimension,
    value,
    band: bandFor(value),
    confidence: 'indicative',
    headline: '',
    evidence: [],
  })

  it('averages the four equally and names the driver', () => {
    const result = compositeRisk({
      heat: make('heat', 62),
      flood: make('flood', 78),
      air: make('air', 18),
      dryfire: make('dryfire', 51),
    })
    expect(result.composite).toBe(52)
    expect(result.dominant).toBe('flood')
    expect(result.band).toBe('elevated')
  })

  it('breaks ties deterministically in the documented order', () => {
    const result = compositeRisk({
      heat: make('heat', 50),
      flood: make('flood', 50),
      air: make('air', 50),
      dryfire: make('dryfire', 50),
    })
    expect(result.dominant).toBe('heat')
  })
})

describe('airScore missing-field handling', () => {
  it('treats an absent index as absent rather than painting NaN', () => {
    // The response guard accepts a missing field as well as a null one, so
    // undefined can reach here. It must fall through to the PM2.5 branch, not
    // produce Math.round(undefined).
    const score = airScore({ europeanAqi: null, usAqi: null, pm25: 12, pm10: null, ozone: null })
    expect(Number.isNaN(score.value)).toBe(false)
    expect(score.value).toBe(40)
  })

  it('shows the US index alongside the European one', () => {
    const score = airScore({ europeanAqi: 62, usAqi: 86, pm25: 18, pm10: 22, ozone: 53 })
    expect(score.value).toBe(62)
    const us = score.evidence.find((row) => row.label === 'US AQI, same air')
    expect(us?.value).toBe(86)
  })

  it('does not claim a grid cell size it cannot verify', () => {
    const score = airScore({ europeanAqi: 62, usAqi: 86, pm25: 18, pm10: 22, ozone: 53 })
    const eaqi = score.evidence.find((row) => row.label === 'European AQI')
    expect(eaqi?.source).not.toMatch(/45 km/)
    expect(eaqi?.source).toMatch(/not a sensor/)
  })
})
