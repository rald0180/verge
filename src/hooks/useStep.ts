import { useCallback, useEffect, useState } from 'react'

/** The four pages of the flow, in order. */
export const STEPS = ['lens', 'plan', 'audit', 'summary'] as const

export type Step = (typeof STEPS)[number]

function isStep(value: string): value is Step {
  return (STEPS as readonly string[]).includes(value)
}

function readHash(): Step {
  if (typeof window === 'undefined') return 'lens'
  const raw = window.location.hash.replace(/^#/, '')
  return isStep(raw) ? raw : 'lens'
}

export interface UseStep {
  readonly step: Step
  readonly index: number
  readonly go: (step: Step) => void
}

/**
 * Which page of the flow we are on, mirrored into the URL hash.
 *
 * WHY THE HASH RATHER THAN PLAIN STATE.
 *
 * Turning the single scrolling page into four pages takes the browser's back
 * button away from the user: on a phone, back would leave the app entirely
 * rather than returning to the previous step, which is exactly what someone
 * opening a link for the first time will press. Mirroring the step into the
 * hash restores back and forward for free, and makes a half-finished session
 * survive a refresh.
 *
 * A router would also do this, but it is a dependency and a build config for
 * one piece of state that is already an enum. CLAUDE.md section 2 locks the
 * scope; this is the smaller thing that works.
 */
export function useStep(): UseStep {
  const [step, setStep] = useState<Step>(readHash)

  useEffect(() => {
    const onHashChange = () => setStep(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const go = useCallback((next: Step) => {
    // Let the hashchange listener set state, so the URL is always the source of
    // truth and the two cannot drift apart.
    window.location.hash = next
    // Moving to a new page should start at its top, like a real page load.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { step, index: STEPS.indexOf(step), go }
}
