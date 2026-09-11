import type {
  DrawOp,
  GridColor,
  GridItem,
  GridItemKind,
  GridStampId,
  StudyBoardScene,
} from './studyProtocol'
import { GRID_COLS, GRID_ROWS } from './studyProtocol'

export const GRID_CELL = 28

export const GRID_COLORS: Record<GridColor, string> = {
  white: '#f8fafc',
  black: '#111827',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#16a34a',
  orange: '#ea580c',
  gray: '#6b7280',
  violet: '#c026d3',
}

/** Color reservado para el dibujo de la IA; no está en la paleta del alumno. */
export const AI_COLOR: GridColor = 'violet'

const STAMP_IDS = new Set<GridStampId>([
  'right_triangle',
  'circle',
  'square',
  'number_line',
  'arrow',
])

export function emptyGridScene(): StudyBoardScene {
  return {
    type: 'taskia-grid',
    version: 1,
    source: 'taskia-grid',
    cols: GRID_COLS,
    rows: GRID_ROWS,
    items: [],
  }
}

export function isGridScene(raw: unknown): raw is StudyBoardScene {
  if (!raw || typeof raw !== 'object') return false
  const rec = raw as { type?: string; source?: string; items?: unknown }
  return rec.type === 'taskia-grid' || rec.source === 'taskia-grid'
}

export function newItemId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function isStrokeKind(kind: GridItemKind) {
  return kind === 'line' || kind === 'arrow'
}

export function lineEnds(item: GridItem): { c1: number; r1: number; c2: number; r2: number } {
  const c1 = item.col
  const r1 = item.row
  const c2 = item.endCol ?? item.col + Math.max(1, item.w) - 1
  const r2 = item.endRow ?? item.row + Math.max(1, item.h) - 1
  return { c1, r1, c2, r2 }
}

export function itemBBox(item: GridItem) {
  if (isStrokeKind(item.kind)) {
    const { c1, r1, c2, r2 } = lineEnds(item)
    const col = Math.min(c1, c2)
    const row = Math.min(r1, r2)
    return {
      col,
      row,
      w: Math.abs(c2 - c1) + 1,
      h: Math.abs(r2 - r1) + 1,
    }
  }
  return { col: item.col, row: item.row, w: item.w, h: item.h }
}

export function itemHitsCell(item: GridItem, col: number, row: number) {
  const box = itemBBox(item)
  return (
    col >= box.col &&
    col < box.col + box.w &&
    row >= box.row &&
    row < box.row + box.h
  )
}

export function itemIntersectsArea(
  item: GridItem,
  colA: number,
  rowA: number,
  colB: number,
  rowB: number,
) {
  const box = itemBBox(item)
  const left = Math.min(colA, colB)
  const right = Math.max(colA, colB)
  const top = Math.min(rowA, rowB)
  const bottom = Math.max(rowA, rowB)
  return (
    box.col <= right &&
    box.col + box.w - 1 >= left &&
    box.row <= bottom &&
    box.row + box.h - 1 >= top
  )
}

export function itemStroke(item: GridItem) {
  if (item.layer === 'ai') return GRID_COLORS[AI_COLOR]
  const color = parseGridColor(item.color)
  return GRID_COLORS[color === AI_COLOR ? 'blue' : color]
}

export function textChars(text: string | undefined) {
  return Array.from(text ?? '')
}

export function clampItem(
  item: GridItem,
  cols = GRID_COLS,
  rows = GRID_ROWS,
): GridItem {
  if (isStrokeKind(item.kind)) {
    const c1 = clampInt(item.col, 0, cols - 1)
    const r1 = clampInt(item.row, 0, rows - 1)
    const rawEnd = lineEnds(item)
    const c2 = clampInt(rawEnd.c2, 0, cols - 1)
    const r2 = clampInt(rawEnd.r2, 0, rows - 1)
    return {
      ...item,
      col: c1,
      row: r1,
      endCol: c2,
      endRow: r2,
      w: Math.abs(c2 - c1) + 1,
      h: Math.abs(r2 - r1) + 1,
    }
  }
  if (item.kind === 'text') {
    const chars = Math.max(1, textChars(item.text).length)
    const w = clampInt(item.w || chars, 1, cols)
    const col = clampInt(item.col, 0, cols - w)
    const row = clampInt(item.row, 0, rows - 1)
    return { ...item, col, row, w, h: 1 }
  }
  const w = clampInt(item.w, 1, cols)
  const h = clampInt(item.h, 1, rows)
  const col = clampInt(item.col, 0, cols - w)
  const row = clampInt(item.row, 0, rows - h)
  return { ...item, col, row, w, h }
}

