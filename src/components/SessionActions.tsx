import { LogoutButton } from './LogoutButton'
import { UserChip } from './UserChip'

export function SessionActions() {
  return (
    <div className="session-actions">
      <UserChip />
      <LogoutButton />
    </div>
  )
}
