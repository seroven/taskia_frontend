import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  ArrowRight,
  Circle,
  Cursor,
  Hand,
  LineSegment,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Rectangle,
  TextT,
  Trash,
  Triangle,
} from '@phosphor-icons/react'
import type { DrawOp, GridColor, GridItem, GridStampId, StudyBoardScene } from '../../lib/studyProtocol'
import {
  GRID_CELL,
  GRID_COLORS,
  applyDrawOpsToGrid,
  clampItem,
  describeGridScene,
  emptyGridScene,
  isStrokeKind,
  itemBBox,
  itemHitsCell,
  itemIntersectsArea,
  itemStroke,
  lineEnds,
  makeStudentItem,
  normalizeScene,
  textChars,
  themeDefaultColor,
} from '../../lib/gridBoardModel'

export interface BoardAttachment {
  description: string
  imageBase64: string | null
  elementCount: number
}

export interface GridBoardHandle {
  applyDrawOps: (ops: DrawOp[]) => void
  getBoardAttachment: () => Promise<BoardAttachment>
  getScene: () => StudyBoardScene | null
}

interface Props {
  initialBoard: StudyBoardScene | null
  onSave: (board: StudyBoardScene) => void
  theme: 'light' | 'dark'
}

type Tool =
  | 'pan'
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'text'
  | GridStampId

const VIEW_TOOLS: Array<{ id: 'pan' | 'select'; label: string; icon: 'hand' | 'cursor' }> = [
  { id: 'pan', label: 'Mano', icon: 'hand' },
  { id: 'select', label: 'Seleccionar', icon: 'cursor' },
]

const DRAW_TOOLS: Array<{ id: Tool; label: string; icon?: 'rect' | 'circle' | 'tri' | 'line' | 'arrow' | 'text' }> = [
  { id: 'rectangle', label: 'Cuadro', icon: 'rect' },
  { id: 'ellipse', label: 'Círculo', icon: 'circle' },
  { id: 'triangle', label: 'Triángulo', icon: 'tri' },
  { id: 'line', label: 'Línea', icon: 'line' },
  { id: 'arrow', label: 'Flecha', icon: 'arrow' },
  { id: 'text', label: 'Texto', icon: 'text' },
  { id: 'right_triangle', label: 'Rectángulo 90°' },
  { id: 'circle', label: 'Sello círculo' },
  { id: 'square', label: 'Sello cuadro' },
]

const COLOR_ORDER: GridColor[] = [
  'white',
  'black',
  'blue',
  'red',
  'green',
  'orange',
  'gray',
]

const TEXT_FONT =
  "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace"

function toolKind(tool: Tool): { kind: GridItem['kind']; stamp?: GridStampId } | null {
  if (tool === 'select' || tool === 'pan') return null
  if (
    tool === 'right_triangle' ||
    tool === 'circle' ||
    tool === 'square' ||
    tool === 'number_line'
  ) {
    return { kind: 'stamp', stamp: tool }
  }
  return { kind: tool }
}

function cellAt(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  zoom: number,
  panX: number,
  panY: number,
) {
  const rect = svg.getBoundingClientRect()
  const x = (clientX - rect.left - panX) / zoom
  const y = (clientY - rect.top - panY) / zoom
  return {
    col: Math.floor(x / GRID_CELL),
    row: Math.floor(y / GRID_CELL),
  }
}

function strokePoints(item: GridItem) {
  const { c1, r1, c2, r2 } = lineEnds(item)
  const x1 = c1 * GRID_CELL + GRID_CELL / 2
  const y1 = r1 * GRID_CELL + GRID_CELL / 2
  const x2 = c2 * GRID_CELL + GRID_CELL / 2
  const y2 = r2 * GRID_CELL + GRID_CELL / 2
  if (c1 === c2 && r1 === r2) {
    return {
      x1: c1 * GRID_CELL + 4,
      y1,
      x2: c1 * GRID_CELL + GRID_CELL - 4,
      y2: y1,
    }
  }
  return { x1, y1, x2, y2 }
}

function arrowHeadPoints(x1: number, y1: number, x2: number, y2: number, size = 12) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const left = {
    x: x2 - size * Math.cos(angle - Math.PI / 6),
    y: y2 - size * Math.sin(angle - Math.PI / 6),
  }
  const right = {
    x: x2 - size * Math.cos(angle + Math.PI / 6),
    y: y2 - size * Math.sin(angle + Math.PI / 6),
  }
  return `${x2},${y2} ${left.x},${left.y} ${right.x},${right.y}`
}

