import type { Icon, IconWeight } from '@phosphor-icons/react'

interface Props {
  icon: Icon
  size?: 'sm' | 'md' | 'lg' | 'xl'
  weight?: IconWeight
  tone?: 'accent' | 'muted' | 'success' | 'warn'
  className?: string
}

const SIZE_PX = {
  sm: 18,
  md: 24,
  lg: 32,
  xl: 40,
} as const

export function WorldsIconBadge({
  icon: IconCmp,
  size = 'md',
  weight = 'duotone',
  tone = 'accent',
  className = '',
}: Props) {
  return (
    <span
      className={`worlds-icon-badge worlds-icon-badge--${size} worlds-icon-badge--${tone} ${className}`.trim()}
      aria-hidden
    >
      <IconCmp size={SIZE_PX[size]} weight={weight} />
    </span>
  )
}