export function parseGridColor(raw: string | undefined): GridColor {
  const t = String(raw ?? '').trim().toLowerCase()
  if (t === 'violet' || t === 'magenta' || t === 'fuchsia' || t === '#c026d3' || t === '#d946ef') {
    return 'violet'
  }
  if (t === 'white' || t === '#fff' || t === '#ffffff' || t === '#f8fafc') {
    return 'white'
  }
  if (t === 'blue' || t === '#2563eb' || t === '#3b82f6') return 'blue'
  if (t === 'red' || t === '#dc2626' || t === '#ef4444') return 'red'
  if (t === 'green' || t === '#16a34a' || t === '#22c55e') return 'green'
  if (t === 'orange' || t === '#ea580c' || t === '#f97316') return 'orange'
  if (t === 'black' || t === '#111827' || t === '#000' || t === '#000000') {
    return 'black'
  }
  if (t === 'gray' || t === 'grey' || t === '#6b7280' || t === '#9ca3af') {
    return 'gray'
  }
  return 'blue'
}

export function themeDefaultColor(theme: 'light' | 'dark'): GridColor {
  return theme === 'dark' ? 'white' : 'black'
}

function parseStampId(raw: string): GridStampId | null {
  const id = raw.trim().toLowerCase().replace(/-/g, '_')
  if (STAMP_IDS.has(id as GridStampId)) return id as GridStampId
  return null
}

export function defaultShapeSize(
  kind: GridItemKind,
  stamp?: GridStampId,
  scale = 1,
  text = '',
): { w: number; h: number } {
  const s = Math.max(1, Math.round(scale || 1))
  if (kind === 'stamp') {
    switch (stamp) {
      case 'right_triangle':
        return { w: 6 * s, h: 5 * s }
      case 'circle':
      case 'square':
        return { w: 5 * s, h: 5 * s }
      case 'number_line':
        return { w: Math.min(GRID_COLS, 16 + 2 * s), h: 3 }
      case 'arrow':
        return { w: 8 * s, h: 1 }
      default:
        return { w: 4 * s, h: 4 * s }
    }
  }
  if (kind === 'text') {
    const w = Math.min(GRID_COLS, Math.max(1, textChars(text).length || 1))
    return { w, h: 1 }
  }
  if (kind === 'line' || kind === 'arrow') return { w: 1, h: 1 }
  if (kind === 'ellipse') return { w: 6, h: 6 }
  if (kind === 'triangle') return { w: 6, h: 5 }
  return { w: 6, h: 4 }
}

function centerItems(items: GridItem[], cols: number, rows: number): GridItem[] {
  if (items.length === 0) return items
  let minC = Infinity
  let minR = Infinity
  let maxC = -Infinity
  let maxR = -Infinity
  for (const item of items) {
    const box = itemBBox(item)
    minC = Math.min(minC, box.col)
    minR = Math.min(minR, box.row)
    maxC = Math.max(maxC, box.col + box.w)
    maxR = Math.max(maxR, box.row + box.h)
  }
  const w = Math.max(maxC - minC, 1)
  const h = Math.max(maxR - minR, 1)
  const dCol = Math.round((cols - w) / 2) - minC
  const dRow = Math.round((rows - h) / 2) - minR
  return items.map((item) => {
    if (isStrokeKind(item.kind)) {
      const ends = lineEnds(item)
      return clampItem(
        {
          ...item,
          col: ends.c1 + dCol,
          row: ends.r1 + dRow,
          endCol: ends.c2 + dCol,
          endRow: ends.r2 + dRow,
        },
        cols,
        rows,
      )
    }
    return clampItem(
      { ...item, col: item.col + dCol, row: item.row + dRow },
      cols,
      rows,
    )
  })
}

function itemFromShape(
  op: Extract<DrawOp, { op: 'shape' }>,
  layer: GridItem['layer'],
): GridItem {
  const text = op.label?.trim() || undefined
  const size = defaultShapeSize(op.type, undefined, 1, text ?? '')
  const endCol =
    op.endCol != null && Number.isFinite(op.endCol)
      ? op.endCol
      : op.type === 'line' || op.type === 'arrow'
        ? op.col + (op.w ?? size.w) - 1
        : undefined
  const endRow =
    op.endRow != null && Number.isFinite(op.endRow)
      ? op.endRow
      : op.type === 'line' || op.type === 'arrow'
        ? op.row + (op.h ?? size.h) - 1
        : undefined
  return clampItem({
    id: newItemId(),
    layer,
    kind: op.type,
    col: op.col,
    row: op.row,
    w: op.w ?? size.w,
    h: op.h ?? size.h,
    endCol,
    endRow,
    text,
    color: layer === 'ai' ? AI_COLOR : parseGridColor(op.color),
  })
}

function itemFromStamp(
  op: Extract<DrawOp, { op: 'stamp' }>,
  layer: GridItem['layer'],
): GridItem {
  const stamp = parseStampId(op.id) ?? 'square'
  const size = defaultShapeSize('stamp', stamp, op.scale ?? 1)
  const w = op.w != null && Number.isFinite(op.w) ? Math.round(op.w) : size.w
  const h = op.h != null && Number.isFinite(op.h) ? Math.round(op.h) : size.h
  return clampItem({
    id: newItemId(),
    layer,
    kind: 'stamp',
    col: op.col,
    row: op.row,
    w,
    h,
    color: layer === 'ai' ? AI_COLOR : 'blue',
    stamp,
  })
}

