import { useEffect, useRef } from 'react'

/**
 * Shared overlay mechanics for Modal/DrawerShell: autofocus on open,
 * Escape-to-close, a Tab focus-trap scoped to the overlay element, and
 * returning focus to whatever was focused before opening. Ported from the
 * legacy openPanel/closePanel/keydown handler (legacy/index.html ~1456-1478).
 */
export function useOverlay<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement as HTMLElement | null
    const el = ref.current

    const focusTimer = setTimeout(() => {
      const target = el?.querySelector<HTMLElement>('input[type=text]') ?? el?.querySelector<HTMLElement>('.x')
      target?.focus()
    }, 60)

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && el) {
        const focusable = [...el.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,select')].filter(
          (x) => x.offsetParent !== null,
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(focusTimer)
      removeEventListener('keydown', onKeyDown)
      if (lastFocus.current && document.contains(lastFocus.current)) lastFocus.current.focus()
    }
  }, [open, onClose])

  return ref
}
