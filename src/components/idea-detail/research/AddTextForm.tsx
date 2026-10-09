import { useRef, useState, type FormEvent } from 'react'
import { hostOf } from '../../../lib/url'
import type { Source } from '../../../types/idea'

interface AddTextFormProps {
  placeholder: string
  ariaLabel: string
  sources?: Source[] // when provided, shows a "from source" select (insights only)
  onAdd: (text: string, sourceId: string | null) => void
}

export function AddTextForm({ placeholder, ariaLabel, sources, onAdd }: AddTextFormProps) {
  const [value, setValue] = useState('')
  const [sourceId, setSourceId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    onAdd(v, sourceId || null)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <form className="rs-add" autoComplete="off" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={`${ariaLabel}: add`}
        onChange={(e) => setValue(e.target.value)}
      />
      {sources && sources.length > 0 && (
        <select aria-label="From source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">From: any</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title || hostOf(s.url)}
            </option>
          ))}
        </select>
      )}
      <button className="btn primary" type="submit">
        + Add
      </button>
    </form>
  )
}
