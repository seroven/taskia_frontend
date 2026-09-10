import { useEffect, useMemo, useState } from 'react'
import { Play, Trophy } from '@phosphor-icons/react'
import { api } from '../../api'
import { WorldsModalShell } from './WorldsModalShell'
import { challengeDifficultyIcon } from './worldsIcons'
import { errorMessage } from '../../lib/errors'
import {
  DIFFICULTY_LABEL,
  type ChallengeDifficulty,
  type ChallengePreset,
  type ChallengeScope,
} from '../../lib/worldsTypes'
import { useToast } from '../../toast'

interface Props {
  open: boolean
  worldId: number
  scope: ChallengeScope
  courseId?: number | null
  missionId?: number | null
  title?: string
  onClose: () => void
  onStarted: (challengeId: number) => void
}

const ORDER: ChallengeDifficulty[] = ['warm', 'quest', 'boss']

export function ChallengeSetupModal({
  open,
  worldId,
  scope,
  courseId,
  missionId,
  title,
  onClose,
  onStarted,
}: Props) {
  const { showToast } = useToast()
  const [presets, setPresets] = useState<ChallengePreset[]>([])
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('warm')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDifficulty('warm')
    setLoading(true)
    void api
      .listChallengePresets()
      .then(setPresets)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [open])

  const options = useMemo(
    () =>
      ORDER.map((d) => {
        const preset = presets.find((p) => p.scope === scope && p.difficulty === d)
        return {
          difficulty: d,
          label: DIFFICULTY_LABEL[d] ?? d,
          count: preset?.question_count ?? 0,
          Icon: challengeDifficultyIcon(d),
        }
      }),
    [presets, scope],
  )

  async function onStart() {
    setStarting(true)
    setError(null)
    try {
      const detail = await api.startChallenge({
        world_id: worldId,
        scope,
        difficulty,
        course_id: courseId ?? null,
        mission_id: missionId ?? null,
      })
      showToast({
        tone: 'success',
        title: '¡Desafío listo!',
        subtitle: `${detail.questions.length} preguntas te esperan`,
      })
      onStarted(detail.challenge.id)
      onClose()
    } catch (err) {
      const msg = errorMessage(err)
      setError(msg)
      showToast({
        tone: 'warning',
        title: 'No se pudo iniciar',
        subtitle: msg,
      })
    } finally {
      setStarting(false)
    }
  }

  return (
    <WorldsModalShell
      open={open}
      onClose={onClose}
      titleId="challenge-setup-title"
      title="Nuevo desafío"
      lead={
        <>
          {title ? `Alcance: ${title}. ` : ''}
          Sin pistas del tutor: puedes volver a preguntas anteriores y cambiar tu respuesta.
        </>
      }
      icon={Trophy}
    >
            <div className="modal-panel-body">
              {loading && <p className="muted">Cargando dificultades…</p>}
              <div className="worlds-diff-grid" role="group" aria-label="Dificultad">
                {options.map((opt) => (
                  <button
                    key={opt.difficulty}
                    type="button"
                    className={`worlds-diff-btn${difficulty === opt.difficulty ? ' is-active' : ''}`}
                    onClick={() => setDifficulty(opt.difficulty)}
                    disabled={starting || loading}
                  >
                    <opt.Icon size={28} weight="duotone" />
                    <strong>{opt.label}</strong>
                    <span>{opt.count || '—'} preguntas</span>
                  </button>
                ))}
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={starting}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={starting || loading}
                  onClick={() => void onStart()}
                >
                  <Play size={18} weight="fill" />
                  {starting ? 'Generando preguntas…' : '¡Empezar!'}
                </button>
              </div>
            </div>
    </WorldsModalShell>
  )
}
