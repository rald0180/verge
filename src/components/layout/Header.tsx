/**
 * The Verge lockup: front-door mark, wordmark, and the line underneath.
 *
 * The mark is a threshold standing on a ground line with something growing
 * inside it — "climate adaptation that starts at your front door", drawn. It is
 * built from the palette in CLAUDE.md section 4 rather than new colours: the
 * arch is the accent, the sprout is the lighter accent text tone, and the
 * ground is the accent at low opacity.
 *
 * Drawn inline rather than pulled from lucide because no icon set has this
 * shape, and the mark needs three tones in one glyph.
 */
function VergeMark({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Verge"
    >
      {/* ground line */}
      <path
        d="M2.5 28h27"
        stroke="currentColor"
        strokeOpacity="0.32"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* the doorway */}
      <path
        d="M7.5 28V13.5a8.5 8.5 0 0 1 17 0V28"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* what grows in the doorway */}
      <g className="text-accent-text">
        <path
          d="M16 28V15.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M16.2 19.2c0-2.7 2.2-4.9 4.9-4.9 0 2.7-2.2 4.9-4.9 4.9z" fill="currentColor" />
        <path d="M15.8 22.2c0-2.3-1.9-4.2-4.2-4.2 0 2.3 1.9 4.2 4.2 4.2z" fill="currentColor" />
      </g>
    </svg>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-6 py-5 md:px-8">
        <VergeMark className="h-12 w-12 shrink-0 text-accent" />

        <div className="text-left">
          <p className="text-3xl font-medium lowercase leading-none tracking-tight text-zinc-100">
            verge
          </p>
          <p className="mt-1 text-sm lowercase text-accent-text">
            climate adaptation that starts at your front door
          </p>
        </div>
      </div>
    </header>
  )
}
