import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Microphone, Stop } from '@phosphor-icons/react'
import { api } from '../../api'
import { errorMessage } from '../../lib/errors'
import type { StudyContext, StudyExercise, StudyMessage, TutorPhase } from '../../lib/studyProtocol'
import { phaseLabel } from '../../lib/studyProtocol'
import { MAX_VOICE_SECONDS, VoiceRecorder } from '../../lib/voiceRecorder'

interface Props {
  context: StudyContext | null
  phase: TutorPhase | string
  exercise: StudyExercise | null
  sending: boolean
  error: string | null
  /** Si false, oculta toggles de pizarra y habilita micrófono. Default true. */
  boardControls?: boolean
  boardOpen?: boolean
  onToggleBoardView?: () => void
  onThreadEl?: (el: HTMLDivElement | null) => void
  onSend: (
    message: string,
    options: { includeBoard: boolean; allowAiDraw: boolean; fromVoice?: boolean },
  ) => Promise<void>
}

function messageKey(message: StudyMessage, index: number) {
  return `${message.created_at}-${message.role}-${index}`
}

function TypewriterText({
  text,
  active,
  onTick,
  onDone,
}: {
  text: string
  active: boolean
  onTick?: () => void
  onDone?: () => void
}) {
  const [shown, setShown] = useState(active ? '' : text)
  const onTickRef = useRef(onTick)
  const onDoneRef = useRef(onDone)
  onTickRef.current = onTick
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) {
      setShown(text)
      return
    }

    setShown('')
    let i = 0
    const delay = text.length > 220 ? 12 : text.length > 120 ? 16 : 22

    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      onTickRef.current?.()
      if (i >= text.length) {
        window.clearInterval(id)
        onDoneRef.current?.()
      }
    }, delay)

    return () => window.clearInterval(id)
  }, [text, active])

  return (
    <p>
      {shown}
      {active && shown.length < text.length && (
        <span className="study-type-caret" aria-hidden />
      )}
    </p>
  )
}

