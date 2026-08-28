import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'

import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ErrorState } from '../ui/ErrorState'
import { cx } from '../../lib/format'
import { apiError } from '../../lib/types'
import type { ApiError } from '../../lib/types'

/**
 * 4 MB. The Anthropic API caps images at 5 MB, and base64 inflates a file by
 * about a third on the way there, so the file itself has to be smaller than the
 * cap. Phase 4 will downscale in the browser before upload; until it does, this
 * refuses the file rather than sending a request that is guaranteed to fail.
 */
const MAX_BYTES = 4 * 1024 * 1024

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

interface PhotoDropProps {
  readonly onSelect: (file: File, previewUrl: string) => void
  readonly disabled?: boolean
}

/**
 * Drag a photo in, or tap to choose one.
 *
 * The visible control is the Button primitive; the `<input type="file">` behind
 * it is hidden and unstyled, and exists because a file picker cannot be opened
 * any other way. It is the one input element outside `ui/`, and it is not a
 * styled control.
 */
export function PhotoDrop({ onSelect, disabled = false }: PhotoDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<ApiError | undefined>(undefined)

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return

      if (!ACCEPTED.includes(file.type)) {
        setError(apiError('invalid-input', 'That file is not a JPEG, PNG or WebP image.'))
        return
      }

      if (file.size > MAX_BYTES) {
        setError(
          apiError(
            'too-large',
            `That photo is ${(file.size / 1_000_000).toFixed(1)} MB. Please use one under 4 MB.`,
          ),
        )
        return
      }

      setError(undefined)
      onSelect(file, URL.createObjectURL(file))
    },
    [onSelect],
  )

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    accept(event.dataTransfer.files[0])
  }

  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cx(
            'flex flex-col items-center gap-4 rounded-2xl p-6 text-center md:p-8',
            'transition-colors duration-300 ease-out',
            dragging ? 'bg-accent-quiet' : 'bg-transparent',
            disabled && 'opacity-50',
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-quiet">
            <ImagePlus className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>

          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium text-zinc-100">
              Drop in a photo of your street, yard or balcony
            </p>
            <p className="text-sm text-zinc-400">
              Verge reads the surfaces in the frame and scores how well this spot handles
              heat. JPEG, PNG or WebP, under 4 MB. The photo is sent for analysis and is
              never stored.
            </p>
          </div>

          <Button variant="ghost" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Choose a photo
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(event) => accept(event.target.files?.[0])}
          />
        </div>
      </Card>

      {error ? <ErrorState error={error} title="That photo will not work" /> : null}
    </div>
  )
}
