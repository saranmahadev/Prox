import { useEffect, useRef } from 'react'
import { PRIORITY_LABELS } from '../../data/pipelines'
import { useBoardStore } from '../../state/useBoardStore'
import type { Idea, Priority } from '../../types/idea'
import type { Pipeline } from '../../types/pipeline'

const FUNNEL = (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5h18l-7 8.5V20l-4-2v-4.5z" />
  </svg>
)

interface PipelineFilterPopoverProps {
  pipeline: Pipeline
  ideas: Idea[]
}

export function PipelineFilterPopover({ pipeline, ideas }: PipelineFilterPopoverProps) {
  const openFilterPopover = useBoardStore((s) => s.openFilterPopover)
  const setOpenFilterPopover = useBoardStore((s) => s.setOpenFilterPopover)
  const perPipelineFilters = useBoardStore((s) => s.perPipelineFilters)
  const toggleFilterPriority = useBoardStore((s) => s.toggleFilterPriority)
  const toggleFilterTag = useBoardStore((s) => s.toggleFilterTag)
  const clearFilter = useBoardStore((s) => s.clearFilter)

  const open = openFilterPopover === pipeline.id
  const filter = perPipelineFilters[pipeline.id] ?? { priority: [], tags: [] }
  const count = filter.priority.length + filter.tags.length
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenFilterPopover(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenFilterPopover(null)
    }
    document.addEventListener('click', onDocClick)
    addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onDocClick)
      removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpenFilterPopover])

  const tags = Array.from(new Set([...ideas.flatMap((i) => i.tags), ...filter.tags])).sort().slice(0, 24)

  return (
    <div className="pf-wrap" ref={wrapRef}>
      <button
        className={`btn icon pf-btn${count ? ' on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filter ${pipeline.name} ideas${count ? ` (${count} active)` : ''}`}
        title="Filter"
        onClick={() => setOpenFilterPopover(open ? null : pipeline.id)}
      >
        {FUNNEL}
        {count > 0 && <span className="pf-badge">{count}</span>}
      </button>
      {open && (
        <div className="pf-pop" role="dialog" aria-label={`Filter ${pipeline.name} ideas`}>
          <div className="pf-sec">
            <h6>Priority</h6>
            <div className="pf-chips">
              {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                <button
                  key={k}
                  className="chip"
                  aria-pressed={filter.priority.includes(k)}
                  onClick={() => toggleFilterPriority(pipeline.id, k)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="pf-sec">
            <h6>Tags</h6>
            <div className="pf-chips">
              {tags.length ? (
                tags.map((t) => (
                  <button
                    key={t}
                    className="chip"
                    aria-pressed={filter.tags.includes(t)}
                    onClick={() => toggleFilterTag(pipeline.id, t)}
                  >
                    #{t}
                  </button>
                ))
              ) : (
                <span className="pf-none">No tags yet</span>
              )}
            </div>
          </div>
          <div className="pf-foot">
            <button className="btn" disabled={!count} onClick={() => clearFilter(pipeline.id)}>
              Clear
            </button>
            <button className="btn primary" onClick={() => setOpenFilterPopover(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
