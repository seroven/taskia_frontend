import { SignOut } from '@phosphor-icons/react'
import { useAuth } from '../auth'

export function LogoutButton() {
  const { logout } = useAuth()

  return (
    <button
      type="button"
      className="session-icon-btn"
      onClick={() => void logout()}
      aria-label="Salir"
      title="Salir"
    >
      <SignOut size={22} weight="bold" />
    </button>
  )
}
