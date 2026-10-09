import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

/** Auto-growing single/multi-line textarea, ported from legacy's growTA(). */
export function AutoGrowTextarea({ value, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return <textarea ref={ref} rows={1} value={value} className={className} {...props} />
}