export const GridBoard = forwardRef<GridBoardHandle, Props>(
  function GridBoard({ initialBoard, onSave, theme }, ref) {
    const [scene, setScene] = useState<StudyBoardScene>(() =>
      normalizeScene(initialBoard),
    )
    const [tool, setTool] = useState<Tool>('select')
    const [color, setColor] = useState<GridColor>(() => themeDefaultColor(theme))
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [caretIndex, setCaretIndex] = useState(0)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [panning, setPanning] = useState(false)
    const [marquee, setMarquee] = useState<{
      c0: number
      r0: number
      c1: number
      r1: number
    } | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const textEditRef = useRef<HTMLInputElement>(null)
    const sceneRef = useRef(scene)
    const zoomRef = useRef(zoom)
    const centeredRef = useRef(false)
    const gridPatternId = `taskia-grid-cells-${useId().replace(/:/g, '')}`
    const saveTimer = useRef<number | null>(null)
    const pendingTextEditRef = useRef<string | null>(null)
    const pendingCaretRef = useRef(0)
    const caretIndexRef = useRef(0)
    const editingIdRef = useRef<string | null>(null)
    const editorKeyRef = useRef<(event: KeyboardEvent) => void>(() => {})
    const handledKeyRef = useRef(false)
    const ignoreTextBlurRef = useRef(false)
    const lastTapRef = useRef<{ t: number; col: number; row: number } | null>(null)
    const drag = useRef<
      | {
          mode: 'move'
          id: string
          dc: number
          dr: number
          origins: GridItem[]
        }
      | { mode: 'resize'; id: string; corner: string; start: GridItem }
      | { mode: 'draw'; id: string }
      | { mode: 'endpoint'; id: string; which: 'start' | 'end' }
      | {
          mode: 'press-move'
          id: string
          dc: number
          dr: number
          origins: GridItem[]
          x: number
          y: number
          col: number
          row: number
        }
      | { mode: 'press-marquee'; c0: number; r0: number; x: number; y: number }
      | { mode: 'marquee'; c0: number; r0: number }
      | { mode: 'pan'; x: number; y: number; panX: number; panY: number }
      | null
    >(null)

    sceneRef.current = scene
    zoomRef.current = zoom
    caretIndexRef.current = caretIndex
    editingIdRef.current = editingId
    const cols = scene.cols
    const rows = scene.rows
    const width = cols * GRID_CELL
    const height = rows * GRID_CELL

    const persist = useCallback(
      (next: StudyBoardScene) => {
        if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => onSave(next), 280)
      },
      [onSave],
    )

    const commit = useCallback(
      (next: StudyBoardScene) => {
        setScene(next)
        sceneRef.current = next
        persist(next)
      },
      [persist],
    )

    useImperativeHandle(
      ref,
      () => ({
        applyDrawOps(ops: DrawOp[]) {
          const next = applyDrawOpsToGrid(emptyGridScene(), ops)
          commit(next)
          setSelectedIds([])
        },
        async getBoardAttachment() {
          const current = sceneRef.current
          return {
            description: describeGridScene(current),
            imageBase64: null,
            elementCount: current.items.length,
          }
        },
        getScene() {
          return sceneRef.current
        },
      }),
      [commit],
    )

    useLayoutEffect(() => {
      const svg = svgRef.current
      if (!svg) return

      const centerPaper = () => {
        const vw = svg.clientWidth
        const vh = svg.clientHeight
        if (vw < 8 || vh < 8) return false
        const z = zoomRef.current
        const paperW = sceneRef.current.cols * GRID_CELL
        const paperH = sceneRef.current.rows * GRID_CELL
        setPan({
          x: vw / 2 - (paperW * z) / 2,
          y: vh / 2 - (paperH * z) / 2,
        })
        return true
      }

      if (centerPaper()) {
        centeredRef.current = true
        return
      }

      const observer = new ResizeObserver(() => {
        if (centeredRef.current) return
        if (centerPaper()) {
          centeredRef.current = true
          observer.disconnect()
        }
      })
      observer.observe(svg)
      return () => observer.disconnect()
    }, [])

    useEffect(() => {
      return () => {
        if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
      }
    }, [])

    useEffect(() => {
      const svg = svgRef.current
      if (!svg) return
      const block = (event: Event) => event.preventDefault()
      svg.addEventListener('selectstart', block)
      return () => svg.removeEventListener('selectstart', block)
    }, [])

    useEffect(() => {
      if (!editingId) return
      ignoreTextBlurRef.current = true
      const focusTimer = window.setTimeout(() => {
        const input = textEditRef.current
        input?.focus()
        const idx = pendingCaretRef.current
        caretIndexRef.current = idx
        setCaretIndex(idx)
        if (input) {
          const len = input.value.length
          const at = Math.max(0, Math.min(idx, len))
          input.setSelectionRange(at, at)
        }
        ignoreTextBlurRef.current = false
      }, 0)

      const onKey = (event: KeyboardEvent) => {
        editorKeyRef.current(event)
      }
      window.addEventListener('keydown', onKey, true)
      return () => {
        window.clearTimeout(focusTimer)
        window.removeEventListener('keydown', onKey, true)
      }
    }, [editingId])

    const selectedItems = useMemo(
      () => scene.items.filter((item) => selectedIds.includes(item.id)),
      [scene.items, selectedIds],
    )

    function beginTextEdit(id: string, index = 0) {
      pendingTextEditRef.current = null
      pendingCaretRef.current = Math.max(0, index)
      ignoreTextBlurRef.current = true
      setEditingId(id)
      setCaretIndex(Math.max(0, index))
    }

    function finishTextEdit() {
      pendingTextEditRef.current = null
      ignoreTextBlurRef.current = false
      setEditingId(null)
    }

    function findStudentTextAt(col: number, row: number) {
      return [...sceneRef.current.items]
        .reverse()
        .find(
          (item) =>
            item.layer === 'student' &&
            item.kind === 'text' &&
            itemHitsCell(item, col, row),
        )
    }

    function caretIndexAt(item: GridItem, col: number) {
      const len = textChars(item.text ?? '').length
      return Math.max(0, Math.min(len, col - item.col))
    }

    function placeTextAt(col: number, row: number) {
      const item = makeStudentItem('text', col, row, color, undefined, '')
      const current = sceneRef.current
      commit({ ...current, items: [...current.items, item] })
      setSelectedIds([item.id])
      pendingTextEditRef.current = item.id
      pendingCaretRef.current = 0
      setTool('select')
    }

    function handleSelectDoubleClick(col: number, row: number) {
      const textHit = findStudentTextAt(col, row)
      if (textHit) {
        setSelectedIds([textHit.id])
        pendingTextEditRef.current = textHit.id
        pendingCaretRef.current = caretIndexAt(textHit, col)
        return
      }
      const items = sceneRef.current.items
      const studentHit = [...items]
        .reverse()
        .find((item) => item.layer === 'student' && itemHitsCell(item, col, row))
      if (studentHit) return
      const onAi = items.some(
        (item) => item.layer === 'ai' && itemHitsCell(item, col, row),
      )
      if (onAi) return
      if (col < 0 || row < 0 || col >= sceneRef.current.cols || row >= sceneRef.current.rows) {
        return
      }
      placeTextAt(col, row)
    }

    function placeAt(col: number, row: number) {
      const spec = toolKind(tool)
      if (!spec) return
      let text: string | undefined
      if (spec.kind === 'text') {
        text = ''
      }
      const item = makeStudentItem(spec.kind, col, row, color, spec.stamp, text)
      const current = sceneRef.current
      commit({ ...current, items: [...current.items, item] })
      setSelectedIds([item.id])
      if (spec.kind === 'text') pendingTextEditRef.current = item.id
      if (spec.kind === 'text') pendingCaretRef.current = 0
      setTool('select')
    }

    function updateItem(id: string, patch: Partial<GridItem>) {
      const current = sceneRef.current
      const next: StudyBoardScene = {
        ...current,
        items: current.items.map((item) =>
          item.id === id ? clampItem({ ...item, ...patch }, current.cols, current.rows) : item,
        ),
      }
      commit(next)
    }

    function typeIntoEditing(raw: string) {
      const id = editingIdRef.current
      if (!id) return
      const item = sceneRef.current.items.find((it) => it.id === id)
      if (!item || item.layer !== 'student' || item.kind !== 'text') return
      const incoming = textChars(raw).filter((ch) => ch !== '\n' && ch !== '\r')
      if (incoming.length === 0) return
      const chars = textChars(item.text ?? '')
      let at = Math.max(0, Math.min(caretIndexRef.current, chars.length))
      for (const ch of incoming) {
        if (at < chars.length) chars[at] = ch
        else chars.push(ch)
        at += 1
      }
      const next = chars.join('')
      caretIndexRef.current = at
      setCaretIndex(at)
      updateItem(id, { text: next, w: Math.max(1, textChars(next).length) })
    }

    function backspaceEditing() {
      const id = editingIdRef.current
      if (!id) return
      const item = sceneRef.current.items.find((it) => it.id === id)
      if (!item || item.kind !== 'text') return
      const chars = textChars(item.text ?? '')
      const at = caretIndexRef.current
      if (at < chars.length) {
        chars.splice(at, 1)
      } else if (at > 0) {
        chars.splice(at - 1, 1)
        caretIndexRef.current = at - 1
        setCaretIndex(at - 1)
      } else {
        return
      }
      const next = chars.join('')
      caretIndexRef.current = Math.min(caretIndexRef.current, textChars(next).length)
      setCaretIndex(caretIndexRef.current)
      updateItem(id, { text: next, w: Math.max(1, textChars(next).length) })
    }

    editorKeyRef.current = (event: KeyboardEvent) => {
      if (!editingIdRef.current) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.isComposing || event.key === 'Process') return
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        finishTextEdit()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        handledKeyRef.current = true
        backspaceEditing()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const nextIdx = Math.max(0, caretIndexRef.current - 1)
        caretIndexRef.current = nextIdx
        setCaretIndex(nextIdx)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const item = sceneRef.current.items.find((it) => it.id === editingIdRef.current)
        const len = textChars(item?.text ?? '').length
        const nextIdx = Math.min(len, caretIndexRef.current + 1)
        caretIndexRef.current = nextIdx
        setCaretIndex(nextIdx)
        return
      }
      if (event.key.length === 1) {
        event.preventDefault()
        handledKeyRef.current = true
        typeIntoEditing(event.key)
      }
    }

    function moveGroup(origins: GridItem[], dCol: number, dRow: number) {
      const current = sceneRef.current
      const byId = new Map(origins.map((item) => [item.id, item]))
      const next: StudyBoardScene = {
        ...current,
        items: current.items.map((item) => {
          const origin = byId.get(item.id)
          if (!origin) return item
          if (isStrokeKind(origin.kind)) {
            const ends = lineEnds(origin)
            return clampItem(
              {
                ...origin,
                col: ends.c1 + dCol,
                row: ends.r1 + dRow,
                endCol: ends.c2 + dCol,
                endRow: ends.r2 + dRow,
              },
              current.cols,
              current.rows,
            )
          }
          return clampItem(
            { ...origin, col: origin.col + dCol, row: origin.row + dRow },
            current.cols,
            current.rows,
          )
        }),
      }
      commit(next)
    }

    function deleteSelected() {
      const ids = new Set(
        selectedItems.filter((item) => item.layer === 'student').map((item) => item.id),
      )
      if (ids.size === 0) return
      commit({
        ...scene,
        items: scene.items.filter((item) => !ids.has(item.id)),
      })
      setSelectedIds([])
    }

    function beginPan(event: ReactPointerEvent<SVGSVGElement>, svg: SVGSVGElement) {
      drag.current = {
        mode: 'pan',
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      }
      setPanning(true)
      svg.setPointerCapture(event.pointerId)
    }

    function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
      const svg = svgRef.current
      if (!svg) return
      event.preventDefault()
      window.getSelection()?.removeAllRanges()
      if (editingId) finishTextEdit()
      const { col, row } = cellAt(
        event.clientX,
        event.clientY,
        svg,
        zoom,
        pan.x,
        pan.y,
      )

      if (event.button === 1 || event.altKey || tool === 'pan') {
        beginPan(event, svg)
        return
      }

      if (tool === 'line' || tool === 'arrow') {
        const item = makeStudentItem(tool, col, row, color)
        const current = sceneRef.current
        commit({ ...current, items: [...current.items, item] })
        setSelectedIds([item.id])
        drag.current = { mode: 'draw', id: item.id }
        svg.setPointerCapture(event.pointerId)
        return
      }

      if (tool !== 'select') {
        placeAt(col, row)
        return
      }

      const now = performance.now()
      const last = lastTapRef.current
      const isDouble =
        last != null &&
        now - last.t < 450 &&
        last.col === col &&
        last.row === row
      lastTapRef.current = { t: now, col, row }
      if (isDouble) {
        drag.current = null
        setMarquee(null)
        handleSelectDoubleClick(col, row)
        return
      }

      const hit = [...scene.items]
        .reverse()
        .find((item) => item.layer === 'student' && itemHitsCell(item, col, row))
      if (!hit) {
        setSelectedIds([])
        drag.current = {
          mode: 'press-marquee',
          c0: col,
          r0: row,
          x: event.clientX,
          y: event.clientY,
        }
        svg.setPointerCapture(event.pointerId)
        return
      }
      const group = selectedIds.includes(hit.id)
        ? scene.items.filter((item) => selectedIds.includes(item.id) && item.layer === 'student')
        : [hit]
      setSelectedIds(group.map((item) => item.id))
      drag.current = {
        mode: 'press-move',
        id: hit.id,
        dc: col - hit.col,
        dr: row - hit.row,
        origins: group.map((item) => ({ ...item })),
        x: event.clientX,
        y: event.clientY,
        col,
        row,
      }
      svg.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
      const svg = svgRef.current
      const action = drag.current
      if (!svg || !action) return
      if (action.mode === 'pan') {
        setPan({
          x: action.panX + (event.clientX - action.x),
          y: action.panY + (event.clientY - action.y),
        })
        return
      }
      const { col, row } = cellAt(
        event.clientX,
        event.clientY,
        svg,
        zoom,
        pan.x,
        pan.y,
      )
      if (action.mode === 'press-move') {
        const dist = Math.hypot(event.clientX - action.x, event.clientY - action.y)
        if (dist < 8 && col === action.col && row === action.row) return
        drag.current = {
          mode: 'move',
          id: action.id,
          dc: action.dc,
          dr: action.dr,
          origins: action.origins,
        }
      } else if (action.mode === 'press-marquee') {
        const dist = Math.hypot(event.clientX - action.x, event.clientY - action.y)
        if (dist < 8 && col === action.c0 && row === action.r0) return
        drag.current = { mode: 'marquee', c0: action.c0, r0: action.r0 }
      }
      const current = drag.current
      if (!current || current.mode === 'press-move' || current.mode === 'press-marquee') return
      if (current.mode === 'marquee') {
        setMarquee({ c0: current.c0, r0: current.r0, c1: col, r1: row })
        const ids = sceneRef.current.items
          .filter(
            (item) =>
              item.layer === 'student' &&
              itemIntersectsArea(item, current.c0, current.r0, col, row),
          )
          .map((item) => item.id)
        setSelectedIds(ids)
        return
      }
      if (!('id' in current)) return
      const item = sceneRef.current.items.find((it) => it.id === current.id)
      if (!item || item.layer === 'ai') return
      if (current.mode === 'draw' || current.mode === 'endpoint') {
        if (current.mode === 'draw' || current.which === 'end') {
          updateItem(item.id, { endCol: col, endRow: row })
        } else {
          updateItem(item.id, { col, row })
        }
        return
      }
      if (current.mode === 'move') {
        const grabbed = current.origins.find((it) => it.id === current.id) ?? item
        const nextCol = col - current.dc
        const nextRow = row - current.dr
        moveGroup(current.origins, nextCol - grabbed.col, nextRow - grabbed.row)
        return
      }
      const start = current.start
      let next = { ...start }
      if (current.corner.includes('e')) {
        next.w = Math.max(1, col - start.col + 1)
      }
      if (current.corner.includes('s')) {
        next.h = Math.max(1, row - start.row + 1)
      }
      if (current.corner.includes('w')) {
        const right = start.col + start.w
        next.col = Math.min(col, right - 1)
        next.w = right - next.col
      }
      if (current.corner.includes('n')) {
        const bottom = start.row + start.h
        next.row = Math.min(row, bottom - 1)
        next.h = bottom - next.row
      }
      updateItem(item.id, next)
    }

    function onPointerUp() {
      if (drag.current?.mode === 'draw') setTool('select')
      drag.current = null
      setPanning(false)
      setMarquee(null)
      const pendingId = pendingTextEditRef.current
      if (pendingId) {
        window.setTimeout(() => beginTextEdit(pendingId), 0)
      }
    }

    function onWheel(event: React.WheelEvent<SVGSVGElement>) {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const dir = event.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.min(2.2, Math.max(0.15, Number((z + dir).toFixed(2)))))
    }

    function startResize(
      corner: string,
      item: GridItem,
      event: ReactPointerEvent,
    ) {
      drag.current = { mode: 'resize', id: item.id, corner, start: { ...item } }
      svgRef.current?.setPointerCapture(event.pointerId)
    }

    function startEndpoint(
      which: 'start' | 'end',
      item: GridItem,
      event: ReactPointerEvent,
    ) {
      drag.current = { mode: 'endpoint', id: item.id, which }
      svgRef.current?.setPointerCapture(event.pointerId)
    }

    const editing = scene.items.find((item) => item.id === editingId)

    return (
      <div className={`grid-board${theme === 'dark' ? ' is-dark' : ''}`}>
        <div className="grid-board-toolbar" role="toolbar" aria-label="Herramientas de pizarra">
          {VIEW_TOOLS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`grid-board-tool${tool === entry.id ? ' is-on' : ''}`}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={tool === entry.id}
              onClick={() => setTool(entry.id)}
            >
              {entry.icon === 'hand' && <Hand size={16} weight="bold" />}
              {entry.icon === 'cursor' && <Cursor size={16} weight="bold" />}
            </button>
          ))}
          <span className="grid-board-sep" aria-hidden />
          {DRAW_TOOLS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`grid-board-tool${tool === entry.id ? ' is-on' : ''}`}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={tool === entry.id}
              onClick={() => setTool(entry.id)}
            >
              {entry.icon === 'rect' && <Rectangle size={16} weight="bold" />}
              {entry.icon === 'circle' && <Circle size={16} weight="bold" />}
              {entry.icon === 'tri' && <Triangle size={16} weight="bold" />}
              {entry.icon === 'line' && <LineSegment size={16} weight="bold" />}
              {entry.icon === 'arrow' && <ArrowRight size={16} weight="bold" />}
              {entry.icon === 'text' && <TextT size={16} weight="bold" />}
              {!entry.icon && <span>{entry.label}</span>}
            </button>
          ))}
          <span className="grid-board-sep" aria-hidden />
          {COLOR_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              data-color={c}
              className={`grid-board-color${color === c ? ' is-on' : ''}`}
              style={{ '--swatch': GRID_COLORS[c] } as CSSProperties}
              aria-label={`Color ${c}`}
              title={c}
              onClick={() => {
                setColor(c)
                const ids = new Set(
                  selectedItems
                    .filter((item) => item.layer === 'student')
                    .map((item) => item.id),
                )
                if (ids.size === 0) return
                const current = sceneRef.current
                commit({
                  ...current,
                  items: current.items.map((item) =>
                    ids.has(item.id) ? { ...item, color: c } : item,
                  ),
                })
              }}
            />
          ))}
          <span className="grid-board-sep" aria-hidden />
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Alejar"
            onClick={() => setZoom((z) => Math.max(0.15, Number((z - 0.15).toFixed(2))))}
          >
            <MagnifyingGlassMinus size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Acercar"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
          >
            <MagnifyingGlassPlus size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Borrar forma"
            disabled={selectedItems.every((item) => item.layer === 'ai') || selectedItems.length === 0}
            onClick={deleteSelected}
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>

        <div className="grid-board-stage">
          <svg
            ref={svgRef}
            className={`grid-board-svg${
              tool === 'pan' ? ' is-pan' : tool === 'select' ? ' is-select' : ' is-draw'
            }${panning ? ' is-panning' : ''}`}
            width="100%"
            height="100%"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              <defs>
                <pattern
                  id={gridPatternId}
                  width={GRID_CELL}
                  height={GRID_CELL}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${GRID_CELL} 0 L 0 0 0 ${GRID_CELL}`}
                    fill="none"
                    className="grid-board-line"
                  />
                </pattern>
              </defs>
              <rect
                x={0}
                y={0}
                width={width}
                height={height}
                className="grid-board-paper"
              />
              <rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={`url(#${gridPatternId})`}
                pointerEvents="none"
              />
              <line x1={width} y1={0} x2={width} y2={height} className="grid-board-line" />
              <line x1={0} y1={height} x2={width} y2={height} className="grid-board-line" />
              {scene.items.map((item) => (
                <GridItemShape
                  key={item.id}
                  item={item}
                  selected={
                    selectedIds.includes(item.id) &&
                    item.layer === 'student' &&
                    item.id !== editingId
                  }
                  showHandles={
                    selectedIds.length === 1 &&
                    selectedIds[0] === item.id &&
                    item.layer === 'student' &&
                    item.id !== editingId
                  }
                  editing={item.id === editingId}
                  caretIndex={item.id === editingId ? caretIndex : 0}
                  onResizeStart={startResize}
                  onEndpointStart={startEndpoint}
                />
              ))}
              {marquee && (
                <rect
                  x={Math.min(marquee.c0, marquee.c1) * GRID_CELL}
                  y={Math.min(marquee.r0, marquee.r1) * GRID_CELL}
                  width={(Math.abs(marquee.c1 - marquee.c0) + 1) * GRID_CELL}
                  height={(Math.abs(marquee.r1 - marquee.r0) + 1) * GRID_CELL}
                  className="grid-board-marquee"
                  pointerEvents="none"
                />
              )}
            </g>
          </svg>
          {editing && editing.layer === 'student' && (
            <input
              ref={textEditRef}
              className="grid-board-text-edit"
              aria-label="Texto en la pizarra"
              autoFocus
              spellCheck={false}
              value={editing.text ?? ''}
              onChange={(e) => {
                if (handledKeyRef.current) {
                  handledKeyRef.current = false
                  return
                }
                const prev = editing.text ?? ''
                const next = e.target.value
                if (next === prev) return
                if (next.length > prev.length) {
                  typeIntoEditing(next.slice(prev.length))
                  return
                }
                if (next.length < prev.length) backspaceEditing()
              }}
              onBlur={() => {
                if (ignoreTextBlurRef.current) {
                  textEditRef.current?.focus()
                  return
                }
                finishTextEdit()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault()
                  finishTextEdit()
                }
              }}
            />
          )}
        </div>
        <p className="grid-board-hint muted">
          La mano mueve la vista. El cursor selecciona: clic en una forma o arrastrá un recuadro
          para agarrar varias. El dibujo violeta es del tutor y no se mueve.
        </p>
      </div>
    )
  },
)

