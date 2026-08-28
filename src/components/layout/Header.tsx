import { Sprout } from 'lucide-react'

/**
 * The Verge wordmark and the one-line tagline.
 *
 * Sticky, quiet, and out of the way — the header is not the product, the risk
 * profile is. It stays legible over content because of the blur, not because
 * of a heavy bar.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4 md:px-8">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-quiet"
          aria-hidden="true"
        >
          <Sprout className="h-4 w-4 text-accent" />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-zinc-100">Verge</p>
          <p className="truncate text-xs text-zinc-500">
            Climate adaptation that starts at your front door
          </p>
        </div>
      </div>
    </header>
  )
}
