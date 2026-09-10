import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CaretLeft,
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
import { AppearanceTools } from '../../components/AppearanceTools'
import { ExpandIconButton } from '../../components/ExpandIconButton'
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

const EMPTY_BOARD: StudyBoardScene = {
  type: 'excalidraw',
  version: 2,
  source: 'taskia',
  elements: [],
  appState: { viewBackgroundColor: '#ffffff' },
  files: {},
}

function asBoardScene(raw: unknown): StudyBoardScene {
  if (raw && typeof raw === 'object' && 'elements' in raw) {
    return raw as StudyBoardScene
  }
  return EMPTY_BOARD
}

export function ChallengePlayPage({ challengeId, onBack }: Props) {
  const { theme } = useTheme()
  const [detail, setDetail] = useState<ChallengeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [grading, setGrading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [pending, setPending] = useState<Record<number, ChallengeAnswerPayload>>({})
  const [showResult, setShowResult] = useState(false)
  const boardRef = useRef<ExcalidrawBoardHandle>(null)
  const abandonedRef = useRef(false)

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
    return {
      answered: answeredLocal,
      total,
      currentIndex: showResult ? total : Math.min(cursor + 1, total),
      ratio: total > 0 ? (cursor + 1) / total : 0,
      label: total > 0 ? `${Math.min(cursor + 1, total)}/${total}` : '0/0',
    }
  }, [questions.length, pending, cursor, showResult])

  function applySaved(
    q: ChallengeQuestionPublic,
    saved?: ChallengeAnswerPayload,
  ) {
    if (!saved) {
      setAnswer('')
      setSelectedOption(null)
      return
    }
    if (q.kind === 'multiple_choice' && q.options && q.options.length >= 2) {
      setSelectedOption(saved.user_answer)
      setAnswer('')
      return
    }
    setSelectedOption(null)
    setAnswer(
      saved.user_answer === '(respuesta en pizarra)' ? '' : saved.user_answer,
    )
  }

  function captureCurrent(): ChallengeAnswerPayload | null {
    if (!current) return null
    const isMc =
      current.kind === 'multiple_choice' &&
      Boolean(current.options && current.options.length >= 2)
    if (isMc) {
      if (!selectedOption) return pending[current.id] ?? null
      return { question_id: current.id, user_answer: selectedOption }
    }
    if (current.requires_board || current.kind === 'board_prompt') {
      const boardJson =
        boardRef.current?.getScene() ?? pending[current.id]?.board_json
      const note = answer.trim()
      if (!note && !boardJson) return pending[current.id] ?? null
      return {
        question_id: current.id,
        user_answer: note || '(respuesta en pizarra)',
        board_json: boardJson,
      }
    }
    if (!answer.trim()) return pending[current.id] ?? null
    return { question_id: current.id, user_answer: answer.trim() }
  }

  function goTo(index: number) {
    if (!current || submitting || grading || index < 0 || index >= questions.length) return
    const snap = captureCurrent()
    const nextPending = snap ? { ...pending, [current.id]: snap } : pending
    if (snap) setPending(nextPending)
    applySaved(questions[index]!, nextPending[questions[index]!.id])
    setError(null)
    setCursor(index)
  }

  async function onSubmit() {
    if (!current || submitting || grading || !detail) return
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

      if (!isLast) {
        const nextQ = questions[cursor + 1]
        if (nextQ) applySaved(nextQ, nextPending[nextQ.id])
        setCursor((c) => c + 1)
        return
      }

      const missing = questions.find((q) => !nextPending[q.id])
      if (missing) {
        const idx = questions.findIndex((q) => q.id === missing.id)
        applySaved(questions[idx]!, nextPending[questions[idx]!.id])
        setCursor(idx)
        setError('Falta responder esta pregunta')
        return
      }

      setGrading(true)
      const payload = questions.map((q) => nextPending[q.id]!)
      const completed = await api.completeChallenge(challengeId, payload)
      setDetail(completed)
      setShowResult(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
      setGrading(false)
    }
  }

  if (loading) {
    return (
      <div className="worlds-shell">
        <div className="boot-screen study-boot">
          <WorldsIconBadge icon={Trophy} size="lg" />
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
          <ExpandIconButton
            className="worlds-back"
            icon={ArrowLeft}
            label="Volver"
            weight="bold"
            onClick={() => void leaveChallenge()}
          />
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
          <ExpandIconButton
            className="worlds-back"
            icon={ArrowLeft}
            label="Volver"
            weight="bold"
            onClick={onBack}
          />
          <div className="worlds-nav-tools">
            <AppearanceTools />
          </div>
        </nav>

        <div className="worlds-content worlds-stage challenge-review-layout">
          <motion.div
            className="challenge-play-enter"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
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
                        <li className="worlds-review-course-row">
                          {q.course_name}
                        </li>
                      )}
                      <li
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
                      <div className="worlds-review-miss">
                        <p className="worlds-review-yours">
                          Dijiste: <strong>{formatSaidAnswer(q)}</strong>
                        </p>
                        {isMc ? (
                          <ul className="worlds-review-options">
                            {q.options!.map((opt, i) => {
                              const letter = String.fromCharCode(65 + i)
                              const picked =
                                (q.user_answer ?? '').trim().toUpperCase() ===
                                letter
                              const correctKey = (
                                q.correct_answer ?? ''
                              ).trim()
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
                          <p
                            className={`worlds-review-right${ok ? ' is-ok' : ''}`}
                          >
                            {isBoardQuestion(q)
                              ? 'Se esperaba: '
                              : 'La respuesta era: '}
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
          </section>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!detail || !current) {
    return (
      <div className="worlds-shell">
        <nav className="worlds-nav">
          <ExpandIconButton
            className="worlds-back"
            icon={ArrowLeft}
            label="Volver"
            weight="bold"
            onClick={() => void leaveChallenge()}
          />
        </nav>
        <p className="muted worlds-center-text">No hay más preguntas.</p>
      </div>
    )
  }

  const DiffIcon = challengeDifficultyIcon(detail.challenge.difficulty)
  const isWorldChallenge = detail.challenge.scope === 'world'
  const prevCourseName =
    cursor > 0 ? questions[cursor - 1]?.course_name : null
  const courseJustChanged =
    isWorldChallenge &&
    Boolean(current.course_name) &&
    current.course_name !== prevCourseName
  const currentBoard = asBoardScene(pending[current.id]?.board_json)

  return (
    <div className="worlds-shell challenge-play">
      <nav className="worlds-nav">
        <ExpandIconButton
          className="worlds-back"
          icon={ArrowLeft}
          label="Salir"
          weight="bold"
          onClick={() => void leaveChallenge()}
        />
        <div className="worlds-nav-tools">
          <AppearanceTools />
        </div>
      </nav>

      <div className="worlds-content worlds-stage">
        <motion.div
          className="challenge-play-enter"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
        <header className="worlds-hero worlds-hero--compact">
          <WorldsIconBadge icon={DiffIcon} size="lg" />
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
          <div className="worlds-progress-steps">
            {questions.map((q, i) => {
              const done = pending[q.id] != null
              const active = i === cursor
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`worlds-progress-dot${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                  aria-label={`Ir a la pregunta ${i + 1}`}
                  disabled={submitting || grading}
                  onClick={() => goTo(i)}
                />
              )
            })}
          </div>

          {isWorldChallenge && current.course_name && (
            <p
              className={`challenge-course-chip${courseJustChanged ? ' is-new' : ''}`}
            >
              {courseJustChanged ? 'Ahora: ' : ''}
              {current.course_name}
            </p>
          )}

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
                      disabled={submitting || grading}
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
              disabled={submitting || grading}
            />
          )}

          {(current.requires_board || current.kind === 'board_prompt') && (
            <div className="challenge-board">
              <ExcalidrawBoard
                key={`challenge-q-${current.id}-${theme}`}
                ref={boardRef}
                initialBoard={currentBoard}
                onSave={() => {}}
                theme={theme}
              />
              <input
                className="field-control challenge-text-input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Opcional: escribe una nota breve"
                disabled={submitting || grading}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="challenge-play-actions">
            <button
              type="button"
              className="ghost"
              disabled={submitting || grading || cursor === 0}
              onClick={() => goTo(cursor - 1)}
            >
              <CaretLeft size={18} weight="bold" />
              Anterior
            </button>
            <button
              type="button"
              className="primary"
              disabled={submitting || grading}
              onClick={() => void onSubmit()}
            >
              <PaperPlaneTilt size={18} weight="fill" />
              {isLast ? '¡Ya terminé!' : 'Siguiente'}
            </button>
          </div>
        </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {grading && (
          <motion.div
            className="challenge-grade-overlay"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="challenge-grade-card"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="challenge-grade-orb" aria-hidden />
              <p className="challenge-grade-title">¡Un momentito!</p>
              <p className="challenge-grade-copy">
                Estamos revisando tus respuestas, como un profesor amable.
              </p>
              <span className="study-thinking-dots challenge-grade-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
