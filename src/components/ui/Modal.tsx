import type { ReactNode } from 'react'
import { useOverlay } from '../../hooks/useOverlay'

interface ModalProps {
  open: boolean
  onClose: () => void
  full?: boolean
  labelledBy?: string
  children: ReactNode
}

export function Modal({ open, onClose, full, labelledBy, children }: ModalProps) {
  const ref = useOverlay<HTMLDivElement>(open, onClose)
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`.trim()} onClick={onClose} />
      <div
        ref={ref}
        className={`modal clay ${full ? 'full' : ''} ${open ? 'open' : ''}`.trim()}
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
