import type { ReactNode } from 'react'

interface SectionHeadingProps {
  /** The small uppercase label above the title, e.g. "Step one". */
  readonly eyebrow: string
  readonly title: string
  /** One or two lines of plain-language support. */
  readonly description?: string
  /** Optional control aligned to the right on wide screens. */
  readonly action?: ReactNode
}

/** Every section on the page opens with one of these. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
