import { PIPELINES } from '../../data/pipelines'
import { Chip } from '../ui'
import { useBoardStore } from '../../state/useBoardStore'
import type { Idea } from '../../types/idea'

interface PipelineFilterChipsProps {
  liveIdeas: Idea[]
}

export function PipelineFilterChips({ liveIdeas }: PipelineFilterChipsProps) {
  const filter = useBoardStore((s) => s.filter)
  const setFilter = useBoardStore((s) => s.setFilter)

  return (
    <div className="controls">
      <Chip pressed={filter === 'all'} count={liveIdeas.length} onClick={() => setFilter('all')}>
        All Prox
      </Chip>
      {PIPELINES.map((p) => (
        <Chip
          key={p.id}
          pressed={filter === p.id}
          dot
          color={`var(--${p.color})`}
          count={liveIdeas.filter((i) => i.type === p.id).length}
          onClick={() => setFilter(p.id)}
        >
          {p.name}
        </Chip>
      ))}
    </div>
  )
}
