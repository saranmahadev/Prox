import { useState, type FormEvent } from 'react'
import { readMins } from '../../../lib/articleMeta'
import { headingRows } from '../../../lib/headings'
import { wordCount } from '../../../lib/text'
import { useIdeasStore } from '../../../state/useIdeasStore'
import type { Idea } from '../../../types/idea'

interface DetailsSectionProps {
  idea: Idea
}

export function DetailsSection({ idea }: DetailsSectionProps) {
  const updateMeta = useIdeasStore((s) => s.updateMeta)
  const addTag = useIdeasStore((s) => s.addTag)
  const removeTag = useIdeasStore((s) => s.removeTag)
  const [newTag, setNewTag] = useState('')

  const headingCount = headingRows(idea.draft ?? { blocks: [] }).length
  const words = wordCount(idea.draft)

  function handleAddTag(e: FormEvent) {
    e.preventDefault()
    const v = newTag.trim().replace(/^#/, '')
    if (v) addTag(idea.id, v)
    setNewTag('')
  }

  return (
    <section className="rs-sec">
      <h5>Details</h5>
      <div className="mf">
        <label>Tags</label>
        <div className="tagedit">
          {idea.tags.map((t) => (
            <span className="tg" key={t}>
              #{t}
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => removeTag(idea.id, t)}>
                ✕
              </button>
            </span>
          ))}
          <form onSubmit={handleAddTag}>
            <input type="text" value={newTag} placeholder="Add tag…" aria-label="Add tag" onChange={(e) => setNewTag(e.target.value)} />
          </form>
        </div>
      </div>
      <div className="mgrid">
        <div className="mf">
          <label>Category</label>
          <input type="text" value={idea.meta?.category ?? ''} placeholder="e.g. Design" onChange={(e) => updateMeta(idea.id, { category: e.target.value })} />
        </div>
        <div className="mf">
          <label>Author</label>
          <input type="text" value={idea.meta?.author ?? ''} placeholder="Dev" onChange={(e) => updateMeta(idea.id, { author: e.target.value })} />
        </div>
        <div className="mf">
          <label>Language</label>
          <input type="text" value={idea.meta?.lang ?? ''} placeholder="en" onChange={(e) => updateMeta(idea.id, { lang: e.target.value })} />
        </div>
        <div className="mf">
          <label>Publish date</label>
          <input
            type="datetime-local"
            value={idea.meta?.publishAt ?? ''}
            onChange={(e) => updateMeta(idea.id, { publishAt: e.target.value })}
          />
        </div>
      </div>
      <label className="mcheck">
        <input type="checkbox" checked={idea.meta?.toc ?? false} onChange={(e) => updateMeta(idea.id, { toc: e.target.checked })} />
        Show a table of contents <small>({headingCount} headings from the outline)</small>
      </label>
      <p className="rs-hint">
        Estimated read time: <b>{readMins(words)} min</b> · {words.toLocaleString()} words
      </p>
    </section>
  )
}
