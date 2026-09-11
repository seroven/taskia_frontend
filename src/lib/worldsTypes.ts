export type MissionStatus = 'pending' | 'studying' | 'mastered'

export type ChallengeScope = 'mission' | 'course' | 'world'

export type ChallengeDifficulty = 'warm' | 'quest' | 'boss'

export type ChallengeStatus = 'in_progress' | 'completed' | 'abandoned'

export type ChallengeQuestionKind =
  | 'multiple_choice'
  | 'short_text'
  | 'fill_blank'
  | 'board_prompt'

export interface StudyWorld {
  id: number
  user_id: number
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface StudyWorldCourse {
  world_id: number
  course_id: number
  course_name: string
  sort_order: number
  mission_count?: number
  mastered_count?: number
  studying_count?: number
  pending_count?: number
}

export type CourseProgress = 'empty' | 'pending' | 'studying' | 'mastered'

export const COURSE_PROGRESS_LABEL: Record<CourseProgress, string> = {
  empty: 'Sin temas',
  pending: 'Sin empezar',
  studying: 'En proceso',
  mastered: 'Completado',
}

export function courseProgress(course: StudyWorldCourse): CourseProgress {
  const total = course.mission_count ?? 0
  if (total === 0) return 'empty'
  const mastered = course.mastered_count ?? 0
  if (mastered >= total) return 'mastered'
  if ((course.studying_count ?? 0) > 0 || mastered > 0) return 'studying'
  return 'pending'
}

export interface StudyMission {
  id: number
  world_id: number
  course_id: number
  course_name: string
  title: string
  description: string | null
  status: MissionStatus | string
  uses_board: boolean
  source_mission_id: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ImportableMission {
  id: number
  title: string
  description: string | null
  uses_board: boolean
  world_id: number
  world_title: string
  status: string
}

export interface MissionMessage {
  role: string
  content: string
  created_at: string
}

export interface MissionContext {
  mission_id: number
  tutor_phase: string
  topic_summary: string
  context_summary: string
  notebook_context?: string
  hints_level: number
  messages: MissionMessage[]
}

export interface MissionSession {
  context: MissionContext
  board: import('./studyProtocol').StudyBoardScene
  mission: StudyMission
}

export interface MissionTutorReply {
  phase: string
  speak_to_child: string
  ask_questions: string[]
  topic_summary: string
  context_summary: string
  draw_ops: unknown[]
  hints_level: number
  study_eval: { passed: boolean; evidence: string }
}

export interface MissionChatResponse {
  reply: MissionTutorReply
  context: MissionContext
  mission: StudyMission
}

export interface StudyChallenge {
  id: number
  user_id: number
  world_id: number
  scope: ChallengeScope | string
  mission_id: number | null
  course_id: number | null
  course_name?: string | null
  mission_title?: string | null
  difficulty: ChallengeDifficulty | string
  question_count: number
  status: ChallengeStatus | string
  score: number | null
  started_at: string
  completed_at: string | null
}

export interface ChallengePreset {
  scope: ChallengeScope | string
  difficulty: ChallengeDifficulty | string
  question_count: number
  label: string
}

export interface ChallengeQuestionPublic {
  id: number
  mission_id: number | null
  course_id?: number | null
  course_name?: string | null
  sort_order: number
  kind: ChallengeQuestionKind | string
  prompt: string
  options: string[] | null
  requires_board: boolean
  prompt_draw_ops?: unknown[]
  answered: boolean
  is_correct: boolean | null
  /** Solo en desafíos completados */
  user_answer?: string | null
  /** Solo en desafíos completados */
  correct_answer?: string | null
}

export interface ChallengeDetail {
  challenge: StudyChallenge
  questions: ChallengeQuestionPublic[]
  current_index: number
}

export interface ChallengeAnswerPayload {
  question_id: number
  user_answer: string
  board_json?: unknown
  board_description?: string
  board_image_base64?: string
}

export const MISSION_STATUS_LABEL: Record<string, string> = {
  pending: 'Por empezar',
  studying: 'En marcha',
  mastered: 'Dominado',
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  warm: 'Calentamiento',
  quest: 'Aventura',
  boss: 'Jefe final',
}

export const SCOPE_LABEL: Record<string, string> = {
  mission: 'Tema',
  course: 'Curso',
  world: 'Global',
}

export function challengeHistoryTitle(ch: {
  scope: ChallengeScope | string
  course_name?: string | null
  mission_title?: string | null
}): string {
  if (ch.scope === 'world') return 'Todo el mundo'
  if (ch.scope === 'course') {
    return ch.course_name ? ch.course_name : 'Todo el curso'
  }
  return ch.mission_title ? ch.mission_title : 'Tema'
}
