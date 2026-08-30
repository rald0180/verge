import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, ListChecks } from 'lucide-react'

import { ActionCard } from './ActionCard'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import { apiError } from '../../lib/types'
import type { AdaptationPlan, ApiError } from '../../lib/types'

interface PlanListProps {
  readonly plan?: AdaptationPlan
  readonly loading?: boolean
  readonly error?: ApiError
  readonly onRetry?: () => void
}

/** Cards stagger in at 40 ms intervals — CLAUDE.md section 4. */
const STAGGER_SECONDS = 0.04

/**
 * Build the PDF in the browser and hand it to the user as a download.
 *
 * Both @react-pdf/renderer and PlanPdf are imported lazily inside the click
 * handler. The library is by far the heaviest dependency in the project and
 * almost nobody who loads the page will click this, so it has no business in
 * the bundle everyone downloads.
 */
async function downloadPlanPdf(plan: AdaptationPlan): Promise<void> {
  // BOTH imports must be dynamic. PlanPdf imports @react-pdf/renderer at module
  // scope, so a static `import { PlanPdf }` here would drag the whole library
  // into the main bundle no matter how lazily this function loads it — which is
  // exactly what happened the first time, tripling the bundle.
  const [{ pdf }, { PlanPdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./PlanPdf'),
  ])
  const blob = await pdf(<PlanPdf plan={plan} />).toBlob()
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `verge-plan-${plan.placeName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Seconds elapsed, ticking, while the plan is being written.
 *
 * WHY A COUNTER AND NOT A PROGRESS BAR. The request takes about twenty
 * seconds, measured, and nothing in the response says how far through it is —
 * a bar would have to invent its own position, which is a fabricated number
 * wearing a different hat. An honest elapsed count against a stated typical
 * duration does the real job: it says the app is alive and roughly how much
 * longer.
 *
 * Its own component because the loading branch returns early, and a hook
 * cannot live behind a condition.
 */
function ElapsedNote() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-sm text-zinc-400">
        Reading your risk profile and working out what is worth doing.
      </p>
      <p className="text-xs uppercase tracking-widest text-zinc-500">
        {seconds}s elapsed · usually about 20
      </p>
    </div>
  )
}

export function PlanList({ plan, loading = false, error, onRetry }: PlanListProps) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<ApiError | undefined>(undefined)

  async function handleExport() {
    if (!plan) return
    setExporting(true)
    setExportError(undefined)
    try {
      await downloadPlanPdf(plan)
    } catch {
      setExportError(apiError('bad-response', 'The PDF could not be generated in this browser.'))
    } finally {
      setExporting(false)
    }
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        {...(onRetry ? { onRetry } : {})}
        title="Could not build a plan"
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <ElapsedNote />
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <div className="space-y-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!plan) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-quiet">
            <ListChecks className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
          <p className="max-w-md text-sm text-zinc-400">
            Answer the three questions above and Verge will rank what is actually worth doing
            at this address, most effective first.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/*
        plan.summary is deliberately NOT rendered here. It is two model-written
        sentences restating the risk profile the user has just read on step one,
        and on screen it read as padding above the actions. It is still
        generated and still goes into the exported PDF, where a document opened
        cold does need a line of orientation.
      */}
      <div className="flex flex-col items-center gap-4">
        <Button variant="ghost" size="sm" loading={exporting} onClick={() => void handleExport()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Save as PDF
        </Button>
      </div>

      {exportError ? <ErrorState error={exportError} title="Export failed" /> : null}

      {plan.actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: index * STAGGER_SECONDS }}
        >
          <ActionCard action={action} />
        </motion.div>
      ))}

    </div>
  )
}
