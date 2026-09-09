const MAX_VOICE_SECONDS = 90

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el audio'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

export type VoiceRecorderStatus = 'idle' | 'recording' | 'stopping'

export interface VoiceRecordingResult {
  audioBase64: string
  mimeType: string
  durationSeconds: number
}

export class VoiceRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  private limitTimer: number | null = null
  private onLimitReached: (() => void) | null = null

  get supported() {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined' &&
      !!pickRecorderMimeType()
    )
  }

  async start(onLimitReached?: () => void): Promise<void> {
    if (!this.supported) {
      throw new Error('Tu navegador no permite grabar audio')
    }
    this.onLimitReached = onLimitReached ?? null
    this.chunks = []
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickRecorderMimeType()
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.startedAt = Date.now()
    this.recorder.start(250)
    this.limitTimer = window.setTimeout(() => {
      this.onLimitReached?.()
    }, MAX_VOICE_SECONDS * 1000)
  }

  async stop(): Promise<VoiceRecordingResult> {
    if (this.limitTimer != null) {
      window.clearTimeout(this.limitTimer)
      this.limitTimer = null
    }

    const recorder = this.recorder
    if (!recorder) {
      this.cleanupStream()
      throw new Error('No hay grabación activa')
    }

    const mimeType = recorder.mimeType || pickRecorderMimeType() || 'audio/webm'
    const durationSeconds = Math.min(
      MAX_VOICE_SECONDS,
      Math.max(0.5, (Date.now() - this.startedAt) / 1000),
    )

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Error al grabar audio'))
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: mimeType }))
      }
      if (recorder.state === 'inactive') {
        resolve(new Blob(this.chunks, { type: mimeType }))
        return
      }
      recorder.stop()
    })

    this.cleanupStream()
    this.recorder = null
    this.chunks = []

    if (blob.size < 200) {
      throw new Error('No se escuchó casi nada. Intenta de nuevo.')
    }

    const audioBase64 = await blobToBase64(blob)
    return { audioBase64, mimeType, durationSeconds }
  }

  cancel() {
    if (this.limitTimer != null) {
      window.clearTimeout(this.limitTimer)
      this.limitTimer = null
    }
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.onstop = null
        this.recorder.stop()
      }
    } catch {
      // ignore
    }
    this.recorder = null
    this.chunks = []
    this.cleanupStream()
  }

  private cleanupStream() {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}

export { MAX_VOICE_SECONDS }
