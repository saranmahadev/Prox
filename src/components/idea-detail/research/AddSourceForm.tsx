import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { looksLikeUrl } from '../../../lib/url'

interface AddSourceFormProps {
  onAddLink: (url: string) => void
  onAddDoc: (title: string) => void
  onAddFiles: (files: File[]) => void
}

export function AddSourceForm({ onAddLink, onAddDoc, onAddFiles }: AddSourceFormProps) {
  const [kind, setKind] = useState<'link' | 'doc'>('link')
  const [value, setValue] = useState('')
  const [bad, setBad] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    if (kind === 'link') {
      if (!looksLikeUrl(v)) {
        setBad(true)
        inputRef.current?.focus()
        return
      }
      onAddLink(v)
    } else {
      onAddDoc(v)
    }
    setValue('')
    setBad(false)
    inputRef.current?.focus()
  }

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length) onAddFiles(files)
  }

  return (
    <form className="rs-add" data-kind={kind} autoComplete="off" onSubmit={handleSubmit}>
      <div className="kseg" role="radiogroup" aria-label="Source type">
        <label>
          <input type="radio" name="kind" value="link" checked={kind === 'link'} onChange={() => setKind('link')} />
          <span>🔗 Link</span>
        </label>
        <label>
          <input type="radio" name="kind" value="doc" checked={kind === 'doc'} onChange={() => setKind('doc')} />
          <span>📄 Docs</span>
        </label>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        className={bad ? 'bad' : ''}
        placeholder={bad ? 'That does not look like a link' : kind === 'link' ? 'Paste a link…' : 'Name a document, or upload files →'}
        aria-label="Source"
        onChange={(e) => {
          setValue(e.target.value)
          setBad(false)
        }}
      />
      <label className="btn rs-up">
        ⬆ Upload
        <input type="file" multiple onChange={handleFiles} />
      </label>
      <button className="btn primary" type="submit">
        + Add
      </button>
    </form>
  )
}
