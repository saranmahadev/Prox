import { useUiStore } from '../../state/useUiStore'

export function Toast() {
  const message = useUiStore((s) => s.toastMessage)
  const visible = useUiStore((s) => s.toastVisible)
  return (
    <div className={`toast clay ${visible ? 'show' : ''}`.trim()} role="status">
      {message}
    </div>
  )
}
