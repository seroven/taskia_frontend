export interface AdminStudent {
  id: number
  username: string
  email: string
  is_active: boolean
  created_at: string
  course_count?: number
}

export interface AdminCourse {
  id: number
  user_id: number
  name: string
  is_active: boolean
  created_at: string
}

export interface AdminTaskRow {
  id: number
  title: string
  status: string
  due_date: string
  study_passed: boolean
  course_id: number
  course_name: string
  created_at: string
  updated_at: string
}

export interface AdminChallengeRow {
  id: number
  scope: string
  difficulty: string
  status: string
  score: number | null
  question_count: number
  world_id?: number
  course_id?: number | null
  mission_id?: number | null
  world_title: string
  course_name: string | null
  mission_title: string | null
  started_at: string
  completed_at: string | null
}

export interface AdminStudyRow {
  kind: string
  ref_id: number
  title: string
  course_name: string
  phase: string
  summary: string
  updated_at: string
}

export interface AdminWorldTreeStudy {
  phase: string
  summary: string
  updated_at: string
}

export interface AdminWorldTreeMission {
  id: number
  title: string
  status: string
  uses_board: boolean
  updated_at: string
  study: AdminWorldTreeStudy | null
  challenges: AdminChallengeRow[]
}

export interface AdminWorldTreeCourse {
  id: number
  name: string
  missions: AdminWorldTreeMission[]
  challenges: AdminChallengeRow[]
}

export interface AdminWorldTreeWorld {
  id: number
  title: string
  description: string | null
  updated_at: string
  courses: AdminWorldTreeCourse[]
  challenges: AdminChallengeRow[]
}

export interface AdminWorldTree {
  courses: { id: number; name: string }[]
  worlds: AdminWorldTreeWorld[]
}

export interface AdminWorldDetail {
  id: number
  title: string
  description: string | null
  updated_at: string
  missions: {
    id: number
    title: string
    status: string
    uses_board: boolean
    course_name: string
    updated_at: string
  }[]
}

export interface AdminCourseImportResult {
  created: AdminCourse[]
  reactivated: AdminCourse[]
  skipped: string[]
}

export interface AdminDashboardSeriesPoint {
  date: string
  tasks: number
  study: number
  challenges: number
}

export interface AdminStudentActivity {
  id: number
  username: string
  study: number
  tasks_done: number
  challenges: number
  avg_score: number | null
}

export interface AdminRosterRow {
  id: number
  username: string
  email: string
  is_active: boolean
  created_at: string
  course_count: number
  tasks_total: number
  tasks_done: number
  tasks_overdue: number
  challenges_completed: number
  avg_score: number | null
  last_study_at: string | null
}

export interface AdminDashboard {
  period: { from: string | null; to: string | null; student_id: number | null }
  students: { total: number; active: number; paused: number }
  tasks: {
    total: number
    pending: number
    in_progress: number
    studying: number
    done: number
    overdue: number
  }
  worlds: { count: number }
  missions: {
    total: number
    pending: number
    studying: number
    mastered: number
  }
  challenges: { completed_count: number; avg_score: number | null }
  roster: AdminRosterRow[]
  series: {
    from: string
    to: string
    days: AdminDashboardSeriesPoint[]
  }
  by_student: AdminStudentActivity[]
  usage: AdminUsage
}

export interface AdminUsageDay {
  date: string
  tutor: number
  challenges: number
  voice: number
  child_messages: number
  tokens: number
}

export interface AdminUsageStudent {
  id: number
  username: string
  tutor: number
  challenges: number
  challenges_created: number
  voice: number
  child_messages: number
  calls: number
  tokens: number
  estimated_usd: number
  usd_tutor: number
  usd_challenges: number
  usd_voice: number
}

export interface AdminUsageKind {
  kind: string
  label: string
  calls: number
  tokens: number
  estimated_usd: number
}

export interface AdminUsage {
  from: string
  to: string
  measured: boolean
  totals: {
    calls: number
    tokens: number
    estimated_usd: number
    child_messages: number
  }
  days: AdminUsageDay[]
  by_student: AdminUsageStudent[]
  by_kind: AdminUsageKind[]
}

export interface AdminOverview {
  student: AdminStudent
  courses: AdminCourse[]
  tasks: {
    total: number
    pending: number
    in_progress: number
    studying: number
    done: number
    overdue: number
    items: AdminTaskRow[]
  }
  worlds: {
    count: number
    items: {
      id: number
      title: string
      mission_total: number
      mission_mastered: number
      mission_studying: number
    }[]
  }
  missions: {
    total: number
    pending: number
    studying: number
    mastered: number
  }
  challenges: {
    completed_count: number
    avg_score: number | null
    recent: AdminChallengeRow[]
  }
  last_study_at: string | null
}

export function adminQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    search.set(key, String(value))
  }
  const q = search.toString()
  return q ? `?${q}` : ''
}
