import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlobeHemisphereWest, Plus } from '@phosphor-icons/react'
import { TextAreaField, TextField } from '../ui/Field'
import { WorldsIconBadge } from './WorldsIconBadge'
import { errorMessage } from '../../lib/errors'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (title: string, description?: string) => Promise<void>
}

export function CreateWorldModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setError(null)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Ponle un nombre a tu mundo')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate(title.trim(), description.trim() || undefined)
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
            aria-labelledby="create-world-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header worlds-modal-header">
              <WorldsIconBadge icon={GlobeHemisphereWest} size="lg" />
              <div>
                <h2 id="create-world-title">Nuevo mundo</h2>
                <p className="lede">
                  Un mundo agrupa las materias y misiones que quieres estudiar.
                </p>
              </div>
            </div>
            <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Nombre"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Mi año escolar"
                autoFocus
              />
              <TextAreaField
                label="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿De qué trata este mundo?"
                rows={3}
              />
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  <Plus size={18} weight="bold" />
                  {submitting ? 'Creando…' : 'Crear mundo'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
