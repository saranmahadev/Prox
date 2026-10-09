import type { CSSProperties } from 'react'
import { formatDate } from '../../lib/date'
import { pipeOf } from '../../lib/selectors'
import type { Idea } from '../../types/idea'

interface ArchiveCardProps {
  idea: Idea
  onOpen: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function ArchiveCard({ idea, onOpen, onRestore, onDelete }: ArchiveCardProps) {
  const pipeline = pipeOf(idea)
  const when = formatDate(idea.archivedAt)

  return (
    <article className="arc-card" style={{ '--c': `var(--${pipeline.color})` } as CSSProperties}>
      <div className="ac-top">
        <span>
          {pipeline.icon} {pipeline.name}
        </span>
        {when && <span className="when">{when}</span>}
      </div>
      <h4>{idea.title}</h4>
      {idea.summary && <p>{idea.summary}</p>}
      {idea.tags.length > 0 && (
        <div className="row">
          {idea.tags.slice(0, 4).map((t) => (
            <span className="tg" key={t}>
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="outs">
        {pipeline.outputs.map((o) => (
          <span key={o}>{o}</span>
        ))}
      </div>
      <div className="arc-act">
        <button className="btn" onClick={() => onOpen(idea.id)}>
          Open
        </button>
        <button className="btn" onClick={() => onRestore(idea.id)}>
          ↩ Restore
        </button>
        <button className="btn danger" aria-label={`Delete ${idea.title}`} onClick={() => onDelete(idea.id)}>
          🗑
        </button>
      </div>
    </article>
  )
}
