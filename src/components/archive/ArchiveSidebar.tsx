import type { CSSProperties } from 'react'
import { PIPELINES } from '../../data/pipelines'
import type { PipelineId } from '../../types/pipeline'

interface ArchiveSidebarProps {
  total: number
  filter: 'all' | PipelineId
  countsByPipeline: Record<string, number>
  onFilterChange: (filter: 'all' | PipelineId) => void
}

export function ArchiveSidebar({ total, filter, countsByPipeline, onFilterChange }: ArchiveSidebarProps) {
  return (
    <aside className="arc-side">
      <div className="big">{total}</div>
      <small>ideas saved</small>
      <nav className="arc-nav" aria-label="Filter by Prox">
        <button aria-pressed={filter === 'all'} onClick={() => onFilterChange('all')}>
          <span>🗂️</span>All Prox<em>{total}</em>
        </button>
        {PIPELINES.map((p) => (
          <button
            key={p.id}
            aria-pressed={filter === p.id}
            style={{ '--c': `var(--${p.color})` } as CSSProperties}
            onClick={() => onFilterChange(p.id)}
          >
            <span>{p.icon}</span>
            {p.name}
            <em>{countsByPipeline[p.id] ?? 0}</em>
          </button>
        ))}
      </nav>
    </aside>
  )
}
