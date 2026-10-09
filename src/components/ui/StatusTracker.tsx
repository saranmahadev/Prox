import type { CSSProperties } from 'react'
import { STAGE_STATUS_STEPS, type StageStatus } from '../../types/idea'

interface StatusTrackerProps {
  status: StageStatus
  onChange: (status: StageStatus) => void
  color?: string
  label?: string
}

export function StatusTracker({ status, onChange, color, label = 'Status' }: StatusTrackerProps) {
  const ix = Math.max(0, STAGE_STATUS_STEPS.findIndex(([k]) => k === status))
  return (
    <ol
      className="rs-track"
      aria-label={label}
      style={color ? ({ '--c': color } as CSSProperties) : undefined}
    >
      {STAGE_STATUS_STEPS.map(([key, text], n) => (
        <li key={key}>
          <button
            className={n < ix ? 'past' : n === ix ? 'now' : ''}
            aria-pressed={n === ix}
            onClick={() => onChange(key)}
          >
            <span className="dot">{n < ix ? '✓' : n + 1}</span>
            {text}
          </button>
        </li>
      ))}
    </ol>
  )
}
