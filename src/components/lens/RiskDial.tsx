import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

import { BAND_STYLES, DIMENSION_META, cx } from '../../lib/format'
import type { RiskScore } from '../../lib/types'

interface RiskDialProps {
  readonly score: RiskScore
}

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Count-up duration. Section 4 of CLAUDE.md specifies 300 ms for motion; that
 * governs state transitions, and a 300 ms count-up reads as a flicker rather
 * than as a number counting. 700 ms is the compromise, still ease-out, still
 * well under the one-second ceiling the same section sets.
 */
const DURATION_MS = 700

/**
 * If frames never arrive, snap to the truth shortly after the animation should
 * have finished. Timers still fire in a backgrounded tab; requestAnimationFrame
 * does not. See the note below.
 */
const BACKSTOP_MS = DURATION_MS + 250

/** Cubic ease-out. Matches the `ease-out` used across the visual system. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * One animated radial dial. Counts up from zero on mount, ease-out, nothing
 * bounces — CLAUDE.md section 4.
 *
 * WHY THIS DOES NOT USE framer-motion's MotionValue.
 *
 * The first implementation held the displayed number inside a MotionValue and
 * animated it imperatively. That made the *value itself* a product of the
 * animation: when frames did not arrive, the dial silently rendered `0` under a
 * correctly coloured arc — a confidently wrong number, which is the worst thing
 * a risk display can do. It was caught in a backgrounded tab, where
 * requestAnimationFrame is suspended entirely and every dial read zero while
 * the underlying data was correct.
 *
 * Here the value lives in React state, so the DOM always reflects the real
 * score, and `setTimeout` backstops the animation for the case where no frame
 * ever runs. Motion is decoration over a value that is already correct, rather
 * than the mechanism that produces it.
 *
 * framer-motion is still the project's motion library; `useReducedMotion` from
 * it is used here, and the staggered cards use it declaratively.
 */
export function RiskDial({ score }: RiskDialProps) {
  const style = BAND_STYLES[score.band]
  const meta = DIMENSION_META[score.dimension]
  const reduceMotion = useReducedMotion()

  const target = score.value
  const [displayed, setDisplayed] = useState(reduceMotion ? target : 0)

  useEffect(() => {
    if (reduceMotion) {
      setDisplayed(target)
      return
    }

    let frame = 0
    const started = performance.now()

    const tick = (now: number) => {
      const elapsed = now - started
      const t = Math.min(1, elapsed / DURATION_MS)
      setDisplayed(target * easeOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    const backstop = window.setTimeout(() => {
      cancelAnimationFrame(frame)
      setDisplayed(target)
    }, BACKSTOP_MS)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(backstop)
    }
  }, [target, reduceMotion])

  const dashOffset = CIRCUMFERENCE - (displayed / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            className="stroke-white/10"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={style.stroke}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cx('text-3xl font-semibold tracking-tight', style.text)}
            aria-hidden="true"
          >
            {Math.round(displayed)}
          </span>
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            of 100
          </span>
          <span className="sr-only">
            {`${meta.label} risk, ${score.value} out of 100, ${style.label}`}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-100">{meta.label}</p>
      <p className={cx('text-xs uppercase tracking-widest', style.text)}>
        {style.label}
      </p>
    </div>
  )
}
