import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  PaperPlaneTilt,
  Trophy,
  XCircle,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { ExcalidrawBoard, type ExcalidrawBoardHandle } from '../../components/study/ExcalidrawBoard'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import { challengeDifficultyIcon } from '../../components/worlds/worldsIcons'
import { errorMessage } from '../../lib/errors'
import type { StudyBoardScene } from '../../lib/studyProtocol'
import {
  DIFFICULTY_LABEL,
  type ChallengeAnswerPayload,
  type ChallengeDetail,
  type ChallengeQuestionPublic,
} from '../../lib/worldsTypes'
import { AccentPicker } from '../../components/AccentPicker'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useTheme } from '../../theme'

interface Props {
  challengeId: number
  onBack: () => void
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

function isBoardQuestion(q: ChallengeQuestionPublic) {
  return q.kind === 'board_prompt' || q.requires_board
}

function formatSaidAnswer(q: ChallengeQuestionPublic) {
  if (isBoardQuestion(q)) {
    const extra = (q.user_answer ?? '').trim()
    if (!extra || extra.startsWith('{') || extra.startsWith('[')) return 'Lo dibujaste'
    return `Lo dibujaste. ${extra}`
  }
  return formatUserAnswer(q, q.user_answer)
}

function formatExpectedAnswer(q: ChallengeQuestionPublic) {
  if (isBoardQuestion(q)) {
    const expected = (q.correct_answer ?? '').trim()
    return expected || '—'
  }
  return formatUserAnswer(q, q.correct_answer)
}

function reviewCheer(correct: number, total: number) {
  if (total === 0) return '¡Listo!'
  const ratio = correct / total
  if (ratio >= 0.8) return '¡Genial!'
  if (ratio >= 0.5) return '¡Buen intento!'
  return '¡Seguí practicando!'
}

export function ChallengePlayPage({ challengeId, onBack }: Props) {
  const { theme } = useTheme()
  const [detail, setDetail] = useState<ChallengeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [pending, setPending] = useState<Record<number, ChallengeAnswerPayload>>({})
  const [showResult, setShowResult] = useState(false)
  const boardRef = useRef<ExcalidrawBoardHandle>(null)
  const abandonedRef = useRef(false)
  const [boardScene] = useState<StudyBoardScene>({
    type: 'excalidraw',
    version: 2,
    source: 'taskia',
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  })

  const isCompleted =
    showResult || detail?.challenge.status === 'completed'

  async function leaveChallenge() {
    if (!abandonedRef.current && !isCompleted) {
      abandonedRef.current = true
      try {
        await api.abandonChallenge(challengeId)
      } catch {
        // ignore
      }
    }
    onBack()
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const next = await api.getChallenge(challengeId)
        setDetail(next)
        if (next.challenge.status === 'completed') {
          setShowResult(true)
        } else {
          setCursor(0)
          setPending({})
        }
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [challengeId])

  const questions = detail?.questions ?? []
  const current = !showResult && questions.length > 0 ? questions[cursor] ?? null : null
  const isLast = cursor >= questions.length - 1

  const progress = useMemo(() => {
    const total = questions.length
    const answeredLocal = Object.keys(pending).length
    const currentIndex = showResult
      ? total
      : Math.min(answeredLocal + (current ? 1 : 0), total)
    return {
      answered: answeredLocal,
      total,
      currentIndex,
      ratio: total > 0 ? currentIndex / total : 0,
      label: total > 0 ? `${Math.min(cursor + 1, total)}/${total}` : '0/0',
    }
  }, [questions.length, pending, current, cursor, showResult])

  async function onSubmit() {
    if (!current || submitting || !detail) return
    setSubmitting(true)
    setError(null)
    try {
      let userAnswer = answer.trim()
      let boardJson: StudyBoardScene | null = null

      if (
        current.kind === 'multiple_choice' &&
        current.options &&
        current.options.length >= 2
      ) {
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

      const nextPending: Record<number, ChallengeAnswerPayload> = {
        ...pending,
        [current.id]: {
          question_id: current.id,
          user_answer: userAnswer,
          board_json: boardJson,
        },
      }
      setPending(nextPending)
      setAnswer('')
      setSelectedOption(null)

      if (!isLast) {
        setCursor((c) => c + 1)
        return
      }

      // Una sola petición al final: corrección + guardado
      const payload = questions.map((q) => {
        const saved = nextPending[q.id]
        if (!saved) throw new Error('Faltan respuestas')
        return saved
      })
      const completed = await api.completeChallenge(challengeId, payload)
      setDetail(completed)
      setShowResult(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="worlds-shell">
        <div className="boot-screen study-boot">
          <WorldsIconBadge icon={Trophy} size="lg" tone="warn" />
          <p className="brand">Desafío</p>
          <p className="muted">Cargando…</p>
        </div>
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="worlds-shell">
        <nav className="worlds-nav">
          <button type="button" className="ghost worlds-back" onClick={() => void leaveChallenge()}>
            <ArrowLeft size={18} weight="bold" />
            Volver
          </button>
        </nav>
        <p className="form-error banner">{error}</p>
      </div>
    )
  }

  if (showResult && detail) {
    const score = detail.challenge.score ?? 0
    const correct = detail.questions.filter((q) => q.is_correct).length
    const total = detail.questions.length
    const ratioPct = total > 0 ? Math.round((correct / total) * 100) : 0
    const DiffIcon = challengeDifficultyIcon(detail.challenge.difficulty)
    const cheer = reviewCheer(correct, total)
    const showDots = total > 0 && total <= 24

    function scrollToQuestion(id: number) {
      document.getElementById(`review-q-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }

    return (
      <div className="worlds-shell challenge-review">
        <nav className="worlds-nav">
          <button type="button" className="ghost worlds-back" onClick={onBack}>
            <ArrowLeft size={18} weight="bold" />
            Volver
          </button>
          <div className="worlds-nav-tools">
            <AccentPicker />
            <ThemeToggle />
          </div>
        </nav>

        <div className="worlds-content worlds-stage challenge-review-layout">
          <header className="challenge-review-summary">
            <p className="challenge-review-cheer">{cheer}</p>
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
                {showDots && (
                  <div className="challenge-review-dots" role="list" aria-label="Resultado por pregunta">
                    {detail.questions.map((q, index) => {
                      const ok = Boolean(q.is_correct)
                      return (
                        <button
                          key={q.id}
                          type="button"
                          role="listitem"
                          className={`challenge-review-dot${ok ? ' is-ok' : ' is-bad'}`}
                          aria-label={`Pregunta ${index + 1}: ${ok ? 'bien' : 'para practicar'}`}
                          onClick={() => scrollToQuestion(q.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="challenge-review-answers-panel" aria-label="Preguntas">
            <div className="challenge-review-scroll">
              <ul className="worlds-review-list">
                {detail.questions.map((q, index) => {
                  const ok = Boolean(q.is_correct)
                  return (
                    <li
                      key={q.id}
                      id={`review-q-${q.id}`}
                      className={`worlds-review-item${ok ? ' is-ok' : ' is-bad'}`}
                    >
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
                      {!ok && (
                        <div className="worlds-review-miss">
                          <p className="worlds-review-yours">
                            Dijiste: <strong>{formatSaidAnswer(q)}</strong>
                          </p>
                          <p className="worlds-review-right">
                            {isBoardQuestion(q) ? 'Se esperaba: ' : 'La respuesta era: '}
                            <strong>{formatExpectedAnswer(q)}</strong>
                          </p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (!detail || !current) {
    return (
      <div className="worlds-shell">
        <nav className="worlds-nav">
          <button type="button" className="ghost worlds-back" onClick={() => void leaveChallenge()}>
            <ArrowLeft size={18} weight="bold" />
            Volver
          </button>
        </nav>
        <p className="muted worlds-center-text">No hay más preguntas.</p>
      </div>
    )
  }

  const DiffIcon = challengeDifficultyIcon(detail.challenge.difficulty)

  return (
    <div className="worlds-shell challenge-play">
      <nav className="worlds-nav">
        <button type="button" className="ghost worlds-back" onClick={() => void leaveChallenge()}>
          <ArrowLeft size={18} weight="bold" />
          Salir
        </button>
        <div className="worlds-nav-tools">
          <AccentPicker />
          <ThemeToggle />
        </div>
      </nav>

      <div className="worlds-content worlds-stage">
        <header className="worlds-hero worlds-hero--compact">
          <WorldsIconBadge icon={DiffIcon} size="lg" tone="warn" />
          <h1 className="worlds-hero-title">Desafío</h1>
          <p className="worlds-hero-lead">
            {DIFFICULTY_LABEL[detail.challenge.difficulty] ?? detail.challenge.difficulty} ·{' '}
            {progress.label}
          </p>
        </header>

        <div className="challenge-play-body">
          <div
            className="worlds-progress"
            role="progressbar"
            aria-valuenow={progress.currentIndex}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label="Progreso del desafío"
          >
            <div className="worlds-progress-bar" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
          <div className="worlds-progress-steps" aria-hidden>
            {questions.map((q, i) => {
              const done = i < cursor || pending[q.id] != null
              const active = i === cursor
              return (
                <span
                  key={q.id}
                  className={`worlds-progress-dot${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                />
              )
            })}
          </div>

          <p className="challenge-prompt">{current.prompt}</p>

          {current.kind === 'multiple_choice' &&
            current.options &&
            current.options.length >= 2 && (
              <div className="challenge-options worlds-choice" role="group">
                {current.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i)
                  const value = letter
                  return (
                    <button
                      key={opt + i}
                      type="button"
                      className={`challenge-option worlds-choice-btn${selectedOption === value ? ' is-selected' : ''}`}
                      onClick={() => setSelectedOption(value)}
                      disabled={submitting}
                    >
                      <strong className="worlds-choice-letter">{letter}</strong>
                      <span>{opt.replace(/^[A-D][).:\-]\s*/i, '')}</span>
                    </button>
                  )
                })}
              </div>
            )}

          {(current.kind === 'short_text' ||
            current.kind === 'fill_blank' ||
            (current.kind === 'multiple_choice' &&
              !(current.options && current.options.length >= 2))) && (
            <input
              className="field-control challenge-text-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                current.kind === 'multiple_choice'
                  ? 'Escribe tu respuesta'
                  : 'Tu respuesta'
              }
              disabled={submitting}
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
                disabled={submitting}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={() => void onSubmit()}
          >
            <PaperPlaneTilt size={18} weight="fill" />
            {submitting
              ? isLast
                ? 'Corrigiendo…'
                : 'Guardando…'
              : isLast
                ? 'Terminar'
                : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
