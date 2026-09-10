import { useEffect, useState, type FormEvent } from 'react'
import { PencilLine, Plus, Rocket } from '@phosphor-icons/react'
import { TextAreaField, TextField } from '../ui/Field'
import { WorldsModalShell } from './WorldsModalShell'
import { errorMessage } from '../../lib/errors'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (input: {
    title: string
    description?: string
    uses_board: boolean
  }) => Promise<void>
}

export function CreateMissionModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [usesBoard, setUsesBoard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setUsesBoard(false)
    setError(null)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Ponle un nombre a la misión')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        uses_board: usesBoard,
      })
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
      titleId="create-mission-title"
      title="Nueva misión"
      lead="Un tema para estudiar con el tutor. Luego podrás desafiarlo."
      icon={Rocket}
    >
      <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Fracciones equivalentes"
                autoFocus
              />
              <TextAreaField
                label="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <label className="worlds-switch-row">
                <input
                  type="checkbox"
                  checked={usesBoard}
                  onChange={(e) => setUsesBoard(e.target.checked)}
                />
                <span>
                  <strong className="worlds-switch-label">
                    <PencilLine size={18} weight="fill" />
                    ¿Usar pizarra?
                  </strong>
                  <span className="muted">
                    {' '}
                    Actívalo si el tema se practica dibujando (geometría, esquemas…).
                  </span>
                </span>
              </label>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  <Plus size={18} weight="bold" />
                  {submitting ? 'Creando…' : 'Crear misión'}
                </button>
              </div>
            </form>
    </WorldsModalShell>
  )
}
