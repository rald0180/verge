/**
 * The Verge lockup: front-door mark and wordmark, centred.
 *
 * The line underneath was tried here and taken out again — it is the page's
 * own h1 a few hundred pixels below, so the header was making everyone read
 * the same sentence twice before seeing anything.
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

/**
 * The header. Sits at the top of the document and scrolls away with it.
 *
 * It used to be `sticky top-0`, which held 61 px of every screen for a
 * wordmark the reader had already seen — expensive on a phone, where the whole
 * point of scrolling is to get more content into view. Static gives that back.
 *
 * The background stays OPAQUE. It was `bg-canvas/80` with an 8 px backdrop
 * blur, which let the page scroll visibly through the wordmark; that
 * translucency is what made a correctly-pinned header look like it was
 * sliding. The blur went with it, since blurring an opaque surface only costs
 * a compositing layer.
 */
export function Header() {
  return (
    <header className="border-b border-white/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-3 md:px-8">
        {/*
          The lockup is the way back to the front door. Every app does this, and
          without it the home page is unreachable once you are inside the flow —
          the progress rail only covers the four numbered steps.
        */}
        <a
          href="#home"
          aria-label="Verge home"
          className="flex items-center gap-1 rounded-2xl px-2 py-1 transition-colors duration-300 ease-out hover:bg-white/[0.03]"
        >
          <VergeMark className="h-9 w-9 shrink-0 text-accent" />

          <p className="text-3xl font-bold lowercase leading-none tracking-tight text-zinc-100">
            verge
          </p>
        </a>
      </div>
    </header>
  )
}
