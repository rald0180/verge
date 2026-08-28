import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search } from 'lucide-react'

import { Button } from '../ui/Button'
import { Field } from '../ui/Field'

interface AddressSearchProps {
  readonly onSearch: (query: string) => void
  readonly loading?: boolean
  /** Rendered under the field when a lookup failed on the last attempt. */
  readonly error?: string
}

/**
 * The single input the whole product hangs off.
 *
 * The 600 ms debounce and the one-request-per-second gap Nominatim asks for
 * live in lib/geocode.ts, so this component stays a dumb, controlled form and
 * the rate limiting cannot be bypassed by a second caller.
 */
export function AddressSearch({ onSearch, loading = false, error }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (trimmed.length < 3 || loading) return
    onSearch(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field
        label="Your address"
        type="search"
        value={query}
        onChange={setQuery}
        placeholder="Street and suburb"
        autoComplete="street-address"
        disabled={loading}
        {...(error === undefined ? {} : { error })}
        {...(error === undefined
          ? { hint: 'Street and suburb is enough. Nothing you type is stored.' }
          : {})}
        trailing={
          <Button type="submit" size="sm" loading={loading} disabled={trimmed.length < 3}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Check
          </Button>
        }
      />
    </form>
  )
}