export function applyDrawOpsToGrid(
  current: StudyBoardScene,
  ops: DrawOp[],
): StudyBoardScene {
  const cols = GRID_COLS
  const rows = GRID_ROWS
  let items = [...current.items]
  let created: GridItem[] = []

  for (const op of ops) {
    if (op.op === 'clear_board') {
      items = []
      created = []
      continue
    }
    if (op.op === 'clear_layer') {
      items = items.filter((item) => item.layer !== op.layer)
      continue
    }
    if (op.op === 'shape') {
      created.push(itemFromShape(op, 'ai'))
      continue
    }
    if (op.op === 'stamp') {
      created.push(itemFromStamp(op, 'ai'))
    }
  }

  const placed = centerItems(created, cols, rows)
  return {
    type: 'taskia-grid',
    version: 1,
    source: 'taskia-grid',
    cols,
    rows,
    items: [...items, ...placed],
  }
}

export function promptOpsToScene(ops: DrawOp[]): StudyBoardScene {
  return applyDrawOpsToGrid(emptyGridScene(), ops)
}

export function normalizeScene(raw: unknown): StudyBoardScene {
  if (!isGridScene(raw)) return emptyGridScene()
  const rec = raw as StudyBoardScene
  const cols = GRID_COLS
  const rows = GRID_ROWS
  const items = Array.isArray(rec.items)
    ? rec.items
        .filter((item): item is GridItem => {
          if (!item || typeof item !== 'object') return false
          const kind = (item as GridItem).kind
          return [
            'rectangle',
            'ellipse',
            'triangle',
            'line',
            'arrow',
            'text',
            'stamp',
          ].includes(kind)
        })
        .map((item) =>
          clampItem(
            {
              id: String(item.id || newItemId()),
              layer: item.layer === 'ai' ? 'ai' : 'student',
              kind: item.kind,
              col: Number(item.col ?? 0),
              row: Number(item.row ?? 0),
              w: Number(item.w ?? 1),
              h: Number(item.h ?? 1),
              endCol: item.endCol != null ? Number(item.endCol) : undefined,
              endRow: item.endRow != null ? Number(item.endRow) : undefined,
              text: item.text,
              color:
                item.layer === 'ai'
                  ? AI_COLOR
                  : parseGridColor(item.color) === AI_COLOR
                    ? 'blue'
                    : parseGridColor(item.color),
              stamp: item.stamp,
            },
            cols,
            rows,
          ),
        )
    : []
  return {
    type: 'taskia-grid',
    version: 1,
    source: 'taskia-grid',
    cols,
    rows,
    items,
  }
}

export function describeGridScene(scene: StudyBoardScene): string {
  const items = scene.items ?? []
  const header = `Grilla ${scene.cols}x${scene.rows} (col 0–${scene.cols - 1}, fila 0–${scene.rows - 1}). Origen arriba-izquierda.`
  if (items.length === 0) return `${header}\nLa pizarra está vacía.`
  const lines = items.slice(0, 40).map((item) => {
    const who = item.layer === 'ai' ? 'AI' : 'Alumno'
    const kind = item.kind === 'stamp' ? item.stamp ?? 'stamp' : item.kind
    const label = item.text?.trim() ? ` "${item.text.trim()}"` : ''
    if (isStrokeKind(item.kind)) {
      const { c1, r1, c2, r2 } = lineEnds(item)
      return `${who}: ${kind}${label} de (${c1},${r1}) a (${c2},${r2})`
    }
    return `${who}: ${kind}${label} en (${item.col},${item.row}) ${item.w}x${item.h}`
  })
  const extra =
    items.length > 40 ? `\n…y ${items.length - 40} formas más.` : ''
  return `${header}\n${lines.join('\n')}${extra}`
}

export function hasStudentWork(scene: StudyBoardScene | null | undefined) {
  return Boolean(scene?.items?.some((item) => item.layer === 'student'))
}

export function makeStudentItem(
  kind: GridItemKind,
  col: number,
  row: number,
  color: GridColor,
  stamp?: GridStampId,
  text?: string,
): GridItem {
  const size = defaultShapeSize(kind, stamp, 1, text ?? '')
  const endCol = isStrokeKind(kind) ? col : undefined
  const endRow = isStrokeKind(kind) ? row : undefined
  return clampItem({
    id: newItemId(),
    layer: 'student',
    kind,
    col,
    row,
    w: size.w,
    h: size.h,
    endCol,
    endRow,
    color: color === AI_COLOR ? 'blue' : color,
    stamp,
    text,
  })
}
