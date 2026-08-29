/**
 * Presentation helpers. Labels, units, and the one place where a risk band is
 * turned into a Tailwind class.
 *
 * Keeping the band -> class map here means the five reserved risk colours from
 * CLAUDE.md section 4 appear in exactly one file. Components ask for a class,
 * they never write `text-risk-severe` themselves.
 *
 * Tailwind scans this file (see `content` in tailwind.config.js), so every
 * class below must be a complete literal string, never an interpolation.
 */

import type {
  BudgetBand,
  Confidence,
  DwellingType,
  RiskBand,
  RiskDimension,
  Tenure,
} from './types'

export interface BandStyle {
  readonly label: string
  /** Text colour, e.g. for the number inside a dial. */
  readonly text: string
  /** Solid fill, e.g. for a dot or a chart series. */
  readonly fill: string
  /** Quiet background for pills and badges. */
  readonly chip: string
  /** SVG stroke for the dial arc. */
  readonly stroke: string
  /** Raw hex, for recharts and SVG attributes that will not take a class. */
  readonly hex: string
}

export const BAND_STYLES: Readonly<Record<RiskBand, BandStyle>> = {
  low: {
    label: 'Low',
    text: 'text-risk-low',
    fill: 'bg-risk-low',
    chip: 'bg-risk-low/10 text-risk-low',
    stroke: 'stroke-risk-low',
    hex: '#34D399',
  },
  moderate: {
    label: 'Moderate',
    text: 'text-risk-moderate',
    fill: 'bg-risk-moderate',
    chip: 'bg-risk-moderate/10 text-risk-moderate',
    stroke: 'stroke-risk-moderate',
    hex: '#A3E635',
  },
  elevated: {
    label: 'Elevated',
    text: 'text-risk-elevated',
    fill: 'bg-risk-elevated',
    chip: 'bg-risk-elevated/10 text-risk-elevated',
    stroke: 'stroke-risk-elevated',
    hex: '#FBBF24',
  },
  high: {
    label: 'High',
    text: 'text-risk-high',
    fill: 'bg-risk-high',
    chip: 'bg-risk-high/10 text-risk-high',
    stroke: 'stroke-risk-high',
    hex: '#F97316',
  },
  severe: {
    label: 'Severe',
    text: 'text-risk-severe',
    fill: 'bg-risk-severe',
    chip: 'bg-risk-severe/10 text-risk-severe',
    stroke: 'stroke-risk-severe',
    hex: '#EF4444',
  },
}

export interface DimensionMeta {
  readonly label: string
  /** One line explaining what the dial is measuring. */
  readonly blurb: string
}

export const DIMENSION_META: Readonly<Record<RiskDimension, DimensionMeta>> = {
  heat: {
    label: 'Heat',
    blurb: 'Extreme heat days now, and how many are coming by 2050.',
  },
  flood: {
    label: 'Flood',
    blurb: 'Where this spot sits in the local landscape, and how hard it rains.',
  },
  air: {
    label: 'Air',
    blurb: 'What is in the air at this coordinate right now.',
  },
  dryfire: {
    label: 'Drought & fire',
    blurb: 'How long the dry runs get, and today’s fire weather.',
  },
}

export const CONFIDENCE_LABELS: Readonly<Record<Confidence, string>> = {
  observed: 'Measured',
  modelled: 'Modelled',
  indicative: 'Indicative estimate',
}

export const DWELLING_LABELS: Readonly<Record<DwellingType, string>> = {
  house: 'House',
  apartment: 'Apartment',
  sharehouse: 'Sharehouse',
}

export const TENURE_LABELS: Readonly<Record<Tenure, string>> = {
  own: 'I own it',
  rent: 'I rent it',
}

export const BUDGET_LABELS: Readonly<Record<BudgetBand, string>> = {
  'under-100': 'Under $100',
  '100-500': '$100 – $500',
  '500-2000': '$500 – $2,000',
  'over-2000': 'Over $2,000',
}

/** "$120" / "$1,400". Whole dollars — cents are noise on an estimate. */
export function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** "$120 – $400", always with the estimate framing applied by the caller. */
export function formatCostRange(low: number, high: number): string {
  if (low === high) return formatAud(low)
  return `${formatAud(low)} – ${formatAud(high)}`
}

/** "2 hours" / "30 minutes" / "1 day". */
export function formatEffort(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`
  if (hours < 8) return hours === 1 ? '1 hour' : `${Math.round(hours)} hours`
  const days = hours / 8
  return days <= 1 ? '1 day' : `${Math.round(days)} days`
}

/** "31 days" — a number never appears in the UI without its unit. */
export function formatWithUnit(value: number, unit: string): string {
  return `${new Intl.NumberFormat('en-AU').format(value)} ${unit}`
}

/** Shorten a Nominatim display name to something a heading can hold. */
export function shortenPlace(displayName: string, parts = 3): string {
  return displayName.split(',').slice(0, parts).join(',').trim()
}

/**
 * Join class names, dropping anything falsy.
 *
 * This lives in format.ts rather than a new `cx.ts` so the lib folder stays
 * exactly as CLAUDE.md section 3 specifies it. Every primitive uses it, which
 * is what keeps variant classes readable instead of nested ternaries in JSX.
 */
export function cx(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
