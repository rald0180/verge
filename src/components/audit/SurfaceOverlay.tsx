import { Card } from '../ui/Card'
import { cx } from '../../lib/format'
import type { SurfaceFinding } from '../../lib/types'

interface SurfaceOverlayProps {
  /** Object URL for the photo the user dropped in. */
  readonly previewUrl: string
  readonly surfaces: readonly SurfaceFinding[]
}

/**
 * The photo, with what the model believes it can see listed beside it.
 *
 * The findings are a model's estimate of surface composition, not a
 * segmentation mask, so they are rendered as a labelled list under the image
 * rather than as boxes drawn on top of it. Drawing boxes we cannot actually
 * locate would be a fabricated overlay — CLAUDE.md section 5.
 */
const ROLE_STYLES: Readonly<Record<SurfaceFinding['thermalRole'], string>> = {
  absorbs: 'bg-risk-high',
  reflects: 'bg-risk-moderate',
  cools: 'bg-risk-low',
}

const ROLE_LABELS: Readonly<Record<SurfaceFinding['thermalRole'], string>> = {
  absorbs: 'Holds heat',
  reflects: 'Reflects heat',
  cools: 'Cools actively',
}

export function SurfaceOverlay({ previewUrl, surfaces }: SurfaceOverlayProps) {
  return (
    <Card padded={false}>
      <div className="overflow-hidden rounded-2xl">
        <img
          src={previewUrl}
          alt="The street, yard or balcony you uploaded"
          className="h-64 w-full object-cover"
        />
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Surfaces detected
        </p>

        <ul className="space-y-3">
          {surfaces.map((surface) => (
            <li key={surface.kind} className="flex items-center gap-4">
              <span
                className={cx('h-2 w-2 shrink-0 rounded-full', ROLE_STYLES[surface.thermalRole])}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-zinc-100">{surface.label}</span>
              <span className="text-sm text-zinc-400">
                about {Math.round(surface.coveragePct)}% of frame
              </span>
              <span className="hidden text-xs uppercase tracking-widest text-zinc-500 sm:inline">
                {ROLE_LABELS[surface.thermalRole]}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-zinc-500">
          Coverage figures are a vision model’s estimate from a single photograph, not a
          survey measurement.
        </p>
      </div>
    </Card>
  )
}
