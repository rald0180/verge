import { Fragment } from 'react'
import { Check, Lock } from 'lucide-react'

import { cx } from '../../lib/format'
import { NAV_STEPS } from '../../hooks/useStep'
import type { NavStep, Step } from '../../hooks/useStep'

const LABELS: Readonly<Record<NavStep, string>> = {
  lens: 'Risk',
  plan: 'Plan',
  audit: 'Street',
  summary: 'Summary',
}

interface StepNavProps {
  readonly current: Step
  /** Steps the user is allowed to jump to. `lens` is always included. */
  readonly unlocked: readonly Step[]
  /**
   * Steps that actually produced something.
   *
   * Deliberately NOT "every step before this one". Both the planner and the
   * audit can be walked straight past, and ticking a step the user skipped
   * would have the summary claim work that was never done.
   */
  readonly completed: readonly Step[]
  readonly onGo: (step: Step) => void
}

/**
 * The four-step progress rail.
 *
 * Doubles as navigation: any unlocked step is clickable, so someone who wants
 * to change their address does not have to walk forward through the whole flow
 * again. Locked steps are rendered but disabled rather than hidden — seeing
 * what is coming is most of what makes a wizard feel finite.
 */
export function StepNav({ current, unlocked, completed, onGo }: StepNavProps) {
  return (
    <nav aria-label="Progress" className="mx-auto w-full max-w-xl">
      <ol className="flex items-start justify-center">
        {NAV_STEPS.map((step, index) => {
          const isCurrent = step === current
          const isDone = completed.includes(step)
          const isUnlocked = unlocked.includes(step)
          const previous = NAV_STEPS[index - 1]
          const connectorLit = previous !== undefined && completed.includes(previous)

          return (
            <Fragment key={step}>
              {index > 0 ? (
                <li
                  aria-hidden="true"
                  className={cx(
                    'mt-4 h-px min-w-4 flex-1 transition-colors duration-300 ease-out',
                    connectorLit ? 'bg-accent/40' : 'bg-white/10',
                  )}
                />
              ) : null}

              <li>
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => onGo(step)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cx(
                    'flex w-20 flex-col items-center gap-2 rounded-2xl px-1 py-1',
                    'transition-colors duration-300 ease-out',
                    isUnlocked && !isCurrent && 'hover:bg-white/[0.03]',
                    !isUnlocked && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                      'ring-1 transition-colors duration-300 ease-out',
                      isCurrent
                        ? 'bg-accent text-canvas ring-accent'
                        : isDone
                          ? 'bg-accent-quiet text-accent ring-accent/30'
                          : 'bg-white/[0.03] text-zinc-500 ring-white/10',
                    )}
                  >
                    {isDone && !isCurrent ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : isUnlocked ? (
                      index + 1
                    ) : (
                      <Lock className="h-3 w-3" aria-hidden="true" />
                    )}
                  </span>

                  <span
                    className={cx(
                      'text-xs uppercase tracking-widest',
                      isCurrent ? 'text-accent' : isDone ? 'text-zinc-400' : 'text-zinc-500',
                    )}
                  >
                    {LABELS[step]}
                  </span>
                </button>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
