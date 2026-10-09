import type { ButtonHTMLAttributes, CSSProperties } from 'react'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
  dot?: boolean
  color?: string // CSS color/var() used for --c (dot + pressed background)
  count?: number | string
}

export function Chip({ pressed, dot, color, count, className = '', style, children, ...props }: ChipProps) {
  const mergedStyle = (color ? { ...style, '--c': color } : style ?? {}) as CSSProperties
  return (
    <button className={`chip ${className}`.trim()} aria-pressed={pressed} style={mergedStyle} {...props}>
      {dot && <span className="dot" />}
      {children}
      {count !== undefined && <em>{count}</em>}
    </button>
  )
}
