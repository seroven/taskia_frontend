import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api'
import { ExcalidrawBoard, type ExcalidrawBoardHandle } from '../../components/study/ExcalidrawBoard'
import { errorMessage } from '../../lib/errors'
import type { StudyBoardScene } from '../../lib/studyProtocol'
import {
  DIFFICULTY_LABEL,
  type ChallengeDetail,
  type ChallengeQuestionPublic,
} from '../../lib/worldsTypes'
import { useTheme } from '../../theme'
import { useToast } from '../../toast'

interface Props {
  challengeId: number
  onBack: () => void
}

export function ChallengePlayPage({ challengeId, onBack }: Props) {
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [detail, setDetail] = useState<ChallengeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null)
  const [finishedScore, setFinishedScore] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const boardRef = useRef<ExcalidrawBoardHandle>(null)
  const [boardScene] = useState<StudyBoardScene>({
    type: 'excalidraw',
    version: 2,
    source: 'taskia',
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  })

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const next = await api.getChallenge(challengeId)
        setDetail(next)
        if (next.challenge.status === 'completed' && next.challenge.score != null) {
          setFinishedScore(next.challenge.score)
          setShowResult(true)
        }
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [challengeId])

  const current: ChallengeQuestionPublic | null = useMemo(() => {
    if (!detail) return null
    const unanswered = detail.questions.find((q) => !q.answered)
    return unanswered ?? null
  }, [detail])

  const progressLabel = useMemo(() => {
    if (!detail) return ''
    const answered = detail.questions.filter((q) => q.answered).length
    return `${Math.min(answered + (current ? 1 : 0), detail.questions.length)}/${detail.questions.length}`
  }, [detail, current])

  async function onSubmit() {
    if (!current || submitting) return
    setSubmitting(true)
    setFeedback(null)
    try {
      let userAnswer: string | null = answer.trim() || null
      let boardJson: StudyBoardScene | null = null

      if (current.kind === 'multiple_choice') {
        if (!selectedOption) {
          setError('Elige una opción')
          setSubmitting(false)
          return
        }
        userAnswer = selectedOption
      } else if (current.requires_board || current.kind === 'board_prompt') {
        boardJson = boardRef.current?.getScene() ?? null
        if (!userAnswer) userAnswer = '(respuesta en pizarra)'
      } else if (!userAnswer) {
        setError('Escribe tu respuesta')
        setSubmitting(false)
        return
      }

      const result = await api.submitChallengeAnswer(current.id, userAnswer, boardJson)
      setFeedback(result.is_correct ? 'ok' : 'bad')

      const refreshed = await api.getChallenge(challengeId)
      setDetail(refreshed)
      setAnswer('')
      setSelectedOption(null)

      if (result.completed) {
        setFinishedScore(result.score)
        showToast({
          tone: 'success',
          title: 'Desafío terminado',
          subtitle: `Puntaje: ${result.score ?? 0}/100`,
        })
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function clearFeedbackAndContinue() {
    setFeedback(null)
    setError(null)
    if (finishedScore != null) {
      setShowResult(true)
    }
  }

  if (loading) {
    return (
      <div className="worlds-shell">
        <div className="boot-screen study-boot">
          <p className="brand">Desafío</p>
          <p className="muted">Cargando…</p>
        </div>
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="worlds-shell">
        <header className="topbar">
          <button type="button" className="ghost" onClick={onBack}>
            ← Volver
          </button>
        </header>
        <p className="form-error banner">{error}</p>
      </div>
    )
  }

  if (showResult || (detail && detail.challenge.status === 'completed' && !current && feedback == null)) {
    const score = finishedScore ?? detail?.challenge.score ?? 0
    const correct = detail?.questions.filter((q) => q.is_correct).length ?? 0
    const total = detail?.questions.length ?? 0
    return (
      <div className="worlds-shell">
        <div className="worlds-challenge-result">
          <p className="brand">¡Listo!</p>
          <h1 className="worlds-score">{score}</h1>
          <p className="muted">
            de 100 · {correct}/{total} aciertos
          </p>
          <button type="button" className="primary" onClick={onBack}>
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (!detail || !current) {
    return (
      <div className="worlds-shell">
        <header className="topbar">
          <button type="button" className="ghost" onClick={onBack}>
            ← Volver
          </button>
        </header>
        <p className="muted">No hay más preguntas.</p>
      </div>
    )
  }

  return (
    <div className="worlds-shell challenge-play">
      <header className="topbar">
        <div>
          <button type="button" className="ghost worlds-back" onClick={onBack}>
            ← Salir
          </button>
          <p className="brand">Desafío</p>
          <p className="welcome">
            {DIFFICULTY_LABEL[detail.challenge.difficulty] ?? detail.challenge.difficulty} ·{' '}
            {progressLabel}
          </p>
        </div>
      </header>

      <div className="worlds-content challenge-play-body">
        <p className="challenge-prompt">{current.prompt}</p>

        {current.kind === 'multiple_choice' && current.options && (
          <div className="challenge-options" role="group">
            {current.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              const value = letter
              return (
                <button
                  key={opt + i}
                  type="button"
                  className={`challenge-option${selectedOption === value ? ' is-selected' : ''}`}
                  onClick={() => setSelectedOption(value)}
                  disabled={submitting || feedback != null}
                >
                  <strong>{letter}</strong>
                  <span>{opt.replace(/^[A-D][).:\-]\s*/i, '')}</span>
                </button>
              )
            })}
          </div>
        )}

        {(current.kind === 'short_text' || current.kind === 'fill_blank') && (
          <input
            className="field-control challenge-text-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Tu respuesta"
            disabled={submitting || feedback != null}
          />
        )}

        {(current.requires_board || current.kind === 'board_prompt') && (
          <div className="challenge-board">
            <ExcalidrawBoard
              key={`challenge-q-${current.id}-${theme}`}
              ref={boardRef}
              initialBoard={boardScene}
              onSave={() => {}}
              theme={theme}
            />
            <input
              className="field-control challenge-text-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Opcional: escribe una nota breve"
              disabled={submitting || feedback != null}
            />
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {feedback == null ? (
          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={() => void onSubmit()}
          >
            {submitting ? 'Corrigiendo…' : 'Enviar'}
          </button>
        ) : (
          <div className="challenge-feedback">
            <p className={feedback === 'ok' ? 'challenge-ok' : 'challenge-bad'}>
              {feedback === 'ok' ? '¡Bien!' : 'Siguiente'}
            </p>
            <button type="button" className="primary" onClick={clearFeedbackAndContinue}>
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
