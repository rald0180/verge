import { useId } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

import { cx } from '../../lib/format'

interface FieldProps {
  /** Rendered as the small uppercase label above the control. */
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  /** Quiet helper text under the control. */
  readonly hint?: string
  /** When set, the control turns red and the hint is replaced by this. */
  readonly error?: string
  /** A button or icon rendered inside the control, on the right. */
  readonly trailing?: ReactNode
  readonly type?: 'text' | 'search'
  readonly autoComplete?: string
  readonly disabled?: boolean
}

/**
 * The only text input in the project. CLAUDE.md section 4: no feature component
 * writes a raw `<input>`.
 *
 * The label is always present and always associated — placeholder-as-label is
 * an accessibility failure and it also looks cheap once the field has content.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  trailing,
  type = 'text',
  autoComplete = 'off',
  disabled = false,
}: FieldProps) {
  const id = useId()
  const describedById = `${id}-description`
  const description = error ?? hint

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-center text-xs uppercase tracking-widest text-zinc-500"
      >
        {label}
      </label>

      <div
        className={cx(
          'flex items-center gap-2 rounded-2xl bg-surface pl-4 pr-2',
          'ring-1 transition-colors duration-300 ease-out',
          error ? 'ring-risk-severe/60' : 'ring-white/10 focus-within:ring-accent/60',
          disabled && 'opacity-50',
        )}
      >
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error !== undefined}
          aria-describedby={description ? describedById : undefined}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          className={cx(
            'h-12 w-full min-w-0 bg-transparent text-center text-zinc-100',
            'placeholder:text-zinc-500 focus:outline-none',
          )}
        />
        {trailing}
      </div>

      {description ? (
        <p
          id={describedById}
          className={cx('mt-2 text-center text-sm', error ? 'text-risk-severe' : 'text-zinc-400')}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
