import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { WorldsIconBadge } from './WorldsIconBadge'

export function WorldsHero({
  icon,
  title,
  lead,
  actions,
  compact = false,
}: {
  icon: Icon
  title: string
  lead?: ReactNode
  actions?: ReactNode
  compact?: boolean
}) {
  return (
    <header
      className={`worlds-hero${compact ? ' worlds-hero--compact' : ' worlds-hero--page'}`}
    >
      <WorldsIconBadge icon={icon} size="lg" />
      {compact ? (
        <>
          <h1 className="worlds-hero-title">{title}</h1>
          {lead ? <p className="worlds-hero-lead">{lead}</p> : null}
        </>
      ) : (
        <>
          <div className="worlds-hero-copy">
            <h1 className="worlds-hero-title">{title}</h1>
            {lead ? <p className="worlds-hero-lead">{lead}</p> : null}
          </div>
          {actions ? <div className="worlds-hero-actions">{actions}</div> : null}
        </>
      )}
    </header>
  )
}
