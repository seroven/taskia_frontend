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
  sort_order: number
  kind: ChallengeQuestionKind | string
  prompt: string
  options: string[] | null
  requires_board: boolean
  answered: boolean
  is_correct: boolean | null
}

export interface ChallengeDetail {
  challenge: StudyChallenge
  questions: ChallengeQuestionPublic[]
  current_index: number
}

export interface SubmitAnswerResult {
  is_correct: boolean
  completed: boolean
  score: number | null
  next_index: number | null
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
  mission: 'Misión',
  course: 'Materia',
  world: 'Mundo',
}
