import type { ReactNode } from 'react'
import { useOverlay } from '../../hooks/useOverlay'

interface DrawerShellProps {
  open: boolean
  onClose: () => void
  focusMode?: boolean
  ariaLabel?: string
  children: ReactNode
}

export function DrawerShell({ open, onClose, focusMode, ariaLabel = 'Details', children }: DrawerShellProps) {
  const ref = useOverlay<HTMLElement>(open, onClose)
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`.trim()} onClick={onClose} />
      <aside
        ref={ref}
        className={`drawer clay ${open ? 'open' : ''} ${focusMode ? 'focus' : ''}`.trim()}
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
