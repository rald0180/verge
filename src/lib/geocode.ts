/**
 * Address -> coordinate, through our own /api/geocode proxy.
 *
 * The browser no longer talks to Nominatim directly. It cannot: their usage
 * policy asks for a descriptive `User-Agent`, and that is a forbidden header
 * name in browsers, so `fetch` drops it. api/geocode.ts sets it properly and
 * caches the answer at the CDN edge.
 *
 * NOTE ON RATE LIMITING. Phase 1 had a 1.1 second gap enforced in this module.
 * It has been removed, because it never did what it claimed to. A client-side
 * throttle only serialises one browser tab; two visitors on two machines would
 * sail straight past it. What actually keeps us inside Nominatim's limit is the
 * edge cache on the proxy — a repeated lookup never reaches them at all — plus
 * the fact that this UI issues one lookup per deliberate button press. If this
 * app ever saw real traffic it would need a server-side token bucket, which is
 * logged in BACKLOG.md rather than pretended at here.
 *
 * The in-memory cache below stays. It makes retyping the same address free and
 * saves a round trip to our own function.
 */

import { fail } from './types'
import type { ApiResult, GeocodeResult } from './types'

const ENDPOINT = '/api/geocode'

const cache = new Map<string, readonly GeocodeResult[]>()

function normaliseQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isGeocodeResult(value: unknown): value is GeocodeResult {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  const coordinates = candidate.coordinates
  if (typeof coordinates !== 'object' || coordinates === null) return false
  const point = coordinates as Record<string, unknown>
  return (
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number' &&
    typeof candidate.displayName === 'string' &&
    typeof candidate.shortName === 'string' &&
    typeof candidate.osmId === 'string'
  )
}

/**
 * Look up an address. Returns at most five candidates, best match first.
 *
 * Failure modes, all handled before the happy path:
 *   - query under three characters -> invalid-input, no request made
 *   - the proxy is unreachable     -> network, retryable
 *   - the proxy returns a typed    -> passed straight through, so the message
 *     ApiResult error                 the user sees is the one the server wrote
 *   - the proxy returns 2xx with a -> bad-response
 *     payload that is not our shape
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<ApiResult<readonly GeocodeResult[]>> {
  const key = normaliseQuery(query)

  if (key.length < 3) {
    return fail('invalid-input', 'Type at least three characters of an address.')
  }

  const cached = cache.get(key)
  if (cached) return { ok: true, data: cached }

  const url = `${ENDPOINT}?q=${encodeURIComponent(key)}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    })
  } catch {
    if (signal?.aborted) return fail('network', 'Search cancelled.')
    return fail('network', 'Could not reach the address service.', { retryable: true })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return fail('bad-response', 'The address service returned something unreadable.')
  }

  if (typeof payload !== 'object' || payload === null || !('ok' in payload)) {
    return fail('bad-response', 'The address service returned an unexpected shape.')
  }

  const result = payload as ApiResult<unknown>

  // The server already wrote a typed, user-safe error. Do not rewrite it.
  if (!result.ok) return result

  if (!Array.isArray(result.data) || !result.data.every(isGeocodeResult)) {
    return fail('bad-response', 'The address service returned an unexpected shape.')
  }

  const results: readonly GeocodeResult[] = result.data
  cache.set(key, results)
  return { ok: true, data: results }
}

/** Drop the in-memory cache. Exposed for tests. */
export function clearGeocodeCache(): void {
  cache.clear()
}
