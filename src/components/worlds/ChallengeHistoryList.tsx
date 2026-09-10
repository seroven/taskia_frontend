import type { ReactNode } from 'react'
import { AppLoader } from '../AppLoader'
import { WorldsIconBadge } from './WorldsIconBadge'
import { challengeScopeIcon } from './worldsIcons'
import {
  DIFFICULTY_LABEL,
  SCOPE_LABEL,
  challengeHistoryTitle,
  type StudyChallenge,
} from '../../lib/worldsTypes'

interface Props {
  items: StudyChallenge[]
  onOpen: (challengeId: number) => void
  title?: string
  emptyText?: string
  action?: ReactNode
  className?: string
  loading?: boolean
}

export function ChallengeHistoryList({
  items,
  onOpen,
  title = 'Tus desafíos',
  emptyText,
  action,
  className = '',
  loading = false,
}: Props) {
  if (!loading && items.length === 0 && emptyText == null) return null

  return (
    <section className={`worlds-block ${className}`.trim()}>
      <div className="worlds-panel-head">
        <p className="worlds-block-label">{title}</p>
        {action}
      </div>
      {loading ? (
        <AppLoader message="Cargando desafíos…" variant="section" />
      ) : items.length === 0 ? (
        <p className="muted worlds-panel-empty">{emptyText}</p>
      ) : (
        <ul className="worlds-history">
          {items.map((ch) => {
            const ScopeIcon = challengeScopeIcon(ch.scope)
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className="worlds-history-row"
                  onClick={() => onOpen(ch.id)}
                >
                  <WorldsIconBadge icon={ScopeIcon} size="sm" />
                  <span className="worlds-history-text">
                    <span className="worlds-history-title-row">
                      <span className={`worlds-scope worlds-scope-${ch.scope}`}>
                        {SCOPE_LABEL[ch.scope] ?? ch.scope}
                      </span>
                      <span className="worlds-history-title">
                        {challengeHistoryTitle(ch)}
                      </span>
                    </span>
                    <span className="worlds-history-meta">
                      {DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty}
                      {' · '}
                      {ch.question_count} preguntas
                      {ch.status === 'completed' && ch.score != null
                        ? ` · ${ch.score} pts`
                        : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