function GridItemShape({
  item,
  selected,
  showHandles,
  editing,
  caretIndex,
  onResizeStart,
  onEndpointStart,
}: {
  item: GridItem
  selected: boolean
  showHandles: boolean
  editing: boolean
  caretIndex: number
  onResizeStart: (corner: string, item: GridItem, event: ReactPointerEvent) => void
  onEndpointStart: (which: 'start' | 'end', item: GridItem, event: ReactPointerEvent) => void
}) {
  const box = itemBBox(item)
  const x = box.col * GRID_CELL
  const y = box.row * GRID_CELL
  const w = box.w * GRID_CELL
  const h = box.h * GRID_CELL
  const stroke = itemStroke(item)
  const locked = item.layer === 'ai'
  const stamp = item.kind === 'stamp' ? item.stamp : undefined

  let body: ReactNode = null
  if (item.kind === 'ellipse' || stamp === 'circle') {
    body = (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2 - 2}
        ry={h / 2 - 2}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
      />
    )
  } else if (item.kind === 'triangle' || stamp === 'right_triangle') {
    const points =
      stamp === 'right_triangle'
        ? `${x + 2},${y + h - 2} ${x + w - 2},${y + h - 2} ${x + 2},${y + 2}`
        : `${x + w / 2},${y + 2} ${x + w - 2},${y + h - 2} ${x + 2},${y + h - 2}`
    body = (
      <polygon points={points} fill="none" stroke={stroke} strokeWidth={2.5} />
    )
  } else if (item.kind === 'line' || item.kind === 'arrow' || stamp === 'arrow') {
    const pts = strokePoints(item)
    const shaft =
      item.kind === 'arrow' || stamp === 'arrow'
        ? (() => {
            const dx = pts.x2 - pts.x1
            const dy = pts.y2 - pts.y1
            const len = Math.hypot(dx, dy) || 1
            const cut = Math.min(12, len * 0.35)
            return {
              x2: pts.x2 - (dx / len) * cut,
              y2: pts.y2 - (dy / len) * cut,
            }
          })()
        : null
    body = (
      <>
        <line
          x1={pts.x1}
          y1={pts.y1}
          x2={shaft ? shaft.x2 : pts.x2}
          y2={shaft ? shaft.y2 : pts.y2}
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {(item.kind === 'arrow' || stamp === 'arrow') && (
          <polygon points={arrowHeadPoints(pts.x1, pts.y1, pts.x2, pts.y2)} fill={stroke} />
        )}
      </>
    )
  } else if (stamp === 'number_line') {
    const ticks = 6
    body = (
      <>
        <line
          x1={x + 4}
          y1={y + h / 2}
          x2={x + w - 4}
          y2={y + h / 2}
          stroke={stroke}
          strokeWidth={3}
        />
        {Array.from({ length: ticks }, (_, i) => {
          const tx = x + 4 + ((w - 8) * i) / (ticks - 1)
          return (
            <g key={i}>
              <line
                x1={tx}
                y1={y + h / 2 - 10}
                x2={tx}
                y2={y + h / 2 + 10}
                stroke={stroke}
                strokeWidth={2}
              />
              <text
                x={tx}
                y={y + h - 4}
                textAnchor="middle"
                fontSize={11}
                fill={stroke}
              >
                {i}
              </text>
            </g>
          )
        })}
      </>
    )
  } else if (item.kind === 'text') {
    const chars = textChars(item.text ?? '')
    const caretCol = item.col + Math.max(0, Math.min(caretIndex, chars.length))
    body = (
      <g>
        {chars.map((ch, i) => (
          <text
            key={`${item.id}-${i}`}
            x={(item.col + i) * GRID_CELL + GRID_CELL / 2}
            y={item.row * GRID_CELL + GRID_CELL / 2}
            textAnchor="middle"
            dominantBaseline="central"
            alignmentBaseline="middle"
            fontSize={GRID_CELL * 0.72}
            fill={stroke}
            fontWeight={700}
            fontFamily={TEXT_FONT}
          >
            {ch === ' ' ? '\u00a0' : ch}
          </text>
        ))}
        {editing && (
          <>
            <rect
              x={caretCol * GRID_CELL + 1}
              y={item.row * GRID_CELL + 1}
              width={GRID_CELL - 2}
              height={GRID_CELL - 2}
              className="grid-board-caret-cell"
            />
            <rect
              x={caretCol * GRID_CELL + GRID_CELL / 2 - 1}
              y={item.row * GRID_CELL + 4}
              width={2}
              height={GRID_CELL - 8}
              className="grid-board-caret"
            />
          </>
        )}
      </g>
    )
  } else {
    body = (
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        rx={3}
      />
    )
  }

  const handles = showHandles
    ? isStrokeKind(item.kind)
      ? (() => {
          const { c1, r1, c2, r2 } = lineEnds(item)
          const pts = [
            {
              which: 'start' as const,
              hx: c1 * GRID_CELL + GRID_CELL / 2,
              hy: r1 * GRID_CELL + GRID_CELL / 2,
            },
            {
              which: 'end' as const,
              hx: c2 * GRID_CELL + GRID_CELL / 2,
              hy: r2 * GRID_CELL + GRID_CELL / 2,
            },
          ]
          return pts.map((pt) => (
            <rect
              key={pt.which}
              x={pt.hx - 5}
              y={pt.hy - 5}
              width={10}
              height={10}
              className="grid-board-handle"
              onPointerDown={(event) => {
                event.stopPropagation()
                onEndpointStart(pt.which, item, event)
              }}
            />
          ))
        })()
      : (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
          const hx = corner.includes('e') ? x + w : x
          const hy = corner.includes('s') ? y + h : y
          return (
            <rect
              key={corner}
              x={hx - 5}
              y={hy - 5}
              width={10}
              height={10}
              className="grid-board-handle"
              onPointerDown={(event) => {
                event.stopPropagation()
                onResizeStart(corner, item, event)
              }}
            />
          )
        })
    : null

  return (
    <g className={locked ? 'is-ai' : 'is-student'}>
      {selected && (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="var(--accent)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />
      )}
      {body}
      {item.text && item.kind !== 'text' && (
        <text
          x={x + 8}
          y={y + 16}
          fontSize={12}
          fill={stroke}
          fontWeight={700}
        >
          {item.text}
        </text>
      )}
      {handles}
    </g>
  )
}
