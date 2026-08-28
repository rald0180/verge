import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Button } from './Button'
import type { ApiError } from '../../lib/types'

interface ErrorStateProps {
  readonly error: ApiError
  /** Shown only when the error is retryable. */
  readonly onRetry?: () => void
  /** Overrides the default heading, e.g. "That address did not resolve". */
  readonly title?: string
}

const DEFAULT_TITLES: Readonly<Record<ApiError['kind'], string>> = {
  'invalid-input': 'Check that input',
  'not-found': 'Nothing found there',
  'rate-limited': 'Slow down a moment',
  network: 'No connection',
  upstream: 'That service is down',
  'bad-response': 'Unexpected data',
  'too-large': 'That file is too big',
  'not-implemented': 'Not wired up yet',
}

/**
 * The only error surface in the project. Every fetching component renders this
 * on the failure branch — CLAUDE.md section 3, hard rule 3.
 *
 * Retry is offered only when the error says it is worth retrying. Offering a
 * retry button for a 404 teaches people the button does nothing.
 */
export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-2xl bg-surface p-6 ring-1 ring-white/10 md:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-risk-severe/10">
          <AlertTriangle className="h-4 w-4 text-risk-severe" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-medium text-zinc-100">
            {title ?? DEFAULT_TITLES[error.kind]}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">{error.message}</p>
        </div>
      </div>

      {error.retryable && onRetry ? (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
