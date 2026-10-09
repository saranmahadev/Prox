import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'primary' | 'danger' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  on?: boolean // for variant="icon": active/pressed visual state
}

export function Button({ variant = 'default', on, className = '', ...props }: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : variant === 'icon' ? 'icon' : ''
  const onClass = variant === 'icon' && on ? 'on' : ''
  return <button className={`btn ${variantClass} ${onClass} ${className}`.trim()} {...props} />
}

export function CloseButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn x ${className}`.trim()} aria-label="Close" {...props}>
      ✕
    </button>
  )
}
