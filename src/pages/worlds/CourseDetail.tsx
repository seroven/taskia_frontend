import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { CreateMissionModal } from '../../components/worlds/CreateMissionModal'
import { ImportMissionsModal } from '../../components/worlds/ImportMissionsModal'
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
      <header className="topbar">
        <div>
          <button type="button" className="ghost worlds-back" onClick={onBack}>
            ← Mundo
          </button>
          <p className="brand">{courseName}</p>
          <p className="welcome">Misiones de esta materia</p>
        </div>
        <div className="topbar-actions">
          <AccentPicker />
          <ThemeToggle />
          <button type="button" className="ghost" onClick={() => setImportOpen(true)}>
            Traer misiones
          </button>
          <button type="button" className="ghost" onClick={() => setCreateOpen(true)}>
            Nueva misión
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setMissionChallengeId(null)
              setChallengeOpen(true)
            }}
            disabled={missions.length === 0}
          >
            Desafío de materia
          </button>
        </div>
      </header>

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-two-col">
        <section>
          <h2 className="worlds-section-title">Misiones</h2>
          {loading && <p className="muted">Cargando…</p>}
          {!loading && missions.length === 0 && (
            <div className="worlds-empty compact">
              <p>Aún no hay misiones. Crea una o tráelas de otro mundo.</p>
              <button type="button" className="primary" onClick={() => setCreateOpen(true)}>
                Nueva misión
              </button>
            </div>
          )}
          <ul className="worlds-list">
            {missions.map((mission) => (
              <li key={mission.id}>
                <div className="worlds-mission-row">
                  <button
                    type="button"
                    className="worlds-row worlds-row-mission"
                    onClick={() => onStudyMission(mission.id)}
                  >
                    <span className="worlds-row-title">{mission.title}</span>
                    <span className="worlds-row-tags">
                      <span className={`worlds-status worlds-status-${mission.status}`}>
                        {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
                      </span>
                      {mission.uses_board && (
                        <span className="worlds-pill">Pizarra</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ghost worlds-mission-challenge"
                    onClick={() => {
                      setMissionChallengeId(mission.id)
                      setChallengeOpen(true)
                    }}
                  >
                    Desafío
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="worlds-section-title">Historial</h2>
          {challenges.length === 0 && (
            <p className="muted">Sin desafíos todavía en esta materia.</p>
          )}
          <ul className="worlds-history">
            {challenges.map((ch) => (
              <li key={ch.id}>
                <button
                  type="button"
                  className="worlds-history-row"
                  onClick={() => onOpenChallenge(ch.id)}
                >
                  <span>
                    {SCOPE_LABEL[ch.scope] ?? ch.scope} ·{' '}
                    {DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty}
                  </span>
                  <span className="worlds-history-meta">
                    {ch.status === 'completed' && ch.score != null
                      ? `${ch.score}/100`
                      : ch.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
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
