import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { Idea } from '../../../types/idea'

interface SeriesMemberRowProps {
  idea: Idea
  isCurrent: boolean
  onOpen: () => void
}

export function SeriesMemberRow({ idea, isCurrent, onOpen }: SeriesMemberRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: idea.id })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition } as CSSProperties}>
      <span className="ol-grip" aria-hidden="true" {...attributes} {...listeners}>
        ⋮⋮
      </span>
      <span className="ser-part">Part {idea.meta?.part || '–'}</span>
      <button className="ser-t" type="button" onClick={onOpen}>
        {idea.title}
      </button>
      {isCurrent && <em>this article</em>}
    </li>
  )
}
