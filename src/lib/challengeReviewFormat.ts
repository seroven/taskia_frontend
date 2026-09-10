import type { ChallengeQuestionPublic } from './worldsTypes'

export function isBoardQuestion(q: ChallengeQuestionPublic) {
  return q.kind === 'board_prompt' || q.requires_board
}

export function formatUserAnswer(
  q: ChallengeQuestionPublic,
  raw: string | null | undefined,
) {
  const text = (raw ?? q.user_answer ?? '').trim()
  if (!text) return '—'
  if (q.kind === 'multiple_choice' && q.options && /^[A-D]$/i.test(text)) {
    const idx = text.toUpperCase().charCodeAt(0) - 65
    const opt = q.options[idx]
    return opt ? `${text.toUpperCase()}. ${opt}` : text.toUpperCase()
  }
  return text
}

export function formatSaidAnswer(
  q: ChallengeQuestionPublic,
  voice: 'student' | 'admin' = 'student',
) {
  const drew = voice === 'admin' ? 'Lo dibujó' : 'Lo dibujaste'
  if (isBoardQuestion(q)) {
    const extra = (q.user_answer ?? '').trim()
    if (
      !extra ||
      extra.startsWith('{') ||
      extra.startsWith('[') ||
      extra === '(respuesta en pizarra)'
    ) {
      return drew
    }
    return `${drew}. ${extra}`
  }
  return formatUserAnswer(q, q.user_answer)
}

export function formatExpectedAnswer(q: ChallengeQuestionPublic) {
  if (isBoardQuestion(q)) {
    return (q.correct_answer ?? '').trim() || '—'
  }
  return formatUserAnswer(q, q.correct_answer)
}
