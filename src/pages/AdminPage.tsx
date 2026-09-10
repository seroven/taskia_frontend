import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, UserPlus } from '@phosphor-icons/react'
import { api } from '../api'
import { AppearanceTools } from '../components/AppearanceTools'
import { BrandLockup } from '../components/BrandLockup'
import { SessionActions } from '../components/SessionActions'
import { PasswordField, TextField } from '../components/ui/Field'
import { WorldsIconBadge } from '../components/worlds/WorldsIconBadge'
import { errorMessage } from '../lib/errors'
import { useToast } from '../toast'
import { AdminDashboard } from './admin/AdminDashboard'
import { AdminStudentPage } from './admin/AdminStudentPage'

export function AdminPage() {
  const { showToast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className="worlds-shell admin-shell">
      <header className="topbar">
        <div>
          <BrandLockup />
          <p className="welcome">Panel de administrador</p>
        </div>
        <div className="topbar-actions">
          <AppearanceTools />
          <SessionActions />
        </div>
      </header>

      <div className="admin-body">
        <AnimatePresence mode="wait">
          {selectedId == null ? (
            <motion.div
              key="dashboard"
              className="admin-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <AdminDashboard
                onOpenStudent={setSelectedId}
                onCreateStudent={() => setCreateOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key={selectedId}
              className="admin-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <AdminStudentPage
                studentId={selectedId}
                onBack={() => setSelectedId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateStudentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          const created = await api.createStudent(input)
          showToast({
            tone: 'success',
            title: 'Alumno listo',
            subtitle: `${created.username} ya puede entrar.`,
          })
          setCreateOpen(false)
          setSelectedId(created.id)
        }}
      />
    </div>
  )
}

function CreateStudentModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (input: {
    username: string
    email: string
    password: string
  }) => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setUsername('')
    setEmail('')
    setPassword('')
    setError(null)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        username: username.trim(),
        email: email.trim(),
        password,
      })
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
            aria-labelledby="create-student-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header worlds-modal-header">
              <WorldsIconBadge icon={UserPlus} size="lg" />
              <div>
                <h2 id="create-student-title">Nuevo alumno</h2>
                <p className="lede">
                  Con este usuario y contraseña podrá entrar al tablero.
                </p>
              </div>
            </div>
            <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
                minLength={3}
                autoFocus
              />
              <TextField
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
              <PasswordField
                label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  <Plus size={18} weight="bold" />
                  {submitting ? 'Creando…' : 'Crear alumno'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
