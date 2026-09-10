import { Fragment, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle } from '@phosphor-icons/react'
import { api } from '../../api'
import { challengeDifficultyIcon } from '../../components/worlds/worldsIcons'
import { errorMessage } from '../../lib/errors'
import {
  DIFFICULTY_LABEL,
  SCOPE_LABEL,
  type ChallengeDetail,
  type ChallengeQuestionPublic,
} from '../../lib/worldsTypes'

interface Props {
  studentId: number
  challengeId: number
  onBack: () => void
}

function isBoardQuestion(q: ChallengeQuestionPublic) {
  return q.kind === 'board_prompt' || q.requires_board
}

function formatUserAnswer(q: ChallengeQuestionPublic, raw: string | null | undefined) {
  const text = (raw ?? q.user_answer ?? '').trim()
  if (!text) return '—'
  if (q.kind === 'multiple_choice' && q.options && /^[A-D]$/i.test(text)) {
    const idx = text.toUpperCase().charCodeAt(0) - 65
    const opt = q.options[idx]
    return opt ? `${text.toUpperCase()}. ${opt}` : text.toUpperCase()
  }
  return text
}

function formatSaidAnswer(q: ChallengeQuestionPublic) {
  if (isBoardQuestion(q)) {
    const extra = (q.user_answer ?? '').trim()
    if (!extra || extra.startsWith('{') || extra.startsWith('[')) return 'Lo dibujó'
    return `Lo dibujó. ${extra}`
  }
  return formatUserAnswer(q, q.user_answer)
}

function formatExpectedAnswer(q: ChallengeQuestionPublic) {
  if (isBoardQuestion(q)) {
    return (q.correct_answer ?? '').trim() || '—'
  }
  return formatUserAnswer(q, q.correct_answer)
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

      <ul className="worlds-review-list">
        {detail.questions.map((q, index) => {
          const ok = Boolean(q.is_correct)
          const prevCourse =
            index > 0 ? detail.questions[index - 1]?.course_name : null
          const showCourse =
            detail.challenge.scope === 'world' &&
            Boolean(q.course_name) &&
            q.course_name !== prevCourse
          const isMc =
            q.kind === 'multiple_choice' &&
            Boolean(q.options && q.options.length >= 2)
          return (
            <Fragment key={q.id}>
              {showCourse && (
                <li className="worlds-review-course-row">{q.course_name}</li>
              )}
              <li className={`worlds-review-item${ok ? ' is-ok' : ' is-bad'}`}>
                <div className="worlds-review-head">
                  <span
                    className={`worlds-review-badge${ok ? ' is-ok' : ' is-bad'}`}
                    aria-hidden
                  >
                    {ok ? (
                      <CheckCircle size={20} weight="fill" />
                    ) : (
                      <XCircle size={20} weight="fill" />
                    )}
                  </span>
                  <span className="worlds-review-num">{index + 1}</span>
                  <p className="worlds-review-prompt">{q.prompt}</p>
                </div>
                <div className="worlds-review-miss">
                  <p className="worlds-review-yours">
                    Dijo: <strong>{formatSaidAnswer(q)}</strong>
                  </p>
                  {isMc ? (
                    <ul className="worlds-review-options">
                      {q.options!.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i)
                        const picked =
                          (q.user_answer ?? '').trim().toUpperCase() === letter
                        const correctKey = (q.correct_answer ?? '').trim()
                        const isCorrect =
                          correctKey.toUpperCase().startsWith(letter) ||
                          correctKey === opt
                        return (
                          <li
                            key={opt + i}
                            className={`worlds-review-option${isCorrect ? ' is-correct' : ''}${picked ? ' is-picked' : ''}`}
                          >
                            <strong>{letter}</strong>
                            <span>{opt.replace(/^[A-D][).:\-]\s*/i, '')}</span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className={`worlds-review-right${ok ? ' is-ok' : ''}`}>
                      {isBoardQuestion(q) ? 'Se esperaba: ' : 'La respuesta era: '}
                      <strong>{formatExpectedAnswer(q)}</strong>
                    </p>
                  )}
                </div>
              </li>
            </Fragment>
          )
        })}
      </ul>
    </div>
  )
}
