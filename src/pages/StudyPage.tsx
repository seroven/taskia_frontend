import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { api } from '../api'
import { AppLoader } from '../components/AppLoader'
import { GridBoard, type GridBoardHandle } from '../components/study/GridBoard'
import { StudyBoardPane } from '../components/study/StudyBoardPane'
import { StudyBoardToggle } from '../components/study/StudyBoardToggle'
import { StudyChat } from '../components/study/StudyChat'
import { TaskEditPanel } from '../components/study/TaskEditPanel'
import { errorMessage } from '../lib/errors'
import {
  parseDrawOps,
  type StudyBoardScene,
  type StudyContext,
  type StudyExercise,
  type TutorPhase,
} from '../lib/studyProtocol'
import { useTheme } from '../theme'
import { useToast } from '../toast'
import {
  canOpenStudyMode,
  taskStudyPatch,
  type Course,
  type Difficulty,
  type Task,
} from '../types'

interface Props {
  taskId: number
  onBack: () => void
}

export function StudyPage({ taskId, onBack }: Props) {
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [mode, setMode] = useState<'study' | 'edit'>('study')
  const [task, setTask] = useState<Task | null>(null)
  const [context, setContext] = useState<StudyContext | null>(null)
  const [board, setBoard] = useState<StudyBoardScene | null>(null)
  const [boardReady, setBoardReady] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [phase, setPhase] = useState<TutorPhase | string>('understanding')
  const [exercise, setExercise] = useState<StudyExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [togglingBoard, setTogglingBoard] = useState<'on' | 'off' | null>(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [threadEl, setThreadEl] = useState<HTMLDivElement | null>(null)
  const boardRef = useRef<GridBoardHandle>(null)
  const saveBoardRef = useRef<(scene: StudyBoardScene) => void>(() => {})

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [session, nextCourses, nextDifficulties] = await Promise.all([
          api.studyLoadSession(taskId),
          api.listCourses(),
          api.listDifficulties(),
        ])
        setTask(session.task)
        setContext(session.context)
        setBoard(session.board)
        setPhase(session.context.tutor_phase)
        setCourses(nextCourses)
        setDifficulties(nextDifficulties)
        setBoardReady(true)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [taskId])

  const persistBoard = useCallback(
    (scene: StudyBoardScene) => {
      if (!task?.uses_board) return
      void api.studySaveBoard(taskId, scene).catch((err) => {
        setChatError(errorMessage(err))
      })
    },
    [taskId, task?.uses_board],
  )

  useEffect(() => {
    saveBoardRef.current = persistBoard
  }, [persistBoard])

  const onBoardSave = useCallback((scene: StudyBoardScene) => {
    saveBoardRef.current(scene)
  }, [])

  async function onSend(
    message: string,
    options: { includeBoard: boolean; allowAiDraw: boolean; fromVoice?: boolean },
  ) {
    setSending(true)
    setChatError(null)
    try {
      let boardAttach:
        | { description?: string; image_base64?: string | null }
        | undefined
      if (options.includeBoard && task?.uses_board) {
        const attachment = await boardRef.current?.getBoardAttachment()
        if ((attachment?.elementCount ?? 0) > 0) {
          boardAttach = {
            description: attachment?.description,
            image_base64: attachment?.imageBase64 ?? null,
          }
        }
      }
      const result = await api.studyChat(
        taskId,
        message,
        boardAttach,
        options.allowAiDraw && Boolean(task?.uses_board),
        Boolean(options.fromVoice),
      )
      setContext(result.context)
      setPhase(result.reply.phase)
      setExercise(result.reply.exercise)
      if (result.study_passed) {
        const justPassed = !task?.study_passed
        setTask((prev) =>
          prev ? { ...prev, study_passed: true } : prev,
        )
        if (justPassed) {
          showToast({
            tone: 'success',
            title: '¡Listo para Terminado!',
            subtitle:
              'El tutor confirma que ya dominas la tarea. Puedes moverla a Terminado.',
          })
        }
      }
      const ops = parseDrawOps(result.reply.draw_ops)
      if (ops.length > 0 && task?.uses_board) {
        boardRef.current?.applyDrawOps(ops)
      }
    } catch (err) {
      setChatError(errorMessage(err))
      throw err
    } finally {
      setSending(false)
    }
  }

  async function applyUsesBoard(next: boolean) {
    if (!task) return
    const updated = await api.updateTask(
      taskStudyPatch(task, {
        uses_board: next,
        study_mode_chosen: true,
      }),
    )
    if (next) {
      const session = await api.studyLoadSession(taskId)
      setBoard(session.board)
      setBoardReady(true)
    } else {
      setBoardOpen(false)
    }
    setTask(updated)
    return updated
  }

  async function onToggleBoard(next: boolean) {
    if (!task || togglingBoard) return
    if (next === task.uses_board) {
      if (next) setBoardOpen(true)
      return
    }
    setTogglingBoard(next ? 'on' : 'off')
    setChatError(null)
    try {
      await applyUsesBoard(next)
      showToast({
        tone: 'success',
        title: next ? '¡Pizarra lista!' : 'Ahora solo charlamos',
        subtitle: next
          ? 'Ya puedes dibujar junto al tutor.'
          : 'Si quieres dibujar después, toca Pizarra.',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo cambiar',
        subtitle: errorMessage(err),
      })
    } finally {
      setTogglingBoard(null)
    }
  }

  if (loading) {
    return (
      <div className="study-page">
        <AppLoader message="Preparando la sesión…" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="study-page">
        <header className="study-header">
          <button type="button" className="ghost" onClick={onBack}>
            ← Volver
          </button>
        </header>
        <p className="form-error banner">{error ?? 'No se pudo abrir la sesión'}</p>
      </div>
    )
  }

  return (
    <div className="study-page">
      <header className="study-header">
        <button type="button" className="ghost" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Tablero
        </button>
        <div className="study-header-main">
          <h1>{task.title}</h1>
          <div className="study-header-tags">
            <span className="course-tag">{task.course_name}</span>
            <span className={`difficulty-tag difficulty-${task.difficulty_code}`}>
              {task.difficulty_name}
            </span>
            {task.study_passed && (
              <span className="study-passed-tag">Listo</span>
            )}
          </div>
        </div>
        <div className="study-header-actions">
          {mode === 'study' && (
            <StudyBoardToggle
              usesBoard={task.uses_board}
              disabled={Boolean(togglingBoard)}
              onChange={(next) => void onToggleBoard(next)}
            />
          )}
          <div className="study-mode-toggle" role="group" aria-label="Modo">
            <button
              type="button"
              className={mode === 'study' ? 'active' : ''}
              onClick={() => setMode('study')}
            >
              Estudiar
            </button>
            <button
              type="button"
              className={mode === 'edit' ? 'active' : ''}
              onClick={() => setMode('edit')}
            >
              Editar
            </button>
          </div>
        </div>
      </header>

      <div className="study-body">
      <AnimatePresence mode="wait">
        {mode === 'edit' ? (
          <motion.div
            key="edit"
            className="study-edit-layout"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <TaskEditPanel
              task={task}
              courses={courses}
              difficulties={difficulties}
              onSave={async (input) => {
                const updated = await api.updateTask({
                  ...input,
                  study_mode_chosen: true,
                })
                if (updated.uses_board) {
                  const session = await api.studyLoadSession(taskId)
                  setBoard(session.board)
                  setBoardReady(true)
                }
                setTask(updated)
                if (!canOpenStudyMode(updated)) {
                  onBack()
                }
                return updated
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="study"
            className={`study-layout${task.uses_board ? '' : ' study-layout-chat-only'}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <StudyChat
              context={context}
              phase={phase}
              exercise={exercise}
              sending={sending}
              error={chatError}
              onSend={onSend}
              boardControls={task.uses_board}
              boardOpen={boardOpen}
              onToggleBoardView={() => setBoardOpen((open) => !open)}
              onThreadEl={setThreadEl}
            />
            {task.uses_board && (
              <StudyBoardPane
                open={boardOpen}
                onClose={() => setBoardOpen(false)}
                portalParent={threadEl}
              >
                {boardReady && (
                  <GridBoard
                    key={`board-${task.id}-${theme}-${task.uses_board}`}
                    ref={boardRef}
                    initialBoard={board}
                    onSave={onBoardSave}
                    theme={theme}
                  />
                )}
              </StudyBoardPane>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {togglingBoard && (
        <div className="study-page-loader">
          <AppLoader
            message={
              togglingBoard === 'on' ? 'Abriendo pizarra…' : 'Quitando pizarra…'
            }
            variant="section"
          />
        </div>
      )}
      </div>
    </div>
  )
}
