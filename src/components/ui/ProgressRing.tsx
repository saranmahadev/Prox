import type { CSSProperties, ReactNode } from 'react'

interface ProgressRingProps {
  frac: number // 0..1
  size?: number
  strokeWidth?: number
  color?: string // CSS color/var() for the filled arc
  label?: string // accessible label, e.g. "58% complete"
  /** Extra class for the icon-overlay variants (e.g. "pipe-ring", "pico") -
   * their CSS positions the overlay child via a scoped descendant selector
   * (`.pipe-ring .pipe-ico`, `.pico .pi`), so it must land on this root. */
  className?: string
  /** Overlay content (e.g. a pipeline icon) in place of the percentage label. */
  children?: ReactNode
}

export function ProgressRing({ frac, size = 64, strokeWidth = 9, color, label, className, children }: ProgressRingProps) {
  const r = size / 2 - strokeWidth / 2 - 1
  const c = 2 * Math.PI * r
  const pct = Math.round(frac * 100)
  const style = { '--s': `${size}px`, ...(color ? { '--c': color } : {}) } as CSSProperties

  return (
    <div className={`p-ring${className ? ` ${className}` : ''}`} style={style} role="img" aria-label={label ?? `${pct}% complete`}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} />
        <circle
          className="fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      {children ?? <b>{pct}%</b>}
    </div>
  )
}
