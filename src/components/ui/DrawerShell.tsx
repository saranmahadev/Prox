import type { CSSProperties, ReactNode } from 'react'
import { useOverlay } from '../../hooks/useOverlay'

interface DrawerShellProps {
  open: boolean
  onClose: () => void
  focusMode?: boolean
  ariaLabel?: string
  /** Applied directly to the <aside> root (e.g. the `--c` accent variable) -
   * must NOT be wrapped in an extra child div, which would break the
   * .drawer{display:flex;flex-direction:column} chain that .dlg-main's
   * internal scrolling depends on. */
  style?: CSSProperties
  children: ReactNode
}

export function DrawerShell({ open, onClose, focusMode, ariaLabel = 'Details', style, children }: DrawerShellProps) {
  const ref = useOverlay<HTMLElement>(open, onClose)
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`.trim()} onClick={onClose} />
      <aside
        ref={ref}
        className={`drawer clay ${open ? 'open' : ''} ${focusMode ? 'focus' : ''}`.trim()}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={ariaLabel}
      >
        {children}
      </aside>
    </>
  )
}
