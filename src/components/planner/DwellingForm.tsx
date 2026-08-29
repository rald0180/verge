import { useState } from 'react'

import { BUDGET_LABELS, DWELLING_LABELS, TENURE_LABELS } from '../../lib/format'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { BudgetBand, DwellingProfile, DwellingType, Tenure } from '../../lib/types'

interface DwellingFormProps {
  readonly onSubmit: (profile: DwellingProfile) => void
  readonly loading?: boolean
  readonly disabled?: boolean
}

const DWELLING_TYPES: readonly DwellingType[] = ['house', 'apartment', 'sharehouse']
const TENURES: readonly Tenure[] = ['own', 'rent']
const BUDGETS: readonly BudgetBand[] = ['under-100', '100-500', '500-2000', 'over-2000']

interface ChoiceRowProps<T extends string> {
  readonly label: string
  readonly options: readonly T[]
  readonly labels: Readonly<Record<T, string>>
  readonly value: T
  readonly onChange: (value: T) => void
  readonly disabled: boolean
}

/**
 * A segmented choice built out of the Button primitive rather than a `<select>`.
 * CLAUDE.md section 4 allows exactly the primitives in `ui/`, and three taps
 * beats three dropdowns on a phone anyway.
 */
function ChoiceRow<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  disabled,
}: ChoiceRowProps<T>) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 w-full text-center text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </legend>
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={option === value ? 'primary' : 'ghost'}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {labels[option]}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Three questions, nothing more. Scope is locked in CLAUDE.md section 2, and
 * every extra field here is a field a judge watches someone fill in.
 */
export function DwellingForm({
  onSubmit,
  loading = false,
  disabled = false,
}: DwellingFormProps) {
  const [type, setType] = useState<DwellingType>('house')
  const [tenure, setTenure] = useState<Tenure>('own')
  const [budget, setBudget] = useState<BudgetBand>('100-500')

  return (
    <Card>
      <div className="space-y-6">
        <ChoiceRow
          label="What do you live in"
          options={DWELLING_TYPES}
          labels={DWELLING_LABELS}
          value={type}
          onChange={setType}
          disabled={disabled || loading}
        />
        <ChoiceRow
          label="Do you own it"
          options={TENURES}
          labels={TENURE_LABELS}
          value={tenure}
          onChange={setTenure}
          disabled={disabled || loading}
        />
        <ChoiceRow
          label="What can you spend"
          options={BUDGETS}
          labels={BUDGET_LABELS}
          value={budget}
          onChange={setBudget}
          disabled={disabled || loading}
        />

        <div className="flex flex-col items-center gap-4 pt-2">
          <Button
            loading={loading}
            disabled={disabled}
            onClick={() => onSubmit({ type, tenure, budget })}
          >
            Build my plan
          </Button>
          <p className="text-sm text-zinc-400">
            {tenure === 'rent'
              ? 'Renting, so the plan will only include things you can do without the owner’s permission.'
              : 'Owning, so the plan can include changes to the building itself.'}
          </p>
        </div>
      </div>
    </Card>
  )
}
