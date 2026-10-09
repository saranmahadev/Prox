import { useState, type FormEvent } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useIdeasStore } from '../../../state/useIdeasStore'
import { SeriesMemberRow } from './SeriesMemberRow'
import type { Idea, Series } from '../../../types/idea'

interface SeriesSectionProps {
  idea: Idea
  series: Series[]
  members: Idea[]
  onOpenIdea: (id: string) => void
}

export function SeriesSection({ idea, series, members, onOpenIdea }: SeriesSectionProps) {
  const addSeries = useIdeasStore((s) => s.addSeries)
  const setIdeaSeries = useIdeasStore((s) => s.setIdeaSeries)
  const setIdeaPart = useIdeasStore((s) => s.setIdeaPart)
  const updateSeriesName = useIdeasStore((s) => s.updateSeriesName)
  const updateSeriesDesc = useIdeasStore((s) => s.updateSeriesDesc)
  const deleteSeries = useIdeasStore((s) => s.deleteSeries)
  const reorderSeriesMembers = useIdeasStore((s) => s.reorderSeriesMembers)

  const [newSeriesName, setNewSeriesName] = useState('')

  const current = series.find((s) => s.id === idea.meta?.seriesId)

  function handleCreateSeries(e: FormEvent) {
    e.preventDefault()
    const name = newSeriesName.trim()
    if (!name) return
    const created = addSeries(name)
    setIdeaSeries(idea.id, created.id)
    setIdeaPart(idea.id, 1)
    setNewSeriesName('')
  }

  function handleDeleteSeries() {
    if (current && confirm(`Delete the series "${current.name}"? The articles stay.`)) {
      deleteSeries(current.id)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !current) return
    const oldPos = members.findIndex((m) => m.id === active.id)
    const newPos = members.findIndex((m) => m.id === over.id)
    if (oldPos < 0 || newPos < 0) return
    const reordered = arrayMove(members, oldPos, newPos)
    reorderSeriesMembers(current.id, reordered.map((m) => m.id))
  }

  return (
    <section className="rs-sec">
      <h5>Series</h5>
      <p className="rs-hint">Group articles that belong together and keep their order.</p>
      <div className="mrow">
        <select
          aria-label="Series"
          value={idea.meta?.seriesId ?? ''}
          onChange={(e) => setIdeaSeries(idea.id, e.target.value || null)}
        >
          <option value="">Not in a series</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {current && (
          <label className="part">
            Part
            <input
              type="number"
              min={1}
              aria-label="Part number"
              value={idea.meta?.part ?? ''}
              onChange={(e) => setIdeaPart(idea.id, e.target.value ? +e.target.value : null)}
            />
          </label>
        )}
      </div>
      <form className="rs-add" autoComplete="off" onSubmit={handleCreateSeries}>
        <input
          type="text"
          value={newSeriesName}
          placeholder="New series name…"
          aria-label="New series name"
          onChange={(e) => setNewSeriesName(e.target.value)}
        />
        <button className="btn primary" type="submit">
          + Create series
        </button>
      </form>
      {current && (
        <div className="ser-box">
          <div className="mrow">
            <input
              type="text"
              className="ser-name"
              aria-label="Series name"
              value={current.name}
              onChange={(e) => updateSeriesName(current.id, e.target.value)}
            />
            <button className="btn danger" type="button" onClick={handleDeleteSeries}>
              Delete series
            </button>
          </div>
          <textarea
            rows={2}
            placeholder="What is this series about?"
            aria-label="Series description"
            value={current.desc}
            onChange={(e) => updateSeriesDesc(current.id, e.target.value)}
          />
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <ol className="ser-list">
                {members.map((m) => (
                  <SeriesMemberRow key={m.id} idea={m} isCurrent={m.id === idea.id} onOpen={() => onOpenIdea(m.id)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </section>
  )
}
