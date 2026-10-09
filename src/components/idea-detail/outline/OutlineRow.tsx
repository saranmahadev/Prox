import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { HeadingRow } from '../../../lib/outline'

interface OutlineRowProps {
  row: HeadingRow
  numbering: string
  depth: number
  onLevelChange: (level: number) => void
  onTextChange: (text: string) => void
  onRemove: () => void
  onEnter: () => void
  onTab: (shiftKey: boolean) => void
  onMove: (direction: 'up' | 'down') => void
  onBackspaceEmpty: () => void
}

export function OutlineRow({
  row,
  numbering,
  depth,
  onLevelChange,
  onTextChange,
  onRemove,
  onEnter,
  onTab,
  onMove,
  onBackspaceEmpty,
}: OutlineRowProps) {
  const id = String(row.index)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onTab(e.shiftKey)
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      onMove(e.key === 'ArrowUp' ? 'up' : 'down')
    } else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) {
      e.preventDefault()
      onBackspaceEmpty()
    }
  }

  return (
    <li
      ref={setNodeRef}
      className={`ol-row${isDragging ? ' ol-ghost' : ''}`}
      style={{ '--d': depth, transform: CSS.Transform.toString(transform), transition } as CSSProperties}
    >
      <span className="ol-grip" title="Drag to move this section" aria-hidden="true" {...attributes} {...listeners}>
        ⋮⋮
      </span>
      <span className="ol-num">{numbering}</span>
      <select className="ol-lv" aria-label="Heading level" value={row.level} onChange={(e) => onLevelChange(+e.target.value)}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            H{n}
          </option>
        ))}
      </select>
      <input
        className={`ol-in lv${row.level}`}
        data-row-index={row.index}
        value={row.text}
        placeholder="Heading"
        aria-label="Heading text"
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className={`ol-state${row.written ? ' ok' : ''}`}>{row.written ? '✓ written' : ''}</span>
      <button className="rs-x" aria-label="Remove heading" title="Remove heading" onClick={onRemove}>
        ✕
      </button>
    </li>
  )
}
