import { useEffect, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../AppLoader'
import { WorldsBoardPill } from './WorldsStatusPill'
import { WorldsModalShell } from './WorldsModalShell'
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
    <WorldsModalShell
      open={open}
      onClose={onClose}
      titleId="import-missions-title"
      title="Traer misiones"
      lead="Copia temas de otros mundos (mismo curso). El progreso empieza de cero."
      icon={DownloadSimple}
      wide
    >
            <div className="modal-panel-body">
              {loading && <AppLoader message="Buscando misiones…" variant="section" />}
              {!loading && items.length === 0 && (
                <p className="muted">No hay misiones de este curso en otros mundos.</p>
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
                        {item.uses_board ? <WorldsBoardPill /> : null}
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
                  <DownloadSimple size={18} weight="bold" />
                  {submitting ? 'Importando…' : 'Traer seleccionadas'}
                </button>
              </div>
            </div>
    </WorldsModalShell>
  )
}
