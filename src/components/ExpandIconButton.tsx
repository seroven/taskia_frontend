import type { ButtonHTMLAttributes } from 'react'
import type { Icon, IconWeight } from '@phosphor-icons/react'

type Variant = 'ghost' | 'primary' | 'accent'

export function ExpandIconButton({
  icon: IconCmp,
  label,
  variant = 'ghost',
  weight = 'duotone',
  className = '',
  title,
  ...props
}: {
  icon: Icon
  label: string
  variant?: Variant
  weight?: IconWeight
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`expand-btn expand-btn--${variant} ${className}`.trim()}
      title={title ?? label}
      {...props}
      aria-label={props['aria-label'] ?? label}
    >
      <IconCmp size={22} weight={weight} />
      <span className="expand-btn-label">
        <span className="expand-btn-label-inner">{label}</span>
      </span>
    </button>
  )
}
