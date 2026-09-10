import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../auth'
import { AppearanceTools } from '../components/AppearanceTools'
import { BrandLockup } from '../components/BrandLockup'
import { TextField, PasswordField } from '../components/ui/Field'
import { errorMessage } from '../lib/errors'
import { useToast } from '../toast'

export function AuthPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      const detail = errorMessage(err)
      showToast({
        title: 'No se pudo entrar',
        subtitle: detail.length > 90 ? `${detail.slice(0, 87)}…` : detail,
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-theme-slot">
        <AppearanceTools />
      </div>
      <motion.div
        className="auth-panel"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandLockup size="md" />
        <h1>¡Hola de nuevo!</h1>
        <p className="lede">
          Entra con el usuario que te dio un adulto. Tus tareas y mundos te esperan.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
          <TextField
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={3}
          />
          <PasswordField
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={6}
          />
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Un momento…' : '¡Entrar!'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
