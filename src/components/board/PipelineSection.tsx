import type { CSSProperties } from 'react'
import { useBoardStore, passesPipelineFilter } from '../../state/useBoardStore'
import { matchesQuery, progress } from '../../lib/selectors'
import { ProgressRing } from '../ui'
import { StageColumn } from './StageColumn'
import { ArchiveFolderWidget } from './ArchiveFolderWidget'
import type { Idea } from '../../types/idea'
import type { Pipeline, PipelineId } from '../../types/pipeline'
import { PipelineFilterPopover } from './PipelineFilterPopover'

interface PipelineSectionProps {
  pipeline: Pipeline
  liveIdeas: Idea[] // this pipeline's non-archived ideas
  archivedIdeas: Idea[] // this pipeline's archived ideas
  vertical: boolean
  onOpenIdea?: (id: string) => void
  onArchiveIdea?: (id: string) => void
  onOpenStageGuide?: (pipelineId: PipelineId, stageIndex: number) => void
  onOpenArchive?: (pipelineId: string) => void
  onCapture?: (pipelineId: string) => void
}

export function PipelineSection({
  pipeline,
  liveIdeas,
  archivedIdeas,
  vertical,
  onOpenIdea,
  onArchiveIdea,
  onOpenStageGuide,
  onOpenArchive,
  onCapture,
}: PipelineSectionProps) {
  const query = useBoardStore((s) => s.query)
  const perPipelineFilters = useBoardStore((s) => s.perPipelineFilters)
  const filter = perPipelineFilters[pipeline.id]

  const avg = liveIdeas.length ? liveIdeas.reduce((sum, i) => sum + progress(i), 0) / liveIdeas.length : 0
  const lastStageIndex = pipeline.stages.length - 1

  return (
    <section className="pipe clay" style={{ '--c': `var(--${pipeline.color})` } as CSSProperties} data-pipe={pipeline.id}>
      <div className="pipe-head">
        <ProgressRing frac={avg} size={58} strokeWidth={4} className="pipe-ring" label={`${Math.round(avg * 100)}% complete`}>
          <span className="pipe-ico">{pipeline.icon}</span>
        </ProgressRing>
        <div className="grow">
          <h2>{pipeline.name} Prox</h2>
        </div>
        <PipelineFilterPopover pipeline={pipeline} ideas={liveIdeas} />
        <button className="btn" onClick={() => onCapture?.(pipeline.id)}>
          + Capture
        </button>
      </div>
      <div className={`stages${vertical ? ' vertical' : ''}`}>
        {pipeline.stages.map((stage, k) => (
          <div key={stage.id} style={{ display: 'contents' }}>
            {k > 0 && (
              <div className="arrow" aria-hidden="true">
                <span>›</span>
              </div>
            )}
            <StageColumn
              pipeline={pipeline}
              stage={stage}
              stageIndex={k}
              ideas={liveIdeas.filter(
                (i) => Math.min(i.stage, lastStageIndex) === k && matchesQuery(i, query) && passesPipelineFilter(filter, i),
              )}
              onOpenIdea={onOpenIdea}
              onArchiveIdea={onArchiveIdea}
              onOpenStageGuide={onOpenStageGuide}
            />
          </div>
        ))}
        <ArchiveFolderWidget pipeline={pipeline} archivedIdeas={archivedIdeas} onOpen={onOpenArchive} />
      </div>
    </section>
  )
}
