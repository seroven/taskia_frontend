import type { ReactNode } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { WorldsIconBadge } from './worlds/WorldsIconBadge'

export interface EmptyStateProps {
  icon: PhosphorIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}
      role="status"
    >
      <WorldsIconBadge
        icon={icon}
        size={compact ? 'lg' : 'xl'}
        tone={action ? 'accent' : 'muted'}
      />
      {compact ? (
        <p className="empty-state-title">{title}</p>
      ) : (
        <h2 className="empty-state-title">{title}</h2>
      )}
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  )
}
