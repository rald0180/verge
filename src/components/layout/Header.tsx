import { Sprout } from 'lucide-react'

/**
 * The Verge wordmark.
 *
 * Sticky and centred. The tagline used to sit under the name here, but it is
 * already the hero line on the page below — repeating it in the header meant
 * reading the same sentence twice before seeing anything.
 *
 * Mark and wordmark are sized to be legible rather than apologetic, while the
 * bar stays light: it holds its place with the blur, not with weight.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-6 md:px-8">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-quiet"
          aria-hidden="true"
        >
          <Sprout className="h-6 w-6 text-accent" />
        </span>

        <p className="text-2xl font-semibold tracking-tight text-zinc-100">Verge</p>
      </div>
    </header>
  )
}
