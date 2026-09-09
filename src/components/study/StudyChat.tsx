import { useEffect, useRef, useState, type FormEvent } from 'react'
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
  const listRef = useRef<HTMLDivElement>(null)
  const bootstrapped = useRef(false)
  const [instantKeys, setInstantKeys] = useState<Set<string>>(() => new Set())
  const [typingKey, setTypingKey] = useState<string | null>(null)
  const recorderRef = useRef(new VoiceRecorder())
  const tickRef = useRef<number | null>(null)
  const stoppingRef = useRef(false)

  const messages = context?.messages ?? []
  const voiceBusy = voiceStatus !== 'idle'

  useEffect(() => {
    return () => {
      recorderRef.current.cancel()
      if (tickRef.current != null) window.clearInterval(tickRef.current)
    }
  }, [])

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
        setVoiceError('No se entendió bien. Intenta hablar más cerca del micrófono.')
        setFromVoiceDraft(false)
      } else {
        setDraft(text)
        setFromVoiceDraft(true)
        if (result.truncated) {
          setVoiceError(
            'La transcripción puede estar incompleta. Revisa el final o graba de nuevo en partes más cortas.',
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
    if (sending || voiceBusy) return
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

      {(error || voiceError) && (
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
            {voiceStatus === 'idle' && (
              <button
                type="button"
                className="ghost study-voice-btn"
                disabled={sending}
                onClick={() => void startRecording()}
              >
                <Microphone size={18} weight="fill" />
                Hablar del tema
              </button>
            )}
            {voiceStatus === 'recording' && (
              <>
                <span className="study-voice-live">
                  <span className="study-voice-dot" aria-hidden />
                  Escuchando… {formatElapsed(voiceElapsed)} / 1:30
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
              </>
            )}
            {voiceStatus === 'transcribing' && (
              <span className="study-voice-live muted">Pasando tu audio a texto…</span>
            )}
          </div>
        )}

        {fromVoiceDraft && draft.trim() && voiceStatus === 'idle' && (
          <p className="study-voice-preview-hint">
            Revisa el texto y envíalo cuando esté bien. El tutor lo usará como contexto del tema.
          </p>
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
                ? 'Escribe tu duda… o pulsa “Hablar del tema” (máx. 90 s) y revisa el texto antes de enviar.'
                : 'Escribe tu duda o lo que acabas de entender…'
          }
          rows={3}
          disabled={sending || voiceBusy}
        />
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
      </form>
    </section>
  )
}
