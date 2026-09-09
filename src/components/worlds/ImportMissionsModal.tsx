import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../../api'
import { errorMessage } from '../../lib/errors'
import type { ImportableMission } from '../../lib/worldsTypes'

interface Props {
  open: boolean
  worldId: number
  courseId: number
  onClose: () => void
  onImported: () => Promise<void> | void
}

export function ImportMissionsModal({
  open,
  worldId,
  courseId,
  onClose,
  onImported,
}: Props) {
  const [items, setItems] = useState<ImportableMission[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setError(null)
    setLoading(true)
    void api
      .listImportableMissions(worldId, courseId)
      .then(setItems)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [open, worldId, courseId])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit() {
    if (selected.size === 0) {
      setError('Elige al menos una misión')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.importMissions(worldId, courseId, [...selected])
      await onImported()
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
            className="modal-panel modal-panel-wide"
            role="dialog"
            aria-labelledby="import-missions-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header">
              <h2 id="import-missions-title">Traer misiones</h2>
              <p className="lede">
                Copia temas de otros mundos (misma materia). El progreso empieza de cero.
              </p>
            </div>
            <div className="modal-panel-body">
              {loading && <p className="muted">Buscando misiones…</p>}
              {!loading && items.length === 0 && (
                <p className="muted">No hay misiones de esta materia en otros mundos.</p>
              )}
              <ul className="worlds-check-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                      <span>
                        <strong>{item.title}</strong>
                        <span className="muted"> · {item.world_title}</span>
                        {item.uses_board && <span className="worlds-pill">Pizarra</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={submitting || items.length === 0}
                  onClick={() => void onSubmit()}
                >
                  {submitting ? 'Importando…' : 'Traer seleccionadas'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
