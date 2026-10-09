import type { ReactNode } from 'react'
import { PRIORITY_LABELS } from '../../data/pipelines'
import { pipeOf } from '../../lib/selectors'
import type { Idea } from '../../types/idea'

interface CapRowProps {
  label: string
  children: ReactNode
}

function CapRow({ label, children }: CapRowProps) {
  return (
    <div className="cap-row">
      <small>{label}</small>
      <div>{children}</div>
    </div>
  )
}

interface CaptureStageViewProps {
  idea: Idea
  onEdit: () => void
}

export function CaptureStageView({ idea, onEdit }: CaptureStageViewProps) {
  const pipeline = pipeOf(idea)
  return (
    <div className="cap-card">
      <CapRow label="Idea">
        <p className="cap-t">{idea.title}</p>
      </CapRow>
      {idea.summary && (
        <CapRow label="Summary">
          <p>{idea.summary}</p>
        </CapRow>
      )}
      {idea.link && (
        <CapRow label="Reference">
          <a href={idea.link} target="_blank" rel="noopener noreferrer">
            {idea.link.replace(/^https?:\/\//, '')}
          </a>
        </CapRow>
      )}
      {idea.tags.length > 0 && (
        <CapRow label="Tags">
          {idea.tags.map((t) => (
            <span className="tg" key={t}>
              #{t}
            </span>
          ))}
        </CapRow>
      )}
      <CapRow label="Format">
        {pipeline.icon} {pipeline.name}
      </CapRow>
      <CapRow label="Priority">
        <span className={`pri ${idea.priority}`}>{PRIORITY_LABELS[idea.priority]}</span>
      </CapRow>
      {idea.created && (
        <CapRow label="Captured">
          {new Date(idea.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </CapRow>
      )}
      <div className="cap-foot">
        <button className="btn" onClick={onEdit}>
          ✎ Edit idea
        </button>
      </div>
    </div>
  )
}
