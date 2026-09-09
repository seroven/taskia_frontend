import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpenText,
  FloppyDisk,
  PencilLine,
  PencilSimple,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { ExcalidrawBoard, type ExcalidrawBoardHandle } from '../../components/study/ExcalidrawBoard'
import { StudyChat } from '../../components/study/StudyChat'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import { missionStatusIcon } from '../../components/worlds/worldsIcons'
import { errorMessage } from '../../lib/errors'
import { parseDrawOps, type StudyBoardScene } from '../../lib/studyProtocol'
import type { MissionContext, StudyMission } from '../../lib/worldsTypes'
import { MISSION_STATUS_LABEL } from '../../lib/worldsTypes'
import { useTheme } from '../../theme'
import { useToast } from '../../toast'

interface Props {
  missionId: number
  onBack: () => void
}

export function MissionStudyPage({ missionId, onBack }: Props) {
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [mode, setMode] = useState<'study' | 'edit'>('study')
  const [mission, setMission] = useState<StudyMission | null>(null)
  const [context, setContext] = useState<MissionContext | null>(null)
  const [board, setBoard] = useState<StudyBoardScene | null>(null)
  const [boardReady, setBoardReady] = useState(false)
  const [phase, setPhase] = useState('understanding')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editUsesBoard, setEditUsesBoard] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const boardRef = useRef<ExcalidrawBoardHandle>(null)
  const saveBoardRef = useRef<(scene: StudyBoardScene) => void>(() => {})

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const session = await api.missionLoadSession(missionId)
        setMission(session.mission)
        setContext(session.context)
        setBoard(session.board)
        setPhase(session.context.tutor_phase)
        setEditTitle(session.mission.title)
        setEditDescription(session.mission.description ?? '')
        setEditUsesBoard(session.mission.uses_board)
        setBoardReady(true)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [missionId])

  const persistBoard = useCallback(
    (scene: StudyBoardScene) => {
      if (!mission?.uses_board) return
      void api.missionSaveBoard(missionId, scene).catch((err) => {
        setChatError(errorMessage(err))
      })
    },
    [missionId, mission?.uses_board],
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
      if (options.includeBoard && mission?.uses_board) {
        const attachment = await boardRef.current?.getBoardAttachment()
        if ((attachment?.elementCount ?? 0) > 0) {
          boardAttach = {
            description: attachment?.description,
            image_base64: attachment?.imageBase64 ?? null,
          }
        }
      }
      const result = await api.missionChat(
        missionId,
        message,
        boardAttach,
        options.allowAiDraw,
        Boolean(options.fromVoice),
      )
      setContext(result.context)
      setPhase(result.reply.phase)
      setMission(result.mission)
      if (result.mission.status === 'mastered' && mission?.status !== 'mastered') {
        showToast({
          tone: 'success',
          title: '¡Misión dominada!',
          subtitle: 'El tutor confirma que ya manejas el tema',
        })
      }
      const ops = parseDrawOps(result.reply.draw_ops)
      if (ops.length > 0) {
        boardRef.current?.applyDrawOps(ops)
      }
    } catch (err) {
      setChatError(errorMessage(err))
      throw err
    } finally {
      setSending(false)
    }
  }

  async function onSaveEdit() {
    if (!mission) return
    if (editUsesBoard !== mission.uses_board && mission.status !== 'pending') {
      const ok = window.confirm(
        'Cambiar la pizarra no borra el progreso, pero el layout de estudio cambia. ¿Continuar?',
      )
      if (!ok) return
    }
    setSavingEdit(true)
    try {
      const updated = await api.updateMission({
        mission_id: mission.id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        uses_board: editUsesBoard,
      })
      setMission(updated)
      setMode('study')
      showToast({
        tone: 'success',
        title: 'Misión actualizada',
        subtitle: updated.title,
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo guardar',
        subtitle: errorMessage(err),
      })
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return (
      <div className="study-page">
        <div className="boot-screen study-boot">
          <WorldsIconBadge icon={BookOpenText} size="lg" />
          <p className="brand">Misión</p>
          <p className="muted">Preparando la sesión…</p>
        </div>
      </div>
    )
  }

  if (error || !mission) {
    return (
      <div className="study-page">
        <header className="study-header">
          <button type="button" className="ghost" onClick={onBack}>
            <ArrowLeft size={18} weight="bold" />
            Volver
          </button>
        </header>
        <p className="form-error banner">{error ?? 'No se pudo abrir la misión'}</p>
      </div>
    )
  }

  const StatusIcon = missionStatusIcon(mission.status)

  const studyContext = context
    ? {
        task_id: mission.id,
        updated_at: mission.updated_at,
        tutor_phase: context.tutor_phase as 'understanding' | 'practicing' | 'reviewing',
        topic_summary: context.topic_summary,
        context_summary: context.context_summary,
        hints_level: context.hints_level,
        messages: context.messages,
      }
    : null

  return (
    <div className="study-page">
      <header className="study-header">
        <button type="button" className="ghost" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Materia
        </button>
        <div className="study-header-main">
          <h1>{mission.title}</h1>
          <div className="study-header-tags">
            <span className="course-tag">{mission.course_name}</span>
            <span className={`worlds-status worlds-status-${mission.status}`}>
              <StatusIcon size={14} weight="fill" />
              {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
            </span>
            {mission.uses_board && (
              <span className="worlds-pill">
                <PencilLine size={14} weight="fill" />
                Pizarra
              </span>
            )}
          </div>
        </div>
        <div className="study-mode-toggle" role="group" aria-label="Modo">
          <button
            type="button"
            className={mode === 'study' ? 'active' : ''}
            onClick={() => setMode('study')}
          >
            <BookOpenText size={16} weight="fill" />
            Estudiar
          </button>
          <button
            type="button"
            className={mode === 'edit' ? 'active' : ''}
            onClick={() => setMode('edit')}
          >
            <PencilSimple size={16} weight="bold" />
            Editar
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {mode === 'edit' ? (
          <motion.div
            key="edit"
            className="study-edit-layout worlds-mission-edit"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <TextField
              label="Título"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <TextAreaField
              label="Descripción"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
            />
            <label className="worlds-switch-row">
              <input
                type="checkbox"
                checked={editUsesBoard}
                onChange={(e) => setEditUsesBoard(e.target.checked)}
              />
              <span>
                <strong className="worlds-switch-label">
                  <PencilLine size={18} weight="fill" />
                  ¿Usar pizarra?
                </strong>
              </span>
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setMode('study')}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={savingEdit || !editTitle.trim()}
                onClick={() => void onSaveEdit()}
              >
                <FloppyDisk size={18} weight="fill" />
                {savingEdit ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="study"
            className={`study-layout${mission.uses_board ? '' : ' study-layout-chat-only'}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <StudyChat
              context={studyContext}
              phase={phase}
              exercise={null}
              sending={sending}
              error={chatError}
              boardControls={mission.uses_board}
              onSend={onSend}
            />
            {mission.uses_board && (
              <div className="study-board-pane">
                {boardReady && (
                  <ExcalidrawBoard
                    key={`mission-board-${mission.id}-${theme}`}
                    ref={boardRef}
                    initialBoard={board}
                    onSave={onBoardSave}
                    theme={theme}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
