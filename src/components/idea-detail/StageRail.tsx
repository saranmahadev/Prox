import type { Pipeline } from '../../types/pipeline'

interface StageRailProps {
  pipeline: Pipeline
  currentIndex: number
  onJump: (stageIndex: number) => void
}

export function StageRail({ pipeline, currentIndex, onJump }: StageRailProps) {
  return (
    <nav className="rail" aria-label="Prox stages">
      <h5>Process</h5>
      <ol>
        {pipeline.stages.map((stage, n) => {
          const cls = n < currentIndex ? 'past' : n === currentIndex ? 'now' : 'upcoming'
          const sub = stage.final ? '' : stage.time
          return (
            <li key={stage.id}>
              <button className={`rs ${cls}`} aria-current={n === currentIndex ? 'step' : undefined} onClick={() => onJump(n)}>
                <span className="dot">{n < currentIndex ? '✓' : n + 1}</span>
                <span className="t">
                  <b>{stage.title}</b>
                  <small>{sub}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
