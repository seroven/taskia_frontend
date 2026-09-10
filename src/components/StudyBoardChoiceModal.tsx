import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpenText, PencilLine } from '@phosphor-icons/react'
import { api } from '../api'
import { WorldsIconBadge } from './worlds/WorldsIconBadge'
import { errorMessage } from '../lib/errors'
import { taskStudyPatch, type Task } from '../types'

interface Props {
  task: Task | null
  onClose: () => void
  onReady: (task: Task) => void
}

export function StudyBoardChoiceModal({ task, onClose, onReady }: Props) {
  const [usesBoard, setUsesBoard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!task) return
    setUsesBoard(task.uses_board)
    setError(null)
    setSaving(false)
  }, [task])

  async function onConfirm() {
    if (!task) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateTask(
        taskStudyPatch(task, {
          uses_board: usesBoard,
          study_mode_chosen: true,
        }),
      )
      onReady(updated)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {task && (
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
            aria-labelledby="study-board-choice-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header worlds-modal-header">
              <WorldsIconBadge icon={BookOpenText} size="lg" />
              <div>
                <h2 id="study-board-choice-title">¿Cómo quieres estudiar?</h2>
                <p className="lede">
                  {task.title}. Elige si vas a dibujar o solo a conversar con el tutor.
                </p>
              </div>
            </div>
            <div className="modal-panel-body">
              <div className="study-board-choice" role="group" aria-label="Modo de estudio">
                <button
                  type="button"
                  className={`study-board-choice-btn${usesBoard ? '' : ' is-active'}`}
                  onClick={() => setUsesBoard(false)}
                >
                  <WorldsIconBadge icon={BookOpenText} size="md" />
                  <strong>Solo charla</strong>
                  <span>Estudio guiado, como un tema de Mundos. Preguntas y práctica en el chat.</span>
                </button>
                <button
                  type="button"
                  className={`study-board-choice-btn${usesBoard ? ' is-active' : ''}`}
                  onClick={() => setUsesBoard(true)}
                >
                  <WorldsIconBadge icon={PencilLine} size="md" />
                  <strong>Con pizarra</strong>
                  <span>Dibujas y el tutor también puede marcar en la pizarra.</span>
                </button>
              </div>
              {error && <p className="form-error">{error}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={() => void onConfirm()}
              >
                {saving ? 'Abriendo…' : 'Estudiar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
