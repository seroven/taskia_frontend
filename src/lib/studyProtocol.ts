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

export const GRID_COLS = 160
export const GRID_ROWS = 100

export type GridColor =
  | 'white'
  | 'black'
  | 'blue'
  | 'red'
  | 'green'
  | 'orange'
  | 'gray'
  | 'violet'

export type GridStampId =
  | 'right_triangle'
  | 'circle'
  | 'square'
  | 'number_line'
  | 'arrow'

export type GridItemKind =
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'stamp'

export interface GridItem {
  id: string
  layer: 'ai' | 'student'
  kind: GridItemKind
  col: number
  row: number
  w: number
  h: number
  text?: string
  color?: GridColor
  stamp?: GridStampId
  /** Extremo final de línea/flecha (celda). El origen es col/row. */
  endCol?: number
  endRow?: number
}

export type DrawOp =
  | { op: 'clear_board' }
  | { op: 'clear_layer'; layer: string }
  | {
      op: 'shape'
      type: 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'text'
      col: number
      row: number
      w?: number
      h?: number
      endCol?: number
      endRow?: number
      label?: string
      color?: string
    }
  | {
      op: 'stamp'
      id: string
      col: number
      row: number
      scale?: number
      w?: number
      h?: number
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
  type: 'taskia-grid'
  version: 1
  source: 'taskia-grid'
  cols: number
  rows: number
  items: GridItem[]
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
      const col = Number(rec.col ?? rec.x ?? 0)
      const row = Number(rec.row ?? rec.y ?? 0)
      ops.push({
        op: 'shape',
        type,
        col: Number.isFinite(col) ? Math.round(col) : 0,
        row: Number.isFinite(row) ? Math.round(row) : 0,
        w: rec.w != null && Number.isFinite(Number(rec.w)) ? Math.round(Number(rec.w)) : undefined,
        h: rec.h != null && Number.isFinite(Number(rec.h)) ? Math.round(Number(rec.h)) : undefined,
        endCol: (() => {
          if (rec.endCol == null && rec.end_col == null) return undefined
          const n = Number(rec.endCol ?? rec.end_col)
          return Number.isFinite(n) ? Math.round(n) : undefined
        })(),
        endRow: (() => {
          if (rec.endRow == null && rec.end_row == null) return undefined
          const n = Number(rec.endRow ?? rec.end_row)
          return Number.isFinite(n) ? Math.round(n) : undefined
        })(),
        label: rec.label != null ? String(rec.label) : undefined,
        color: rec.color != null ? String(rec.color) : undefined,
      })
      continue
    }
    if (op === 'stamp') {
      const stampId = rec.id ?? rec.stamp_id ?? rec.stampId ?? rec.name
      if (!stampId) continue
      const col = Number(rec.col ?? rec.x ?? 0)
      const row = Number(rec.row ?? rec.y ?? 0)
      ops.push({
        op: 'stamp',
        id: String(stampId),
        col: Number.isFinite(col) ? Math.round(col) : 0,
        row: Number.isFinite(row) ? Math.round(row) : 0,
        scale: rec.scale != null ? Number(rec.scale) : 1,
        w: rec.w != null && Number.isFinite(Number(rec.w)) ? Math.round(Number(rec.w)) : undefined,
        h: rec.h != null && Number.isFinite(Number(rec.h)) ? Math.round(Number(rec.h)) : undefined,
      })
    }
  }
  return ops
}
