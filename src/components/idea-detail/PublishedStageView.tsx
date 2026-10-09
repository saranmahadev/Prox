import { PRIORITY_LABELS } from '../../data/pipelines'
import type { Idea } from '../../types/idea'
import type { Pipeline } from '../../types/pipeline'

interface PublishedStageViewProps {
  idea: Idea
  pipeline: Pipeline
}

/**
 * Read-only "published" recap. This is the non-article half for now (idea
 * info + per-stage checklist recap) - the article half (full rendered body,
 * TOC, metadata/distribution recap) is added in a later phase once the
 * draft/meta/distribute views exist. Ported from legacy's publishedHTML()
 * (lines 1266-1289).
 */
export function PublishedStageView({ idea, pipeline }: PublishedStageViewProps) {
  const checklistStages = pipeline.stages.filter((s) => s.checklist.length > 0)

  return (
    <>
      <div className="cap-card">
        <div className="cap-row">
          <small>Idea</small>
          <p className="cap-t">{idea.title}</p>
        </div>
        {idea.summary && (
          <div className="cap-row">
            <small>Summary</small>
            <p>{idea.summary}</p>
          </div>
        )}
        {idea.link && (
          <div className="cap-row">
            <small>Reference</small>
            <a href={idea.link} target="_blank" rel="noopener noreferrer">
              {idea.link.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        {idea.tags.length > 0 && (
          <div className="cap-row">
            <small>Tags</small>
            <div>
              {idea.tags.map((t) => (
                <span className="tg" key={t}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="cap-row">
          <small>Format</small>
          <p>
            {pipeline.icon} {pipeline.name}
          </p>
        </div>
        <div className="cap-row">
          <small>Priority</small>
          <span className={`pri ${idea.priority}`}>{PRIORITY_LABELS[idea.priority]}</span>
        </div>
      </div>

      {checklistStages.length > 0 && (
        <div className="blk">
          <h5>Stages</h5>
          {checklistStages.map((stage) => {
            const items = idea.checklistState[stage.id] ?? []
            return (
              <div key={stage.id} style={{ marginBottom: 14 }}>
                <h6 style={{ margin: '0 0 4px' }}>
                  {stage.icon} {stage.title}
                </h6>
                <ul className="chk ro">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label>
                        <span>
                          {item.checked ? '✓' : '○'} {item.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
