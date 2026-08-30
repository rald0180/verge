import type { ReactNode } from 'react'

import { Header } from './Header'

interface AppShellProps {
  readonly children: ReactNode
}

/**
 * Page frame: sticky header, one centred max-w-5xl column, honest footer.
 *
 * The footer carries the two disclosures CLAUDE.md section 7 requires to be
 * visible in the product itself and not only in the README.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* text-align inherits, so centring here carries to every descendant.
          Flex rows that lay out horizontally are centred individually. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 text-center md:px-8 md:py-12">
        <div className="space-y-8">{children}</div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-5xl space-y-2 px-6 py-8 text-center text-xs text-zinc-500 md:px-8">
          <p>
            Verge reads live data from Open-Meteo and OpenStreetMap. Flood figures are
            indicative estimates built from elevation and rainfall history, not a
            substitute for an official flood map. Costs are estimates in USD.
          </p>
        </div>
      </footer>
    </div>
  )
}
