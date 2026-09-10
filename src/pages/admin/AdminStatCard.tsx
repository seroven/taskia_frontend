import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'

export function AdminStatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: PhosphorIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="admin-stat-card">
      <WorldsIconBadge icon={icon} size="md" />
      <div className="admin-stat-text">
        <p className="admin-stat-value">{value}</p>
        <p className="admin-stat-label">{label}</p>
        <p className="admin-stat-hint">{hint}</p>
      </div>
    </div>
  )
}
