import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  DownloadSimple,
  PencilLine,
  Plus,
  Rocket,
  Trophy,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { CreateMissionModal } from '../../components/worlds/CreateMissionModal'
import { ImportMissionsModal } from '../../components/worlds/ImportMissionsModal'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import {
  challengeDifficultyIcon,
  missionStatusIcon,
} from '../../components/worlds/worldsIcons'
import { AccentPicker } from '../../components/AccentPicker'
import { ThemeToggle } from '../../components/ThemeToggle'
import { errorMessage } from '../../lib/errors'
import {
  DIFFICULTY_LABEL,
  MISSION_STATUS_LABEL,
  SCOPE_LABEL,
  type StudyChallenge,
  type StudyMission,
  type StudyWorldCourse,
} from '../../lib/worldsTypes'
import { useToast } from '../../toast'

interface Props {
  worldId: number
  courseId: number
  onBack: () => void
  onStudyMission: (missionId: number) => void
  onOpenChallenge: (challengeId: number) => void
}

export function CourseDetail({
  worldId,
  courseId,
  onBack,
  onStudyMission,
  onOpenChallenge,
}: Props) {
  const { showToast } = useToast()
  const [courseName, setCourseName] = useState('Materia')
  const [missions, setMissions] = useState<StudyMission[]>([])
  const [challenges, setChallenges] = useState<StudyChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [missionChallengeId, setMissionChallengeId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const [list, worldCourses, history] = await Promise.all([
      api.listMissions(worldId, courseId),
      api.listWorldCourses(worldId),
      api.listChallenges(worldId, courseId),
    ])
    setMissions(list)
    const course = worldCourses.find((c: StudyWorldCourse) => c.course_id === courseId)
    if (course) setCourseName(course.course_name)
    setChallenges(history)
  }, [worldId, courseId])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await refresh()
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [refresh])

  return (
    <div className="worlds-shell">
      <nav className="worlds-nav">
        <button type="button" className="ghost worlds-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Mundo
        </button>
        <div className="worlds-nav-tools">
          <AccentPicker />
          <ThemeToggle />
        </div>
      </nav>

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <header className="worlds-hero">
          <WorldsIconBadge icon={Rocket} size="xl" />
          <h1 className="worlds-hero-title">{courseName}</h1>
          <p className="worlds-hero-lead">Elige una misión para estudiar.</p>
          <div className="worlds-hero-actions">
            <button type="button" className="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={18} weight="bold" />
              Nueva misión
            </button>
            <button
              type="button"
              className="ghost worlds-cta-btn"
              onClick={() => setImportOpen(true)}
            >
              <DownloadSimple size={18} weight="bold" />
              Traer
            </button>
            <button
              type="button"
              className="ghost worlds-cta-btn"
              onClick={() => {
                setMissionChallengeId(null)
                setChallengeOpen(true)
              }}
              disabled={missions.length === 0}
            >
              <Trophy size={18} weight="fill" />
              Desafío
            </button>
          </div>
        </header>

        <section className="worlds-block">
          {loading && <p className="muted worlds-center-text">Cargando…</p>}
          {!loading && missions.length === 0 && (
            <WorldsEmptyState
              compact
              icon={Rocket}
              title="Todavía no hay misiones"
              description="Crea una o tráelas de otro mundo."
              action={
                <button type="button" className="primary" onClick={() => setCreateOpen(true)}>
                  <Plus size={18} weight="bold" />
                  Nueva misión
                </button>
              }
            />
          )}
          <ul className="worlds-tile-stack">
            {missions.map((mission, index) => {
              const StatusIcon = missionStatusIcon(mission.status)
              return (
                <motion.li
                  key={mission.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.2 }}
                >
                  <div className="worlds-mission-row">
                    <button
                      type="button"
                      className="worlds-tile worlds-tile--card worlds-tile--mission"
                      onClick={() => onStudyMission(mission.id)}
                    >
                      <WorldsIconBadge icon={Rocket} size="lg" />
                      <span className="worlds-tile-body">
                        <span className="worlds-tile-title">{mission.title}</span>
                        <span className="worlds-row-tags">
                          <span
                            className={`worlds-status worlds-status-${mission.status}`}
                          >
                            <StatusIcon size={14} weight="fill" />
                            {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
                          </span>
                          {mission.uses_board && (
                            <span className="worlds-pill">
                              <PencilLine size={14} weight="fill" />
                              Pizarra
                            </span>
                          )}
                        </span>
                        <span className="worlds-tile-hint">Estudiar</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ghost worlds-mission-challenge worlds-cta-btn"
                      aria-label={`Desafío: ${mission.title}`}
                      onClick={() => {
                        setMissionChallengeId(mission.id)
                        setChallengeOpen(true)
                      }}
                    >
                      <Trophy size={20} weight="fill" />
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </section>

        {challenges.length > 0 && (
          <section className="worlds-block worlds-block--soft">
            <p className="worlds-block-label">Tus desafíos</p>
            <ul className="worlds-history">
              {challenges.map((ch) => {
                const DiffIcon = challengeDifficultyIcon(ch.difficulty)
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      className="worlds-history-row"
                      onClick={() => onOpenChallenge(ch.id)}
                    >
                      <WorldsIconBadge icon={DiffIcon} size="sm" tone="warn" />
                      <span className="worlds-history-text">
                        <span>
                          {SCOPE_LABEL[ch.scope] ?? ch.scope} ·{' '}
                          {DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty}
                        </span>
                        <span className="worlds-history-meta">
                          {ch.status === 'completed' && ch.score != null
                            ? `${ch.score}/100`
                            : ch.status}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      <CreateMissionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          await api.createMission({
            world_id: worldId,
            course_id: courseId,
            ...input,
          })
          await refresh()
          showToast({
            tone: 'success',
            title: 'Misión creada',
            subtitle: input.title,
          })
        }}
      />
      <ImportMissionsModal
        open={importOpen}
        worldId={worldId}
        courseId={courseId}
        onClose={() => setImportOpen(false)}
        onImported={async () => {
          await refresh()
          showToast({
            tone: 'success',
            title: 'Misiones importadas',
            subtitle: 'Listas para estudiar en este mundo',
          })
        }}
      />
      <ChallengeSetupModal
        open={challengeOpen}
        worldId={worldId}
        scope={missionChallengeId != null ? 'mission' : 'course'}
        courseId={courseId}
        missionId={missionChallengeId}
        title={
          missionChallengeId != null
            ? missions.find((m) => m.id === missionChallengeId)?.title
            : courseName
        }
        onClose={() => {
          setChallengeOpen(false)
          setMissionChallengeId(null)
        }}
        onStarted={onOpenChallenge}
      />
    </div>
  )
}
