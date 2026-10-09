import { useDroppable } from '@dnd-kit/core'
import type { Idea } from '../../types/idea'
import type { Pipeline, PipelineId } from '../../types/pipeline'

interface ArchiveFolderWidgetProps {
  pipeline: Pipeline
  archivedIdeas: Idea[]
  onOpen?: (pipelineId: PipelineId) => void
}

export function ArchiveFolderWidget({ pipeline, archivedIdeas, onOpen }: ArchiveFolderWidgetProps) {
  const n = archivedIdeas.length
  const prev = [...archivedIdeas].sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)).slice(0, 3).reverse()
  const offset = 3 - prev.length
  const { setNodeRef, isOver } = useDroppable({
    id: `${pipeline.id}:archive`,
    data: { pipelineId: pipeline.id, archive: true },
  })

  return (
    <>
      <div className="arrow" aria-hidden="true">
        <span>›</span>
      </div>
      <div className="stagecol archive">
        <button className="stagehead" aria-label={`Open ${pipeline.name} archive`} onClick={() => onOpen?.(pipeline.id)}>
          <span className="n">📁</span>
          <b>Archive</b>
          <em>{n}</em>
        </button>
        <button
          ref={setNodeRef}
          className={`dropwell fbtn${isOver ? ' over' : ''}`}
          aria-label={`Open ${pipeline.name} archive, ${n} ideas`}
          onClick={() => onOpen?.(pipeline.id)}
        >
          <span className="fld">
            <span className="fld-back" />
            {prev.map((idea, k) => (
              <span className={`paper p${offset + k}`} key={idea.id}>
                {idea.title}
              </span>
            ))}
            <span className="fld-front">
              <b>{n}</b>
              <span className="lbl">{n === 1 ? 'idea' : 'ideas'} saved</span>
              <small>{n ? 'Open archive →' : 'Drop a published idea here'}</small>
            </span>
          </span>
        </button>
      </div>
    </>
  )
}
