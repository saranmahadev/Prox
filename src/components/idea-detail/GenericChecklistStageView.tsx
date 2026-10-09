import { ProgressBar } from '../ui'
import type { ChecklistItem } from '../../types/idea'

interface GenericChecklistStageViewProps {
  items: ChecklistItem[]
  onToggle: (itemId: string, checked: boolean) => void
}

export function GenericChecklistStageView({ items, onToggle }: GenericChecklistStageViewProps) {
  const done = items.filter((it) => it.checked).length
  return (
    <div className="blk">
      <h5>
        Checklist · {done}/{items.length}
      </h5>
      <div style={{ marginBottom: 12 }}>
        <ProgressBar frac={items.length ? done / items.length : 1} />
      </div>
      <ul className="chk">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={item.checked} onChange={(e) => onToggle(item.id, e.target.checked)} />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
