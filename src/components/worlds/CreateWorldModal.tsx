import { useEffect, useState, type FormEvent } from 'react'
import { GlobeHemisphereWest, Plus } from '@phosphor-icons/react'
import { TextAreaField, TextField } from '../ui/Field'
import { WorldsModalShell } from './WorldsModalShell'
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
    <WorldsModalShell
      open={open}
      onClose={onClose}
      titleId="create-world-title"
      title="Nuevo mundo"
      lead="Un mundo agrupa los cursos y misiones que quieres estudiar."
      icon={GlobeHemisphereWest}
    >
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
    </WorldsModalShell>
  )
}
