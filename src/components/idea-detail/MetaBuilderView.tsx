import { seriesMembers, stageStatusOf } from '../../lib/selectors'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'
import { StatusTracker } from '../ui'
import { SeriesSection } from './meta/SeriesSection'
import { CoverSection } from './meta/CoverSection'
import { SeoSection } from './meta/SeoSection'
import { DetailsSection } from './meta/DetailsSection'
import { ImageCheckSection } from './meta/ImageCheckSection'
import { MetaPreviews } from './meta/MetaPreviews'
import type { Idea } from '../../types/idea'
import type { Pipeline } from '../../types/pipeline'

interface MetaBuilderViewProps {
  idea: Idea
  pipeline: Pipeline
}

export function MetaBuilderView({ idea, pipeline }: MetaBuilderViewProps) {
  const ideas = useIdeasStore((s) => s.ideas)
  const series = useIdeasStore((s) => s.series)
  const setStageStatus = useIdeasStore((s) => s.setStageStatus)
  const goToStage = useIdeasStore((s) => s.goToStage)
  const openIdea = useUiStore((s) => s.openIdea)

  const members = idea.meta?.seriesId ? seriesMembers(ideas, idea.meta.seriesId) : []
  const draftIndex = pipeline.stages.findIndex((s) => s.id === 'a-draft')

  return (
    <>
      <StatusTracker id="trk" status={stageStatusOf(idea, 'a-meta')} onChange={(status) => setStageStatus(idea.id, 'a-meta', status)} color="var(--article)" />
      <div className="meta-grid">
        <div className="meta-main">
          <SeriesSection idea={idea} series={series} members={members} onOpenIdea={openIdea} />
          <CoverSection idea={idea} />
          <SeoSection idea={idea} />
          <DetailsSection idea={idea} />
          <ImageCheckSection idea={idea} onFixInDraft={() => goToStage(idea.id, draftIndex)} />
        </div>
        <aside className="meta-side">
          <MetaPreviews idea={idea} />
        </aside>
      </div>
    </>
  )
}
