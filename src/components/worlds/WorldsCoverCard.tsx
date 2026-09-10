import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { WorldsIconBadge } from './WorldsIconBadge'

type CoverKind = 'world' | 'course' | 'mission'

export function WorldsCoverCard({
  kind,
  icon,
  title,
  description,
  hint,
  tags,
  status,
  overlayAction,
  onClick,
}: {
  kind: CoverKind
  icon: Icon
  title: string
  description?: string | null
  hint: string
  tags?: ReactNode
  status?: string
  overlayAction?: ReactNode
  onClick: () => void
}) {
  const card = (
    <button
      type="button"
      className={`worlds-cover worlds-cover--${kind}${status ? ` worlds-cover--${status}` : ''}`}
      onClick={onClick}
    >
      <span className="worlds-cover-art" aria-hidden>
        <WorldsIconBadge icon={icon} size={kind === 'mission' ? 'lg' : 'xl'} />
      </span>
      <span className="worlds-cover-body">
        <span className="worlds-cover-title">{title}</span>
        {description ? (
          <span className="worlds-cover-desc muted">{description}</span>
        ) : null}
        {tags}
      </span>
      <span className="worlds-cover-cta">{hint}</span>
    </button>
  )

  if (!overlayAction) return card

  return <div className="worlds-cover-wrap">{card}{overlayAction}</div>
}
