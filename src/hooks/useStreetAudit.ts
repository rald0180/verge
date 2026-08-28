import { useCallback, useRef, useState } from 'react'

import { apiError } from '../lib/types'
import type { ApiError, ApiResult, AuditRequest, CoolingAudit } from '../lib/types'

export type StreetAuditState =
  | { readonly status: 'idle' }
  | { readonly status: 'analysing'; readonly previewUrl: string }
  | {
      readonly status: 'ready'
      readonly previewUrl: string
      readonly audit: CoolingAudit
    }
  | { readonly status: 'error'; readonly error: ApiError }

export interface UseStreetAudit {
  readonly state: StreetAuditState
  readonly analyse: (file: File, previewUrl: string) => Promise<void>
  readonly reset: () => void
}

const MEDIA_TYPES = new Set<AuditRequest['mediaType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function isAuditMediaType(value: string): value is AuditRequest['mediaType'] {
  return MEDIA_TYPES.has(value as AuditRequest['mediaType'])
}

/** Read a File as base64, without the `data:...;base64,` prefix. */
function toBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(null)
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        resolve(null)
        return
      }
      const comma = result.indexOf(',')
      resolve(comma === -1 ? null : result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * The Street Audit state machine.
 *
 * It posts to /api/audit for real. In Phase 1 that route validates the request
 * and answers with a typed `not-implemented` error, which the UI renders
 * through ErrorState like any other failure — the contract is exercised end to
 * end from day one, and the message on screen is true.
 */
export function useStreetAudit(): UseStreetAudit {
  const [state, setState] = useState<StreetAuditState>({ status: 'idle' })
  const previewRef = useRef<string | null>(null)

  const analyse = useCallback(async (file: File, previewUrl: string) => {
    if (previewRef.current && previewRef.current !== previewUrl) {
      URL.revokeObjectURL(previewRef.current)
    }
    previewRef.current = previewUrl

    if (!isAuditMediaType(file.type)) {
      setState({
        status: 'error',
        error: apiError('invalid-input', 'That file is not a JPEG, PNG or WebP image.'),
      })
      return
    }

    setState({ status: 'analysing', previewUrl })

    const imageBase64 = await toBase64(file)
    if (imageBase64 === null) {
      setState({
        status: 'error',
        error: apiError('bad-response', 'That photo could not be read from disk.'),
      })
      return
    }

    const body: AuditRequest = { imageBase64, mediaType: file.type }

    let response: Response
    try {
      response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      setState({
        status: 'error',
        error: apiError('network', 'Could not reach the audit service.', {
          retryable: true,
        }),
      })
      return
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      setState({
        status: 'error',
        error: apiError('bad-response', 'The audit service returned unreadable data.'),
      })
      return
    }

    const result = payload as ApiResult<CoolingAudit>
    if (typeof result !== 'object' || result === null || !('ok' in result)) {
      setState({
        status: 'error',
        error: apiError('bad-response', 'The audit service returned an unexpected shape.'),
      })
      return
    }

    if (!result.ok) {
      setState({ status: 'error', error: result.error })
      return
    }

    setState({ status: 'ready', previewUrl, audit: result.data })
  }, [])

  const reset = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
      previewRef.current = null
    }
    setState({ status: 'idle' })
  }, [])

  return { state, analyse, reset }
}
