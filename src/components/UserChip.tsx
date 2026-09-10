import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { User } from '@phosphor-icons/react'
import { api } from '../api'
import { useAuth } from '../auth'
import { errorMessage } from '../lib/errors'
import { useToast } from '../toast'
import { ExpandIconButton } from './ExpandIconButton'
import { PasswordField, TextField } from './ui/Field'
import { WorldsIconBadge } from './worlds/WorldsIconBadge'

export function UserChip() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return null

  return (
    <>
      <ExpandIconButton
        icon={User}
        label={user.username}
        variant="accent"
        aria-label={`Mi cuenta: ${user.username}`}
        title="Mi cuenta"
        onClick={() => setOpen(true)}
      />
      <AccountModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function AccountModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setUsername(user.username)
    setEmail(user.email)
    setPassword('')
    setError(null)
  }, [open, user])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const next = await api.updateMe({
        username: username.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
      })
      setUser(next)
      setPassword('')
      showToast({
        tone: 'success',
        title: 'Cuenta actualizada',
        subtitle: 'Tus datos quedaron guardados.',
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-panel"
            role="dialog"
            aria-labelledby="account-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header worlds-modal-header">
              <WorldsIconBadge icon={User} size="lg" />
              <div>
                <h2 id="account-title">Tu cuenta</h2>
                <p className="lede">
                  Cambia tu usuario, correo o contraseña cuando quieras.
                </p>
              </div>
            </div>
            <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                minLength={3}
                autoFocus
              />
              <TextField
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <PasswordField
                label="Nueva contraseña (opcional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                placeholder="Déjala vacía si no la cambias"
              />
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
