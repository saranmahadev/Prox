import { useBoardStore } from '../../state/useBoardStore'
import { Button } from '../ui'

interface BoardHeaderProps {
  archivedCount: number
  onOpenArchive?: () => void
  onCapture?: () => void
}

export function BoardHeader({ archivedCount, onOpenArchive, onCapture }: BoardHeaderProps) {
  const query = useBoardStore((s) => s.query)
  const setQuery = useBoardStore((s) => s.setQuery)

  return (
    <header className="top clay">
      <div className="brand">
        <h1>Prox</h1>
        <p>by Dev</p>
      </div>
      <div className="tools">
        <label className="search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search ideas or tags…"
            aria-label="Search ideas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="chip" aria-label="Open archive" onClick={onOpenArchive}>
          📁 Archive <em>{archivedCount}</em>
        </button>
        <Button variant="primary" onClick={onCapture}>
          ＋ Capture idea
        </Button>
      </div>
    </header>
  )
}
