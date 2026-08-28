import type { VercelRequest, VercelResponse } from '@vercel/node'

import { fail } from '../src/lib/types.js'
import type { ApiResult, AuditRequest, CoolingAudit } from '../src/lib/types.js'

/**
 * POST /api/audit — street photo in, cooling score out.
 *
 * Phase 1 ships the contract and the guard rails: method check, shape check,
 * media-type check, and a hard size ceiling so an oversized upload is refused
 * here rather than forwarded to the model. The vision call lands in Phase 4.
 */

/**
 * 5.5 MB of base64, which is roughly a 4 MB image. The client refuses anything
 * over 4 MB before encoding; this is the server-side backstop for a caller that
 * did not.
 */
const MAX_BASE64_BYTES = 5_500_000

const MEDIA_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseAuditRequest(body: unknown): AuditRequest | 'too-large' | null {
  if (!isObject(body)) return null

  const { imageBase64, mediaType } = body
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) return null
  if (typeof mediaType !== 'string' || !MEDIA_TYPES.includes(mediaType)) return null
  if (imageBase64.length > MAX_BASE64_BYTES) return 'too-large'

  return {
    imageBase64,
    mediaType: mediaType as AuditRequest['mediaType'],
  }
}

export default function handler(request: VercelRequest, response: VercelResponse): void {
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

  // TODO (Phase 4): send the image to Claude with a strict JSON schema, parse
  // inside a try/catch, validate against CoolingAudit, and attach the published
  // urban heat island ranges cited in README.md to each intervention. The
  // cooling figures come from the literature, not from the model.
  const body: ApiResult<CoolingAudit> = fail(
    'not-implemented',
    'The street audit is not wired up yet. It arrives in Phase 4.',
  )
  response.status(501).json(body)
}
