import type { CSSProperties } from 'react'

interface ProgressBarProps {
  frac: number // 0..1
  color?: string // CSS color/var() for the fill
}

export function ProgressBar({ frac, color }: ProgressBarProps) {
  const style = (color ? { '--c': color } : undefined) as CSSProperties | undefined
  return (
    <div className="bar" style={style}>
      <i style={{ width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%` }} />
    </div>
  )
}
