import { PIPELINES } from '../../data/pipelines'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useBoardStore } from '../../state/useBoardStore'
import { archivedIdeas, isDone, liveIdeas } from '../../lib/selectors'
import { BoardHeader } from './BoardHeader'
import { HeroStats } from './HeroStats'
import { PipelineFilterChips } from './PipelineFilterChips'
import { PipelineSection } from './PipelineSection'

interface BoardProps {
  onOpenIdea?: (id: string) => void
  onOpenStageGuide?: (pipelineId: string, stageIndex: number) => void
  onOpenArchive?: (pipelineId?: string) => void
  onCapture?: (pipelineId?: string) => void
}

export function Board({ onOpenIdea, onOpenStageGuide, onOpenArchive, onCapture }: BoardProps) {
  const ideas = useIdeasStore((s) => s.ideas)
  const archiveIdea = useIdeasStore((s) => s.archiveIdea)
  const filter = useBoardStore((s) => s.filter)

  const live = liveIdeas(ideas)
  const archived = archivedIdeas(ideas)
  const total = ideas.length
  const done = ideas.filter(isDone).length

  const shownPipelines = PIPELINES.filter((p) => filter === 'all' || filter === p.id)

  return (
    <div className="wrap">
      <BoardHeader archivedCount={archived.length} onOpenArchive={() => onOpenArchive?.()} onCapture={() => onCapture?.()} />
      <HeroStats total={total} active={total - done} done={done} />
      <PipelineFilterChips liveIdeas={live} />
      <main className="pipes">
        {shownPipelines.map((pipeline) => (
          <PipelineSection
            key={pipeline.id}
            pipeline={pipeline}
            liveIdeas={live.filter((i) => i.type === pipeline.id)}
            archivedIdeas={archived.filter((i) => i.type === pipeline.id)}
            vertical={filter !== 'all'}
            onOpenIdea={onOpenIdea}
            onArchiveIdea={archiveIdea}
            onOpenStageGuide={onOpenStageGuide}
            onOpenArchive={onOpenArchive}
            onCapture={onCapture}
          />
        ))}
      </main>
    </div>
  )
}
