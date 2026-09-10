import type {
  Course,
  Difficulty,
  PublicUser,
  Task,
  TaskFilters,
  TaskKind,
  TaskStatus,
} from './types'
import type {
  ChallengeAnswerPayload,
  ChallengeDetail,
  ChallengePreset,
  ImportableMission,
  MissionChatResponse,
  MissionSession,
  StudyChallenge,
  StudyMission,
  StudyWorld,
  StudyWorldCourse,
} from './lib/worldsTypes'
import type { StudyBoardScene, StudyChatResponse, StudySession } from './lib/studyProtocol'
import type {
  AdminCourse,
  AdminCourseImportResult,
  AdminDashboard,
  AdminOverview,
  AdminStudent,
  AdminChallengeRow,
  AdminStudyRow,
  AdminTaskRow,
  AdminWorldDetail,
  AdminWorldTree,
} from './lib/adminTypes'
import { adminQuery } from './lib/adminTypes'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  '',
) || 'http://localhost:3001'

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!res.ok) {
    const msg =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Error HTTP ${res.status}`
    throw new Error(msg)
  }

  return data as T
}

function cleanFilters(filters: TaskFilters) {
  const params = new URLSearchParams()
  if (filters.created_on) params.set('created_on', filters.created_on)
  if (filters.due_on) params.set('due_on', filters.due_on)
  if (filters.course_id != null) params.set('course_id', String(filters.course_id))
  if (filters.status) params.set('status', filters.status)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export const api = {
  login(username: string, password: string) {
    return request<PublicUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  logout() {
    return request<{ ok: boolean }>('/auth/logout', { method: 'POST' }).then(
      () => undefined,
    )
  },
  currentUser() {
    return request<PublicUser>('/auth/me').catch(() => null)
  },
  updateMe(input: { username: string; email: string; password?: string }) {
    return request<PublicUser>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  listCourses() {
    return request<Course[]>('/courses')
  },
  listDifficulties() {
    return request<Difficulty[]>('/difficulties')
  },
  listTasks(filters: TaskFilters) {
    return request<Task[]>(`/tasks${cleanFilters(filters)}`)
  },
  createTask(input: {
    title: string
    description?: string
    course_id: number
    difficulty_id: number
    task_kind: TaskKind
    due_date?: string
    uses_board?: boolean
  }) {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  updateTask(input: {
    task_id: number
    title: string
    description?: string
    course_id: number
    difficulty_id: number
    task_kind: TaskKind
    due_date?: string
    status: TaskStatus
    uses_board?: boolean
    study_mode_chosen?: boolean
  }) {
    const { task_id, ...body } = input
    return request<Task>(`/tasks/${task_id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },
  moveTask(task_id: number, status: TaskStatus, board_order: number) {
    return request<Task>('/tasks/move', {
      method: 'POST',
      body: JSON.stringify({ task_id, status, board_order }),
    })
  },
  reorderTasks(
    items: { task_id: number; status: TaskStatus; board_order: number }[],
  ) {
    return request<{ ok: boolean }>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }).then(() => undefined)
  },
  studyLoadSession(task_id: number) {
    return request<StudySession>(`/study/${task_id}`)
  },
  studySaveBoard(task_id: number, board: StudyBoardScene) {
    return request<{ ok: boolean }>(`/study/${task_id}/board`, {
      method: 'PUT',
      body: JSON.stringify({ board }),
    }).then(() => undefined)
  },
  studyChat(
    task_id: number,
    user_message: string,
    board?: { description?: string; image_base64?: string | null },
    allowAiDraw = false,
    fromVoice = false,
  ) {
    return request<StudyChatResponse>(`/study/${task_id}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        user_message,
        board_description: board?.description ?? null,
        board_image_base64: board?.image_base64 ?? null,
        allow_ai_draw: allowAiDraw,
        from_voice: fromVoice,
      }),
    })
  },
  transcribeAudio(input: {
    audio_base64: string
    mime_type: string
    duration_seconds: number
  }) {
    return request<{ text: string; truncated?: boolean }>('/study/transcribe', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  listWorlds() {
    return request<StudyWorld[]>('/worlds')
  },
  createWorld(title: string, description?: string) {
    return request<StudyWorld>('/worlds', {
      method: 'POST',
      body: JSON.stringify({ title, description: description ?? null }),
    })
  },
  updateWorld(world_id: number, title: string, description?: string) {
    return request<StudyWorld>(`/worlds/${world_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, description: description ?? null }),
    })
  },
  deleteWorld(world_id: number) {
    return request<{ ok: boolean }>(`/worlds/${world_id}`, {
      method: 'DELETE',
    }).then(() => undefined)
  },
  listWorldCourses(world_id: number) {
    return request<StudyWorldCourse[]>(`/worlds/${world_id}/courses`)
  },
  addWorldCourse(world_id: number, course_id: number) {
    return request<StudyWorldCourse[]>(`/worlds/${world_id}/courses`, {
      method: 'POST',
      body: JSON.stringify({ course_id }),
    })
  },
  removeWorldCourse(world_id: number, course_id: number) {
    return request<StudyWorldCourse[]>(
      `/worlds/${world_id}/courses/${course_id}`,
      { method: 'DELETE' },
    )
  },
  listMissions(world_id: number, course_id: number) {
    return request<StudyMission[]>(
      `/worlds/${world_id}/courses/${course_id}/missions`,
    )
  },
  createMission(input: {
    world_id: number
    course_id: number
    title: string
    description?: string
    uses_board: boolean
  }) {
    return request<StudyMission>(
      `/worlds/${input.world_id}/courses/${input.course_id}/missions`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          description: input.description ?? null,
          uses_board: input.uses_board,
        }),
      },
    )
  },
  updateMission(input: {
    mission_id: number
    title: string
    description?: string
    uses_board: boolean
  }) {
    return request<StudyMission>(`/worlds/missions/${input.mission_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: input.title,
        description: input.description ?? null,
        uses_board: input.uses_board,
      }),
    })
  },
  deleteMission(mission_id: number) {
    return request<{ ok: boolean }>(`/worlds/missions/${mission_id}`, {
      method: 'DELETE',
    }).then(() => undefined)
  },
  listImportableMissions(world_id: number, course_id: number) {
    return request<ImportableMission[]>(
      `/worlds/${world_id}/courses/${course_id}/importable`,
    )
  },
  importMissions(world_id: number, course_id: number, mission_ids: number[]) {
    return request<StudyMission[]>(
      `/worlds/${world_id}/courses/${course_id}/import`,
      {
        method: 'POST',
        body: JSON.stringify({ mission_ids }),
      },
    )
  },
  missionLoadSession(mission_id: number) {
    return request<MissionSession>(`/worlds/missions/${mission_id}/session`)
  },
  missionSaveBoard(mission_id: number, board: StudyBoardScene) {
    return request<{ ok: boolean }>(`/worlds/missions/${mission_id}/board`, {
      method: 'PUT',
      body: JSON.stringify({ board }),
    }).then(() => undefined)
  },
  missionChat(
    mission_id: number,
    user_message: string,
    board?: { description?: string; image_base64?: string | null },
    allowAiDraw = false,
    fromVoice = false,
  ) {
    return request<MissionChatResponse>(
      `/worlds/missions/${mission_id}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_message,
          board_description: board?.description ?? null,
          board_image_base64: board?.image_base64 ?? null,
          allow_ai_draw: allowAiDraw,
          from_voice: fromVoice,
        }),
      },
    )
  },
  listChallengePresets() {
    return request<ChallengePreset[]>('/worlds/challenge-presets')
  },
  listChallenges(
    world_id: number,
    course_id?: number | null,
    mission_id?: number | null,
  ) {
    const params = new URLSearchParams()
    if (course_id != null) params.set('course_id', String(course_id))
    if (mission_id != null) params.set('mission_id', String(mission_id))
    const q = params.toString()
    return request<StudyChallenge[]>(
      `/worlds/${world_id}/challenges${q ? `?${q}` : ''}`,
    )
  },
  startChallenge(input: {
    world_id: number
    scope: string
    difficulty: string
    mission_id?: number | null
    course_id?: number | null
  }) {
    return request<ChallengeDetail>('/worlds/challenges/start', {
      method: 'POST',
      body: JSON.stringify({
        world_id: input.world_id,
        scope: input.scope,
        difficulty: input.difficulty,
        mission_id: input.mission_id ?? null,
        course_id: input.course_id ?? null,
      }),
    })
  },
  getChallenge(challenge_id: number) {
    return request<ChallengeDetail>(`/worlds/challenges/${challenge_id}`)
  },
  abandonChallenge(challenge_id: number) {
    return request<{ ok: boolean }>(`/worlds/challenges/${challenge_id}`, {
      method: 'DELETE',
    }).then(() => undefined)
  },
  completeChallenge(challenge_id: number, answers: ChallengeAnswerPayload[]) {
    return request<ChallengeDetail>(
      `/worlds/challenges/${challenge_id}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ answers }),
      },
    )
  },
  listStudents() {
    return request<AdminStudent[]>('/admin/students')
  },
  createStudent(input: { username: string; email: string; password: string }) {
    return request<AdminStudent>('/admin/students', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  updateStudent(
    student_id: number,
    input: {
      username?: string
      email?: string
      password?: string
      is_active?: boolean
    },
  ) {
    return request<AdminStudent>(`/admin/students/${student_id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  listStudentCourses(student_id: number) {
    return request<AdminCourse[]>(`/admin/students/${student_id}/courses`)
  },
  createStudentCourse(student_id: number, name: string) {
    return request<AdminCourse>(`/admin/students/${student_id}/courses`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },
  updateStudentCourse(
    student_id: number,
    course_id: number,
    input: { name?: string; is_active?: boolean },
  ) {
    return request<AdminCourse>(
      `/admin/students/${student_id}/courses/${course_id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
  },
  archiveStudentCourse(student_id: number, course_id: number) {
    return request<{ ok: boolean }>(
      `/admin/students/${student_id}/courses/${course_id}`,
      { method: 'DELETE' },
    ).then(() => undefined)
  },
  getStudentOverview(student_id: number) {
    return request<AdminOverview>(`/admin/students/${student_id}/overview`)
  },
  getAdminDashboard(
    filters: {
      from?: string | null
      to?: string | null
      student_id?: number | null
    } = {},
  ) {
    return request<AdminDashboard>(
      `/admin/dashboard${adminQuery({
        from: filters.from,
        to: filters.to,
        student_id: filters.student_id,
      })}`,
    )
  },
  importStudentCourses(
    student_id: number,
    input: { from_student_id: number; course_ids?: number[] },
  ) {
    return request<AdminCourseImportResult>(
      `/admin/students/${student_id}/courses/import`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },
  listAdminStudentTasks(
    student_id: number,
    filters: {
      created_from?: string | null
      created_to?: string | null
      due_from?: string | null
      due_to?: string | null
      status?: string | null
      course_id?: number | null
    } = {},
  ) {
    return request<AdminTaskRow[]>(
      `/admin/students/${student_id}/tasks${adminQuery({
        created_from: filters.created_from,
        created_to: filters.created_to,
        due_from: filters.due_from,
        due_to: filters.due_to,
        status: filters.status,
        course_id: filters.course_id,
      })}`,
    )
  },
  listAdminStudentStudy(
    student_id: number,
    filters: {
      from?: string | null
      to?: string | null
      kind?: 'task' | 'mission' | null
    } = {},
  ) {
    return request<AdminStudyRow[]>(
      `/admin/students/${student_id}/study${adminQuery({
        from: filters.from,
        to: filters.to,
        kind: filters.kind,
      })}`,
    )
  },
  listAdminStudentChallenges(
    student_id: number,
    filters: { from?: string | null; to?: string | null } = {},
  ) {
    return request<AdminChallengeRow[]>(
      `/admin/students/${student_id}/challenges${adminQuery({
        from: filters.from,
        to: filters.to,
      })}`,
    )
  },
  getAdminStudentChallenge(student_id: number, challenge_id: number) {
    return request<ChallengeDetail>(
      `/admin/students/${student_id}/challenges/${challenge_id}`,
    )
  },
  listAdminStudentWorlds(student_id: number) {
    return request<AdminWorldDetail[]>(`/admin/students/${student_id}/worlds`)
  },
  getAdminStudentWorldsTree(
    student_id: number,
    filters: {
      from?: string | null
      to?: string | null
      status?: string | null
      course_id?: number | null
      difficulty?: string | null
    } = {},
  ) {
    return request<AdminWorldTree>(
      `/admin/students/${student_id}/worlds-tree${adminQuery({
        from: filters.from,
        to: filters.to,
        status: filters.status,
        course_id: filters.course_id,
        difficulty: filters.difficulty,
      })}`,
    )
  },
}
