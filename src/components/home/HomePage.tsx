import { ImagePlus, ListChecks, MapPin } from 'lucide-react'
import type { ComponentType } from 'react'

import { AddressSearch } from '../lens/AddressSearch'
import { Card } from '../ui/Card'

interface HomePageProps {
  readonly onSearch: (query: string) => void
  readonly loading?: boolean
  readonly error?: string
}

interface StepPreview {
  readonly icon: ComponentType<{ className?: string }>
  readonly label: string
  readonly line: string
}

/**
 * What the address buys you, in three lines.
 *
 * Kept to a noun phrase and one short sentence each. The long explanations
 * that used to sit on the first screen were removed on purpose — a front door
 * that has to be read before it can be used is not a front door.
 */
const PREVIEW: readonly StepPreview[] = [
  {
    icon: MapPin,
    label: 'Your risk',
    line: 'Heat, flood, air and fire weather, scored for your coordinate.',
  },
  {
    icon: ListChecks,
    label: 'Your plan',
    line: 'Five ranked actions with cost and effort. Renters get renter-legal ones.',
  },
  {
    icon: ImagePlus,
    label: 'Your street',
    line: 'A photo becomes a cooling score and three specific changes.',
  },
]

/**
 * The front door.
 *
 * One job: take an address. Everything else on this page exists to make that
 * field look worth using, which is why the three-step preview is three short
 * lines rather than a feature tour.
 *
 * It is NOT a numbered step. The progress rail is hidden here and the flow
 * still has four steps — this is the page you start from, and counting it
 * would make a four-step wizard look like a five-step one. Scope is unchanged:
 * CLAUDE.md section 2 locks three features, and this presents them rather than
 * adding a fourth.
 */
export function HomePage({ onSearch, loading = false, error }: HomePageProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-4 text-center md:pt-10">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-100 md:text-6xl">
          Climate adaptation that starts at your front door
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-accent-text md:text-base">
          Climate reports tell you the planet is in trouble. Verge tells you what to do
          about your house.
        </p>
      </section>

      <Card>
        <AddressSearch
          onSearch={onSearch}
          loading={loading}
          {...(error ? { error } : {})}
        />
      </Card>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PREVIEW.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Card>
                <div className="flex h-full flex-col items-center gap-3 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-quiet">
                    <Icon className="h-5 w-5 text-accent" />
                  </span>
                  <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                  <p className="text-sm text-zinc-400">{item.line}</p>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      <p className="text-center text-xs text-zinc-500">
        Built on live observational and projection data. Nothing is stored, and no
        account is needed.
      </p>
    </div>
  )
}
