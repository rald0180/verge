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
 * WHY THIS RESIZES INSTEAD OF REFUSING.
 *
 * There are two ceilings above this component, and the lower one is not ours:
 *
 *   - Vercel caps a serverless request body at about 4.5 MB. Base64 inflates a
 *     file by a third, so that ceiling is reached at roughly 3.4 MB of image.
 *     Past it the platform returns an HTML 413 before our handler runs, so the
 *     user gets a parse failure instead of a typed message.
 *   - The Anthropic API caps an image at 5 MB.
 *
 * The old behaviour was a flat 4 MB refusal, which was wrong twice over: it
 * rejected ordinary phone photos, and 3.4-4 MB files passed the check and then
 * died at the edge anyway. Now the browser downscales before upload, so a
 * 12 MB photo becomes a few hundred kilobytes and simply works.
 */
const MAX_EDGE_PX = 1600
const JPEG_QUALITY = 0.85

/** Only a sanity gate now — anything plausible gets resized rather than refused. */
const MAX_INPUT_BYTES = 30 * 1024 * 1024

/** What we will actually put on the wire, comfortably inside the platform cap. */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

interface PhotoDropProps {
  readonly onSelect: (file: File, previewUrl: string) => void
  readonly disabled?: boolean
}

/**
 * Downscale to fit MAX_EDGE_PX and re-encode as JPEG.
 *
 * `createImageBitmap` with `imageOrientation: 'from-image'` applies EXIF
 * rotation, which matters because phone photos are routinely stored sideways
 * with an orientation flag — analysing a rotated street is analysing a
 * different picture.
 *
 * Returns null when the browser cannot do it, so the caller can fall back to
 * the original file rather than failing outright.
 */
async function downscale(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, MAX_EDGE_PX / longest)

    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return null
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) return null

    return new File([blob], 'street.jpg', { type: 'image/jpeg' })
  } catch {
    return null
  }
}

export function PhotoDrop({ onSelect, disabled = false }: PhotoDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<ApiError | undefined>(undefined)

  const accept = useCallback(
    async (file: File | undefined) => {
      if (!file) return

      if (!ACCEPTED.includes(file.type)) {
        setError(apiError('invalid-input', 'That file is not a JPEG, PNG or WebP image.'))
        return
      }

      if (file.size > MAX_INPUT_BYTES) {
        setError(
          apiError(
            'too-large',
            `That photo is ${(file.size / 1_000_000).toFixed(0)} MB, which is larger than this can handle. Try one under 30 MB.`,
          ),
        )
        return
      }

      setError(undefined)
      setPreparing(true)

      const resized = await downscale(file)
      const upload = resized ?? file

      setPreparing(false)

      // Only reachable when the browser could not resize AND the original is
      // still too big for the platform to accept.
      if (upload.size > MAX_UPLOAD_BYTES) {
        setError(
          apiError(
            'too-large',
            'That photo could not be resized in this browser and is too large to send. Try a smaller one.',
          ),
        )
        return
      }

      onSelect(upload, URL.createObjectURL(upload))
    },
    [onSelect],
  )

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (disabled || preparing) return
    void accept(event.dataTransfer.files[0])
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
              heat. JPEG, PNG or WebP. Large photos are resized in your browser before
              they are sent, and the photo is never stored.
            </p>
          </div>

          <Button
            variant="ghost"
            disabled={disabled}
            loading={preparing}
            onClick={() => inputRef.current?.click()}
          >
            Choose a photo
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(event) => void accept(event.target.files?.[0])}
          />
        </div>
      </Card>

      {error ? <ErrorState error={error} title="That photo will not work" /> : null}
    </div>
  )
}
