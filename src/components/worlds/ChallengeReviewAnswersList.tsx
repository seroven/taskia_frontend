import { Fragment } from 'react'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import {
  formatExpectedAnswer,
  formatSaidAnswer,
  isBoardQuestion,
} from '../../lib/challengeReviewFormat'
import type { ChallengeQuestionPublic } from '../../lib/worldsTypes'

export function ChallengeReviewAnswersList({
  questions,
  scope,
  voice = 'student',
  itemIdPrefix,
}: {
  questions: ChallengeQuestionPublic[]
  scope: string
  voice?: 'student' | 'admin'
  itemIdPrefix?: string
}) {
  const saidLabel = voice === 'admin' ? 'Dijo: ' : 'Dijiste: '

  return (
    <ul className="worlds-review-list">
      {questions.map((q, index) => {
        const ok = Boolean(q.is_correct)
        const prevCourse = index > 0 ? questions[index - 1]?.course_name : null
        const showCourse =
          scope === 'world' && Boolean(q.course_name) && q.course_name !== prevCourse
        const isMc =
          q.kind === 'multiple_choice' && Boolean(q.options && q.options.length >= 2)
        return (
          <Fragment key={q.id}>
            {showCourse && (
              <li className="worlds-review-course-row">{q.course_name}</li>
            )}
            <li
              id={itemIdPrefix ? `${itemIdPrefix}${q.id}` : undefined}
              className={`worlds-review-item${ok ? ' is-ok' : ' is-bad'}`}
            >
              <div className="worlds-review-head">
                <span
                  className={`worlds-review-badge${ok ? ' is-ok' : ' is-bad'}`}
                  aria-hidden
                >
                  {ok ? (
                    <CheckCircle size={20} weight="fill" />
                  ) : (
                    <XCircle size={20} weight="fill" />
                  )}
                </span>
                <span className="worlds-review-num">{index + 1}</span>
                <p className="worlds-review-prompt">{q.prompt}</p>
              </div>
              <div className="worlds-review-miss">
                <p className="worlds-review-yours">
                  {saidLabel}
                  <strong>{formatSaidAnswer(q, voice)}</strong>
                </p>
                {isMc ? (
                  <ul className="worlds-review-options">
                    {q.options!.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i)
                      const picked =
                        (q.user_answer ?? '').trim().toUpperCase() === letter
                      const correctKey = (q.correct_answer ?? '').trim()
                      const isCorrect =
                        correctKey.toUpperCase().startsWith(letter) ||
                        correctKey === opt
                      return (
                        <li
                          key={opt + i}
                          className={`worlds-review-option${isCorrect ? ' is-correct' : ''}${picked ? ' is-picked' : ''}`}
                        >
                          <strong>{letter}</strong>
                          <span>{opt.replace(/^[A-D][).:\-]\s*/i, '')}</span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className={`worlds-review-right${ok ? ' is-ok' : ''}`}>
                    {isBoardQuestion(q) ? 'Se esperaba: ' : 'La respuesta era: '}
                    <strong>{formatExpectedAnswer(q)}</strong>
                  </p>
                )}
              </div>
            </li>
          </Fragment>
        )
      })}
    </ul>
  )
}
