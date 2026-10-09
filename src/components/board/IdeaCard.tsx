import { PRIORITY_LABELS } from '../../data/pipelines'
import { isDone, progress } from '../../lib/selectors'
import { hasCover, wordCount } from '../../lib/text'
import { ProgressBar } from '../../components/ui'
import type { Idea } from '../../types/idea'
import type { Pipeline } from '../../types/pipeline'

interface IdeaCardProps {
  idea: Idea
  pipeline: Pipeline
  onOpen?: (id: string) => void
  onArchive?: (id: string) => void
}

function ResearchMeta({ idea }: { idea: Idea }) {
  const r = idea.research
  const hasAny = r.sources.length || r.insights.length || r.questions.length
  if (!hasAny) return null
  const openQuestions = r.questions.filter((q) => q.status !== 'answered').length
  return (
    <div className="rmeta" aria-label="Research">
      {r.sources.length > 0 && <span>🔗 {r.sources.length}</span>}
      {r.insights.length > 0 && <span>💡 {r.insights.length}</span>}
      {openQuestions > 0 && <span className="q">❓ {openQuestions}</span>}
    </div>
  )
}

function ArticleMeta({ idea }: { idea: Idea }) {
  if (idea.type !== 'article') return null
  const words = wordCount(idea.doc)
  const cover = hasCover(idea)
  if (!words && !cover) return null
  return (
    <div className="rmeta">
      {words > 0 && <span>📝 {words.toLocaleString()} words</span>}
      {cover && <span>🖼 cover</span>}
    </div>
  )
}

export function IdeaCard({ idea, pipeline, onOpen, onArchive }: IdeaCardProps) {
  const done = isDone(idea)
  const f = progress(idea)

  return (
    <div
      className="idea tint"
      role="button"
      tabIndex={0}
      aria-label={`${idea.title}, ${Math.round(f * 100)}% through ${pipeline.name} Prox`}
      onClick={() => onOpen?.(idea.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen?.(idea.id)
      }}
    >
      <div className="ic-top">
        <span className={`pri ${idea.priority}`}>{PRIORITY_LABELS[idea.priority]}</span>
        {idea.tags.slice(0, 2).map((t) => (
          <span className="tg" key={t}>
            #{t}
          </span>
        ))}
        {done && <span className="pubbadge">✓ Live</span>}
      </div>
      <h4>{idea.title}</h4>
      {idea.summary && <p>{idea.summary}</p>}
      <ResearchMeta idea={idea} />
      <ArticleMeta idea={idea} />
      <div className="ic-foot">
        <ProgressBar frac={f} />
        {done && (
          <button
            className="ic-arch"
            aria-label="Move to archive"
            title="Move to archive"
            onClick={(e) => {
              e.stopPropagation()
              onArchive?.(idea.id)
            }}
          >
            📁 Archive
          </button>
        )}
      </div>
    </div>
  )
}
