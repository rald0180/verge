import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from '../../lib/format'

type ButtonVariant = 'primary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  /** Renders a quiet pending label and blocks interaction. */
  readonly loading?: boolean
}

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary:
    'bg-accent text-canvas hover:bg-accent-text disabled:hover:bg-accent font-medium',
  ghost:
    'bg-surface text-zinc-100 ring-1 ring-white/10 hover:bg-surface-raised disabled:hover:bg-surface',
  danger:
    'bg-risk-severe/10 text-risk-severe ring-1 ring-white/10 hover:bg-risk-severe/20 disabled:hover:bg-risk-severe/10',
}

const SIZES: Readonly<Record<ButtonSize, string>> = {
  sm: 'h-8 px-4 text-sm',
  md: 'h-12 px-6 text-sm',
}

/**
 * The only button in the project. CLAUDE.md section 4: no feature component
 * ever writes a raw `<button>`.
 *
 * Buttons take `rounded-full` — they are read as pills in this system, which
 * keeps them distinct from the `rounded-2xl` cards and inputs they sit beside.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full',
        'transition-colors duration-300 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? 'Working…' : children}
    </button>
  )
}
