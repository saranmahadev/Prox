import { useDroppable } from '@dnd-kit/core'
import { IdeaCard } from './IdeaCard'
import type { Idea } from '../../types/idea'
import type { Pipeline, PipelineId, Stage } from '../../types/pipeline'

interface StageColumnProps {
  pipeline: Pipeline
  stage: Stage
  stageIndex: number
  ideas: Idea[]
  onOpenIdea?: (id: string) => void
  onArchiveIdea?: (id: string) => void
  onOpenStageGuide?: (pipelineId: PipelineId, stageIndex: number) => void
}

export function StageColumn({ pipeline, stage, stageIndex, ideas, onOpenIdea, onArchiveIdea, onOpenStageGuide }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${pipeline.id}:${stageIndex}`,
    data: { pipelineId: pipeline.id, stageIndex },
  })

  return (
    <div className="stagecol">
      <button
        className="stagehead"
        aria-label={`About stage ${stage.title}`}
        onClick={() => onOpenStageGuide?.(pipeline.id, stageIndex)}
      >
        <span className="n">{stageIndex + 1}</span>
        <b>
          {stage.icon} {stage.title}
        </b>
        <em>{ideas.length}</em>
      </button>
      <div ref={setNodeRef} className={`dropwell well${isOver ? ' over' : ''}`}>
        {stage.final && (
          <div className="outs">
            {pipeline.outputs.map((o) => (
              <span key={o}>{o}</span>
            ))}
          </div>
        )}
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} pipeline={pipeline} onOpen={onOpenIdea} onArchive={onArchiveIdea} />
        ))}
        {ideas.length === 0 && !stage.final && <div className="empty">Drop an idea here</div>}
      </div>
    </div>
  )
}
