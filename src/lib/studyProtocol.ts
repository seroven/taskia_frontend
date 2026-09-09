export type TutorPhase = 'understanding' | 'practicing' | 'reviewing'

export interface StudyMessage {
  role: string
  content: string
  created_at: string
}

export interface StudyContext {
  task_id: number
  updated_at: string
  tutor_phase: TutorPhase
  topic_summary: string
  /** Resumen vivo enviado a Gemini (no el chat completo). */
  context_summary: string
  hints_level?: number
  messages: StudyMessage[]
}

export interface StudyExercise {
  id: string
  title: string
  instructions: string
  expected_interaction: string
}

export type DrawOp =
  | { op: 'clear_board' }
  | { op: 'clear_layer'; layer: string }
  | {
      op: 'shape'
      type: 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'text'
      x: number
      y: number
      w?: number
      h?: number
      label?: string
      color?: string
    }
  | {
      op: 'stamp'
      id: string
      x: number
      y: number
      scale?: number
    }

export interface GeminiTutorReply {
  phase: TutorPhase | string
  speak_to_child: string
  ask_questions: string[]
  topic_summary: string
  context_summary?: string
  user_memory_summary?: string
  exercise: StudyExercise | null
  draw_ops: DrawOp[]
  hints_level: number
  study_eval?: {
    passed: boolean
    evidence: string
  }
}

export interface StudyBoardScene {
  type?: string
  version?: number
  source?: string
  elements: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export interface StudySession {
  context: StudyContext
  board: StudyBoardScene
  task: import('../types').Task
}

export interface StudyChatResponse {
  reply: GeminiTutorReply
  context: StudyContext
  study_passed: boolean
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case 'practicing':
      return 'Practicando'
    case 'reviewing':
      return 'Repasando'
    default:
      return 'Entendiendo'
  }
}

export function parseDrawOps(raw: unknown): DrawOp[] {
  if (!Array.isArray(raw)) {
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) ? parseDrawOps(parsed) : []
      } catch {
        return []
      }
    }
    return []
  }
  const shapeTypes = new Set([
    'rectangle',
    'ellipse',
    'triangle',
    'line',
    'arrow',
    'text',
  ])
  const ops: DrawOp[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const typeHint = String(rec.type ?? '')
    let op = String(rec.op ?? rec.operation ?? '')
    if (!op && shapeTypes.has(typeHint)) op = 'shape'
    if (!op && (typeHint === 'stamp' || rec.id || rec.stamp_id)) op = 'stamp'
    if (!op) op = typeHint

    if (op === 'clear_board' || op === 'clear') {
      ops.push({ op: 'clear_board' })
      continue
    }
    if (op === 'clear_layer') {
      ops.push({
        op: 'clear_layer',
        layer: String(rec.layer ?? 'ai'),
      })
      continue
    }
    if (op === 'shape') {
      const type = shapeTypes.has(typeHint) ? typeHint : 'rectangle'
      if (
        type !== 'rectangle' &&
        type !== 'ellipse' &&
        type !== 'triangle' &&
        type !== 'line' &&
        type !== 'arrow' &&
        type !== 'text'
      ) {
        continue
      }
      ops.push({
        op: 'shape',
        type,
        x: Number(rec.x ?? 0),
        y: Number(rec.y ?? 0),
        w: rec.w != null ? Number(rec.w) : undefined,
        h: rec.h != null ? Number(rec.h) : undefined,
        label: rec.label != null ? String(rec.label) : undefined,
        color: rec.color != null ? String(rec.color) : undefined,
      })
      continue
    }
    if (op === 'stamp') {
      const stampId = rec.id ?? rec.stamp_id ?? rec.stampId ?? rec.name
      if (!stampId) continue
      ops.push({
        op: 'stamp',
        id: String(stampId),
        x: Number(rec.x ?? 0),
        y: Number(rec.y ?? 0),
        scale: rec.scale != null ? Number(rec.scale) : 1,
      })
    }
  }
  return ops
}
