import type { CSSProperties, ReactNode } from 'react'
import { useOverlay } from '../../hooks/useOverlay'

interface ModalProps {
  open: boolean
  onClose: () => void
  full?: boolean
  labelledBy?: string
  /** Applied directly to the modal root - see DrawerShell's note on why
   * this shouldn't be wrapped in an extra child div. */
  style?: CSSProperties
  children: ReactNode
}

export function Modal({ open, onClose, full, labelledBy, style, children }: ModalProps) {
  const ref = useOverlay<HTMLDivElement>(open, onClose)
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`.trim()} onClick={onClose} />
      <div
        ref={ref}
        className={`modal clay ${full ? 'full' : ''} ${open ? 'open' : ''}`.trim()}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </>
  )
}
