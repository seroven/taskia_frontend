import type { ReactNode } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { WorldsIconBadge } from './WorldsIconBadge'

interface Props {
  icon: PhosphorIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

export function WorldsEmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: Props) {
  return (
    <div className={`worlds-empty-hero${compact ? ' is-compact' : ''}`}>
      <WorldsIconBadge icon={icon} size={compact ? 'lg' : 'xl'} />
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  )
}
