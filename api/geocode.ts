import type { VercelRequest, VercelResponse } from '@vercel/node'

import { fail, ok } from '../src/lib/types.js'
import type { ApiResult, GeocodeResult, NominatimPlace } from '../src/lib/types.js'

/**
 * GET /api/geocode?q=... — address lookup, proxied.
 *
 * This route exists for one reason. Nominatim's usage policy asks for a
 * descriptive `User-Agent` identifying the application, and `User-Agent` is a
 * forbidden header name in browsers — `fetch` silently drops it. A client-side
 * call therefore cannot comply, no matter what headers the code appears to set.
 * Here on the server it can, and does.
 *
 * Two other things this buys us:
 *   - The response is cached at the CDN edge, so a repeated query never reaches
 *     Nominatim at all. That is the single most effective way to stay inside
 *     their rate limit.
 *   - The Nominatim wire format is normalised into our own GeocodeResult here,
 *     so the browser never sees `place_id` or `display_name` and the client
 *     stays ignorant of the provider.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

/**
 * Identifies the app and gives a way to reach whoever runs it, which is what
 * the policy actually asks for. Not an invented email address.
 */
const USER_AGENT =
  'Verge/0.1 (hyperlocal climate adaptation; https://verge-ebon.vercel.app)'

const MAX_RESULTS = 5
const MAX_QUERY_LENGTH = 200

function isNominatimPlace(value: unknown): value is NominatimPlace {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.place_id === 'number' &&
    typeof candidate.lat === 'string' &&
    typeof candidate.lon === 'string' &&
    typeof candidate.display_name === 'string'
  )
}

function toGeocodeResult(place: NominatimPlace): GeocodeResult | null {
  const latitude = Number.parseFloat(place.lat)
  const longitude = Number.parseFloat(place.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const parts = place.display_name.split(',').map((part) => part.trim())
  const shortName = parts.slice(0, 2).join(', ') || place.display_name
  const country = parts.length > 0 ? (parts[parts.length - 1] ?? null) : null

  return {
    coordinates: { latitude, longitude },
    displayName: place.display_name,
    shortName,
    osmId: String(place.place_id),
    country,
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  if (request.method !== 'GET') {
    const body: ApiResult<readonly GeocodeResult[]> = fail('invalid-input', 'Use GET.')
    response.status(405).json(body)
    return
  }

  const raw = request.query.q
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''

  if (query.length < 3) {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'invalid-input',
      'Type at least three characters of an address.',
    )
    response.status(400).json(body)
    return
  }

  const url = new URL(ENDPOINT)
  url.searchParams.set('q', query.slice(0, MAX_QUERY_LENGTH))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', String(MAX_RESULTS))

  let upstream: Response
  try {
    upstream = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
  } catch {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'network',
      'Could not reach the address service.',
      { retryable: true },
    )
    response.status(502).json(body)
    return
  }

  if (upstream.status === 429) {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'rate-limited',
      'Too many address lookups right now. Wait a moment, then try again.',
      { retryable: true, status: 429 },
    )
    response.status(429).json(body)
    return
  }

  if (!upstream.ok) {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'upstream',
      'The address service is not responding right now.',
      { retryable: true, status: upstream.status },
    )
    response.status(502).json(body)
    return
  }

  let payload: unknown
  try {
    payload = await upstream.json()
  } catch {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'bad-response',
      'The address service returned something unreadable.',
    )
    response.status(502).json(body)
    return
  }

  if (!Array.isArray(payload)) {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'bad-response',
      'The address service returned something unreadable.',
    )
    response.status(502).json(body)
    return
  }

  const results = payload
    .filter(isNominatimPlace)
    .map(toGeocodeResult)
    .filter((result): result is GeocodeResult => result !== null)

  if (results.length === 0) {
    const body: ApiResult<readonly GeocodeResult[]> = fail(
      'not-found',
      `No address matched “${query}”. Try adding a suburb.`,
    )
    // A miss is cached too, briefly. Retyping a typo should not re-hit Nominatim.
    response.setHeader('Cache-Control', 'public, s-maxage=300')
    response.status(404).json(body)
    return
  }

  // A street address does not move. Cache hard at the edge.
  response.setHeader(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=604800',
  )
  const body: ApiResult<readonly GeocodeResult[]> = ok(results)
  response.status(200).json(body)
}
