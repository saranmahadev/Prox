import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { JSONContent } from '@tiptap/core'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  addHeadingAfter,
  addHeadingAtEnd,
  addStarterHeadings,
  headingRows,
  moveSectionBefore,
  moveSectionDown,
  moveSectionUp,
  numberingFor,
  outlineStats,
  removeHeading,
  setHeadingLevel,
  setHeadingText,
} from '../../lib/outline'
import { useIdeasStore } from '../../state/useIdeasStore'
import { StatusTracker } from '../ui'
import { OutlineRow } from './outline/OutlineRow'
import type { Idea } from '../../types/idea'
import { stageStatusOf } from '../../lib/selectors'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

interface OutlineEditorViewProps {
  idea: Idea
}

export function OutlineEditorView({ idea }: OutlineEditorViewProps) {
  const doc = idea.doc ?? EMPTY_DOC
  const updateOutlineDoc = useIdeasStore((s) => s.updateOutlineDoc)
  const setStageStatus = useIdeasStore((s) => s.setStageStatus)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [newText, setNewText] = useState('')
  const [newLevel, setNewLevel] = useState(2)
  const addInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  const rows = headingRows(doc)
  const numbering = numberingFor(rows)
  const stats = outlineStats(doc)

  function apply(next: JSONContent, focusAt: number | null = null) {
    updateOutlineDoc(idea.id, next)
    setFocusIndex(focusAt)
  }

  // Imperative focus (not the `autoFocus` prop) so it also works when the
  // target row was already mounted, not just newly created - e.g. jumping
  // to the previous row after deleting one with Backspace.
  useEffect(() => {
    if (focusIndex == null) return
    listRef.current?.querySelector<HTMLInputElement>(`[data-row-index="${focusIndex}"]`)?.focus()
  }, [focusIndex, doc])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldPos = rows.findIndex((r) => String(r.index) === active.id)
    const newPos = rows.findIndex((r) => String(r.index) === over.id)
    if (oldPos < 0 || newPos < 0) return
    const reordered = arrayMove(rows, oldPos, newPos)
    const movedRow = rows[oldPos]
    const newArrayPos = reordered.indexOf(movedRow)
    const nextRow = reordered[newArrayPos + 1]
    const beforeIndex = nextRow ? nextRow.index : doc.content?.length ?? 0
    apply(moveSectionBefore(doc, movedRow.index, beforeIndex))
  }

  function handleAddSubmit(e: FormEvent) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    apply(addHeadingAtEnd(doc, text, newLevel))
    setNewText('')
    addInputRef.current?.focus()
  }

  return (
    <>
      <StatusTracker id="trk" status={stageStatusOf(idea, 'a-outline')} onChange={(status) => setStageStatus(idea.id, 'a-outline', status)} color="var(--article)" />
      <section className="rs-sec">
        <h5>Article structure</h5>
        <p className="rs-hint">Headings only, H1 to H6. Enter adds one, Tab changes its level, Alt+↑↓ moves its section.</p>
        <div id="olWrap">
          <div className="rs-stats">
            <span>
              <b>{stats.headings}</b> headings
            </span>
            <span>
              <b>{stats.levels}</b> levels
            </span>
            <span>
              <b>{stats.written}</b> sections written
            </span>
          </div>
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => String(r.index))} strategy={verticalListSortingStrategy}>
              <ol className="ol-list" ref={listRef}>
                {rows.map((row, i) => (
                  <OutlineRow
                    key={row.index}
                    row={row}
                    numbering={numbering[i].numbering}
                    depth={numbering[i].depth}
                    onLevelChange={(level) => apply(setHeadingLevel(doc, row.index, level), row.index)}
                    onTextChange={(text) => apply(setHeadingText(doc, row.index, text), row.index)}
                    onRemove={() => apply(removeHeading(doc, row.index))}
                    onEnter={() => {
                      const result = addHeadingAfter(doc, row.index)
                      apply(result.doc, result.index)
                    }}
                    onTab={(shiftKey) => apply(setHeadingLevel(doc, row.index, row.level + (shiftKey ? -1 : 1)), row.index)}
                    onMove={(direction) =>
                      apply(direction === 'up' ? moveSectionUp(doc, row.index) : moveSectionDown(doc, row.index), row.index)
                    }
                    onBackspaceEmpty={() => {
                      const prev = rows[i - 1]
                      apply(removeHeading(doc, row.index), prev ? prev.index : null)
                    }}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          {rows.length === 0 && (
            <div className="ol-empty">
              <p>No structure yet.</p>
              <button className="btn" type="button" onClick={() => apply(addStarterHeadings(doc))}>
                Start with Intro · Body · Conclusion
              </button>
            </div>
          )}
        </div>
        <form className="rs-add" autoComplete="off" onSubmit={handleAddSubmit}>
          <input
            ref={addInputRef}
            type="text"
            value={newText}
            placeholder="Add a heading…"
            aria-label="Add a heading"
            onChange={(e) => setNewText(e.target.value)}
          />
          <select aria-label="Level" value={newLevel} onChange={(e) => setNewLevel(+e.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                H{n}
              </option>
            ))}
          </select>
          <button className="btn primary" type="submit">
            + Add
          </button>
        </form>
      </section>
    </>
  )
}
