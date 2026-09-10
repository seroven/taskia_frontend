export type UserRole = 'user' | 'admin'

export type TaskStatus = 'pending' | 'in_progress' | 'studying' | 'done'

export type TaskKind = 'daily' | 'project'

export interface PublicUser {
  id: number
  username: string
  email: string
  role: UserRole
}

export interface Course {
  id: number
  name: string
}

export interface Difficulty {
  id: number
  code: string
  name: string
  sort_order: number
}

export interface Task {
  id: number
  user_id: number
  course_id: number
  course_name: string
  difficulty_id: number
  difficulty_code: string
  difficulty_name: string
  title: string
  description: string | null
  task_kind: TaskKind
  status: TaskStatus
  board_order: number
  /** True si la IA confirmó que el niño dominó la tarea (candado Alta). */
  study_passed: boolean
  /** Si true, el modo estudio muestra Excalidraw. */
  uses_board: boolean
  /** Si true, ya eligió charla vs pizarra (no repetir el modal). */
  study_mode_chosen: boolean
  due_date: string
  created_at: string
  updated_at: string
}

export interface TaskFilters {
  created_on?: string | null
  due_on?: string | null
  course_id?: number | null
  status?: TaskStatus | null
}

export const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'in_progress', label: 'En proceso' },
  { id: 'studying', label: 'En estudio' },
  { id: 'done', label: 'Terminado' },
]

/** Candado de dificultad Alta → Terminado. */
export const STUDY_PASSED_REQUIRED_TITLE = 'Aún no puedes terminar'
export const STUDY_PASSED_REQUIRED_MSG =
  'Estudia con el tutor hasta que diga que estás listo.'

export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Vista de estudio: En estudio, o Terminado si es dificultad Alta. */
export function canOpenStudyMode(task: Pick<Task, 'status' | 'difficulty_code'>): boolean {
  if (task.status === 'studying') return true
  return task.status === 'done' && task.difficulty_code === 'high'
}

/** Alta siempre, o cualquier tarea que esté en estudio, necesita el visto del tutor. */
export function needsStudyPassedGate(
  task: Pick<Task, 'status' | 'difficulty_code' | 'study_passed'>,
  nextStatus: TaskStatus,
  nextDifficultyCode: string = task.difficulty_code,
): boolean {
  if (nextStatus !== 'done' || task.status === 'done' || task.study_passed) {
    return false
  }
  return nextDifficultyCode === 'high' || task.status === 'studying'
}

export function taskStudyPatch(task: Task, overrides: Partial<{
  uses_board: boolean
  study_mode_chosen: boolean
  status: TaskStatus
}>) {
  return {
    task_id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    course_id: task.course_id,
    difficulty_id: task.difficulty_id,
    task_kind: task.task_kind,
    due_date: task.task_kind === 'project' ? task.due_date : undefined,
    status: overrides.status ?? task.status,
    uses_board: overrides.uses_board ?? task.uses_board,
    study_mode_chosen: overrides.study_mode_chosen ?? task.study_mode_chosen,
  }
}
