import { useEffect, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { api } from '../../api'
import { ChallengeReviewAnswersList } from '../../components/worlds/ChallengeReviewAnswersList'
import { challengeDifficultyIcon } from '../../components/worlds/worldsIcons'
import { errorMessage } from '../../lib/errors'
import {
  DIFFICULTY_LABEL,
  SCOPE_LABEL,
  type ChallengeDetail,
} from '../../lib/worldsTypes'

interface Props {
  studentId: number
  challengeId: number
  onBack: () => void
}

export function AdminChallengeReview({ studentId, challengeId, onBack }: Props) {
  const [detail, setDetail] = useState<ChallengeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setDetail(await api.getAdminStudentChallenge(studentId, challengeId))
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [studentId, challengeId])

  if (loading) {
    return <p className="muted">Cargando desafío…</p>
  }

  if (error || !detail) {
    return (
      <div>
        <button type="button" className="ghost" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Volver
        </button>
        <p className="form-error banner">{error ?? 'No se pudo abrir el desafío'}</p>
      </div>
    )
  }

  const score = detail.challenge.score ?? 0
  const correct = detail.questions.filter((q) => q.is_correct).length
  const total = detail.questions.length
  const ratioPct = total > 0 ? Math.round((correct / total) * 100) : 0
  const DiffIcon = challengeDifficultyIcon(detail.challenge.difficulty)

  return (
    <div className="admin-challenge-review">
      <button type="button" className="ghost" onClick={onBack}>
        <ArrowLeft size={18} weight="bold" />
        Desafíos
      </button>

      <header className="challenge-review-summary">
        <p className="challenge-review-cheer">
          {SCOPE_LABEL[detail.challenge.scope] ?? detail.challenge.scope}
        </p>
        <div
          className="challenge-review-scorecard"
          aria-label={`${correct} de ${total} bien. ${score} puntos`}
        >
          <div
            className="challenge-review-ring"
            style={{ ['--pct' as string]: `${ratioPct}%` }}
            aria-hidden
          >
            <div className="challenge-review-ring-inner">
              <strong>{correct}</strong>
              <span>de {total}</span>
            </div>
          </div>
          <div className="challenge-review-score-text">
            <p className="challenge-review-count-label">respuestas bien</p>
            <p className="challenge-review-meta">
              <span>{score} pts</span>
              <span className="challenge-review-diff-pill">
                <DiffIcon size={14} weight="duotone" />
                {DIFFICULTY_LABEL[detail.challenge.difficulty] ??
                  detail.challenge.difficulty}
              </span>
            </p>
          </div>
        </div>
      </header>

      <ChallengeReviewAnswersList
        questions={detail.questions}
        scope={detail.challenge.scope}
        voice="admin"
      />
    </div>
  )
}