function formatElapsed(seconds: number) {
  const s = Math.max(0, Math.min(MAX_VOICE_SECONDS, Math.floor(seconds)))
  const mm = String(Math.floor(s / 60)).padStart(1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function StudyChat({
  context,
  phase,
  exercise,
  sending,
  error,
  boardControls = true,
  boardOpen = false,
  onToggleBoardView,
  onThreadEl,
  onSend,
}: Props) {
  const voiceEnabled = !boardControls
  const [draft, setDraft] = useState('')
  const [includeBoard, setIncludeBoard] = useState(false)
  const [allowAiDraw, setAllowAiDraw] = useState(false)
  const [fromVoiceDraft, setFromVoiceDraft] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [voiceElapsed, setVoiceElapsed] = useState(0)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voicePrompt, setVoicePrompt] = useState<'intro' | 'confirm' | null>(null)
  const [pendingVoiceText, setPendingVoiceText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const bootstrapped = useRef(false)
  const [instantKeys, setInstantKeys] = useState<Set<string>>(() => new Set())
  const [typingKey, setTypingKey] = useState<string | null>(null)
  const recorderRef = useRef(new VoiceRecorder())
  const tickRef = useRef<number | null>(null)
  const stoppingRef = useRef(false)

  const messages = context?.messages ?? []
  const voiceBusy = voiceStatus !== 'idle' || voicePrompt !== null

  useEffect(() => {
    return () => {
      recorderRef.current.cancel()
      if (tickRef.current != null) window.clearInterval(tickRef.current)
    }
  }, [])

  useEffect(() => {
    if (voiceEnabled) return
    recorderRef.current.cancel()
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    setVoiceStatus('idle')
    setVoiceElapsed(0)
    setVoicePrompt(null)
    setPendingVoiceText('')
    stoppingRef.current = false
  }, [voiceEnabled])

  useEffect(() => {
    if (!context || bootstrapped.current) return
    bootstrapped.current = true

    if (messages.length === 1 && messages[0]?.role === 'assistant') {
      setTypingKey(messageKey(messages[0], 0))
      setInstantKeys(new Set())
      return
    }

    const keys = new Set(messages.map((m, i) => messageKey(m, i)))
    setInstantKeys(keys)
    setTypingKey(null)
  }, [context, messages])

  useEffect(() => {
    if (!bootstrapped.current || messages.length === 0) return
    const lastIndex = messages.length - 1
    const last = messages[lastIndex]
    const key = messageKey(last, lastIndex)

    if (last.role !== 'assistant') return
    if (instantKeys.has(key) || typingKey === key) return

    setTypingKey(key)
  }, [messages, instantKeys, typingKey])

  const scrollToBottom = () => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, typingKey])

  function clearVoiceTick() {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  async function finishRecording() {
    if (stoppingRef.current) return
    stoppingRef.current = true
    clearVoiceTick()
    setVoiceStatus('transcribing')
    setVoiceError(null)
    try {
      const recording = await recorderRef.current.stop()
      const result = await api.transcribeAudio({
        audio_base64: recording.audioBase64,
        mime_type: recording.mimeType,
        duration_seconds: recording.durationSeconds,
      })
      const text = result.text.trim()
      if (!text || text === '(no se entendió)') {
        setVoiceError('No te escuché bien. Acércate un poquito al micrófono e inténtalo otra vez.')
        setFromVoiceDraft(false)
        setPendingVoiceText('')
      } else {
        setPendingVoiceText(text)
        setDraft(text)
        setFromVoiceDraft(true)
        setVoicePrompt('confirm')
        if (result.truncated) {
          setVoiceError(
            'Se cortó un poquito al final. Léelo y, si falta algo, grábala otra vez.',
          )
        }
      }
    } catch (err) {
      setVoiceError(errorMessage(err))
    } finally {
      setVoiceStatus('idle')
      setVoiceElapsed(0)
      stoppingRef.current = false
    }
  }

  async function startRecording() {
    if (sending || voiceStatus === 'recording' || voiceStatus === 'transcribing') return
    setVoiceError(null)
    stoppingRef.current = false
    try {
      setVoiceStatus('recording')
      setVoiceElapsed(0)
      const startedAt = Date.now()
      tickRef.current = window.setInterval(() => {
        setVoiceElapsed((Date.now() - startedAt) / 1000)
      }, 200)
      await recorderRef.current.start(() => {
        void finishRecording()
      })
    } catch (err) {
      clearVoiceTick()
      recorderRef.current.cancel()
      setVoiceStatus('idle')
      setVoiceElapsed(0)
      const msg = errorMessage(err)
      setVoiceError(
        /Permission|NotAllowed|permiso/i.test(msg)
          ? 'Necesitamos permiso del micrófono para que puedas hablar.'
          : msg,
      )
    }
  }

  function askToRecord() {
    if (sending || voiceBusy) return
    setVoiceError(null)
    setVoicePrompt('intro')
  }

  async function sendPendingVoice() {
    const text = pendingVoiceText.trim() || draft.trim()
    if (!text || sending) return
    setVoicePrompt(null)
    setPendingVoiceText('')
    setDraft('')
    setFromVoiceDraft(false)
    try {
      await onSend(text, {
        includeBoard: false,
        allowAiDraw: false,
        fromVoice: true,
      })
    } catch {
      setDraft(text)
      setFromVoiceDraft(true)
    }
  }

  function redoVoice() {
    setVoicePrompt(null)
    setPendingVoiceText('')
    setDraft('')
    setFromVoiceDraft(false)
    setVoiceError(null)
    void startRecording()
  }

  function cancelRecording() {
    clearVoiceTick()
    recorderRef.current.cancel()
    setVoiceStatus('idle')
    setVoiceElapsed(0)
    stoppingRef.current = false
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending || voiceBusy) return
    const sendBoard = includeBoard
    const draw = allowAiDraw
    const voice = fromVoiceDraft
    setDraft('')
    setFromVoiceDraft(false)
    try {
      await onSend(text, {
        includeBoard: sendBoard,
        allowAiDraw: draw,
        fromVoice: voice,
      })
      if (sendBoard) setIncludeBoard(false)
    } catch {
      // El error lo muestra el padre
    }
  }

  return (
    <section className="study-chat">
      <div
        className="study-chat-stage"
        ref={(el) => {
          onThreadEl?.(el)
        }}
      >
      <div className="study-chat-meta">
        <span className="study-phase-pill">{phaseLabel(phase)}</span>
        {context?.topic_summary ? (
          <p className="study-topic-summary">{context.topic_summary}</p>
        ) : (
          <p className="study-topic-summary muted">
            Tu tutor amigable ya tiene el título de la tarea y te espera.
          </p>
        )}
      </div>

      {exercise && (
        <div className="study-exercise">
          <strong>{exercise.title}</strong>
          <p>{exercise.instructions}</p>
        </div>
      )}

      <div className="study-chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="muted study-chat-empty">Escribe tu primer mensaje para empezar.</p>
        )}
        {messages.map((message, index) => {
          const key = messageKey(message, index)
          const isAssistant = message.role === 'assistant'
          const shouldType = isAssistant && typingKey === key && !instantKeys.has(key)

          return (
            <motion.div
              key={key}
              className={`study-bubble study-bubble-${message.role}`}
              initial={isAssistant && shouldType ? { opacity: 0.6, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="study-bubble-role">
                {message.role === 'user' ? 'Tú' : 'Tutor'}
              </span>
              {isAssistant ? (
                <TypewriterText
                  text={message.content}
                  active={shouldType}
                  onTick={scrollToBottom}
                  onDone={() => {
                    setInstantKeys((prev) => {
                      const next = new Set(prev)
                      next.add(key)
                      return next
                    })
                    setTypingKey((current) => (current === key ? null : current))
                    scrollToBottom()
                  }}
                />
              ) : (
                <p>{message.content}</p>
              )}
            </motion.div>
          )
        })}
        <AnimatePresence>
          {sending && (
            <motion.div
              key="thinking"
              className="study-bubble study-bubble-assistant is-typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <span className="study-bubble-role">Tutor</span>
              <p>
                Pensando
                <span className="study-thinking-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {(error || (voiceError && voicePrompt !== 'confirm')) && (
        <p className="form-error">{error ?? voiceError}</p>
      )}

      <form className="study-chat-form" onSubmit={(e) => void onSubmit(e)}>
        {boardControls && (
          <div className="study-chat-toggles">
            <button
              type="button"
              className={`study-board-toggle${includeBoard ? ' is-on' : ''}`}
              role="switch"
              aria-checked={includeBoard}
              disabled={sending || voiceBusy}
              onClick={() => setIncludeBoard((value) => !value)}
            >
              <span className="study-board-toggle-track" aria-hidden>
                <span className="study-board-toggle-thumb" />
              </span>
              <span className="study-board-toggle-title">Enviar pizarra</span>
            </button>
            <button
              type="button"
              className={`study-board-toggle${allowAiDraw ? ' is-on' : ''}`}
              role="switch"
              aria-checked={allowAiDraw}
              disabled={sending || voiceBusy}
              onClick={() => setAllowAiDraw((value) => !value)}
            >
              <span className="study-board-toggle-track" aria-hidden>
                <span className="study-board-toggle-thumb" />
              </span>
              <span className="study-board-toggle-title">IA dibuja</span>
            </button>
          </div>
        )}

        {voiceEnabled && (
          <div className="study-voice-bar">
            <AnimatePresence mode="wait" initial={false}>
              {voiceStatus === 'idle' && (
                <motion.button
                  key="idle"
                  type="button"
                  className="ghost study-voice-btn"
                  disabled={sending || voicePrompt !== null}
                  onClick={askToRecord}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Microphone size={18} weight="fill" />
                  Hablar del tema
                </motion.button>
              )}
              {voiceStatus === 'recording' && (
                <motion.div
                  key="recording"
                  className="study-voice-live-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="study-voice-live">
                    <span className="study-voice-dot" aria-hidden />
                    Te estoy escuchando… {formatElapsed(voiceElapsed)} / 1:30
                  </span>
                  <button
                    type="button"
                    className="primary study-voice-btn"
                    onClick={() => void finishRecording()}
                  >
                    <Stop size={18} weight="fill" />
                    Listo
                  </button>
                  <button type="button" className="ghost study-voice-btn" onClick={cancelRecording}>
                    Cancelar
                  </button>
                </motion.div>
              )}
              {voiceStatus === 'transcribing' && (
                <motion.span
                  key="transcribing"
                  className="study-voice-live study-voice-transcribing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  role="status"
                >
                  <span className="study-voice-transcribe-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  Pasando tu audio a palabras…
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (fromVoiceDraft) setFromVoiceDraft(true)
          }}
          placeholder={
            boardControls
              ? 'Escribe tu duda… “Enviar pizarra” para que mire tu dibujo; “IA dibuja” para que ella dibuje el ejercicio.'
              : voiceEnabled
                ? 'Escribe tu duda… o, si quieres contar mucho, usa “Hablar del tema”.'
                : 'Escribe tu duda o lo que acabas de entender…'
          }
          rows={3}
          disabled={sending || voiceBusy}
        />
        <div className="study-chat-send-row">
          {boardControls && onToggleBoardView ? (
            <button
              type="button"
              className="ghost study-open-board-btn"
              disabled={sending || voiceBusy}
              onClick={onToggleBoardView}
            >
              {boardOpen ? 'Chat' : 'Pizarra'}
            </button>
          ) : null}
          <button
            type="submit"
            className={`primary study-send-btn${sending ? ' is-loading' : ''}`}
            disabled={sending || voiceBusy || !draft.trim()}
            aria-busy={sending}
          >
          <AnimatePresence mode="wait" initial={false}>
            {sending ? (
              <motion.span
                key="loading"
                className="study-send-label"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="study-send-spinner" aria-hidden />
                Enviando…
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                className="study-send-label"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                Enviar
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        </div>
      </form>

      <KidAskDialog
        open={voicePrompt === 'intro'}
        titleId="study-voice-intro-title"
        title="¿Vas a explicar bastante?"
        primaryLabel="Voy a explicar"
        secondaryLabel="Mejor escribo"
        onPrimary={() => {
          setVoicePrompt(null)
          void startRecording()
        }}
        onSecondary={() => setVoicePrompt(null)}
      >
        <p>
          El micrófono es para contar el tema con tus palabras, como si se lo explicaras a un
          amigo. Si solo quieres decir una frase cortita, mejor escríbela: así se entiende más
          fácil.
        </p>
      </KidAskDialog>

      <KidAskDialog
        open={voicePrompt === 'confirm'}
        titleId="study-voice-confirm-title"
        title="¿Se lo mandamos al tutor?"
        primaryLabel="Sí, mandarlo"
        secondaryLabel="Grabar otra vez"
        busy={sending}
        onPrimary={() => void sendPendingVoice()}
        onSecondary={redoVoice}
      >
        <p>Así se escuchó lo que dijiste:</p>
        <p className="study-voice-transcript">{pendingVoiceText || draft}</p>
        {voiceError && <p className="form-error">{voiceError}</p>}
      </KidAskDialog>
    </section>
  )
}

function KidAskDialog({
  open,
  titleId,
  title,
  children,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  busy = false,
}: {
  open: boolean
  titleId: string
  title: string
  children: ReactNode
  primaryLabel: string
  secondaryLabel: string
  onPrimary: () => void
  onSecondary: () => void
  busy?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop study-kid-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="modal-panel study-kid-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header">
              <h2 id={titleId}>{title}</h2>
            </div>
            <div className="modal-panel-body study-kid-dialog-body">{children}</div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onSecondary} disabled={busy}>
                {secondaryLabel}
              </button>
              <button type="button" className="primary" onClick={onPrimary} disabled={busy}>
                {primaryLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
