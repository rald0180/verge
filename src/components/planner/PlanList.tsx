import { motion } from 'framer-motion'
import { ListChecks } from 'lucide-react'

import { ActionCard } from './ActionCard'
import { Card } from '../ui/Card'
import { ErrorState } from '../ui/ErrorState'
import { Skeleton } from '../ui/Skeleton'
import type { AdaptationPlan, ApiError } from '../../lib/types'

interface PlanListProps {
  readonly plan?: AdaptationPlan
  readonly loading?: boolean
  readonly error?: ApiError
  readonly onRetry?: () => void
}

/** Cards stagger in at 40 ms intervals — CLAUDE.md section 4. */
const STAGGER_SECONDS = 0.04

export function PlanList({ plan, loading = false, error, onRetry }: PlanListProps) {
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
            Answer the three questions above and Verge will rank what is actually worth
            doing at this address, cheapest real impact first.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{plan.summary}</p>

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
