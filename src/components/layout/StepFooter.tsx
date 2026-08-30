import { ArrowLeft, ArrowRight } from 'lucide-react'

import { Button } from '../ui/Button'

interface StepFooterProps {
  readonly onBack?: () => void
  readonly onNext?: () => void
  readonly nextLabel?: string
  /** Why the next button is disabled, e.g. "Check an address first." */
  readonly nextBlockedReason?: string
}

/**
 * Back and continue, at the bottom of every step.
 *
 * The blocked reason is rendered rather than left to a disabled button alone:
 * a greyed-out control with no explanation is the most common way a wizard
 * strands somebody.
 */
export function StepFooter({ onBack, onNext, nextLabel = 'Continue', nextBlockedReason }: StepFooterProps) {
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <div className="flex items-center justify-center gap-3">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        ) : null}

        {onNext ? (
          <Button onClick={onNext} disabled={Boolean(nextBlockedReason)}>
            {nextLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {nextBlockedReason ? (
        <p className="text-xs text-zinc-500">{nextBlockedReason}</p>
      ) : null}
    </div>
  )
}
