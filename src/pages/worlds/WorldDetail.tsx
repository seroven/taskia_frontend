import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { AccentPicker } from '../../components/AccentPicker'
import { ThemeToggle } from '../../components/ThemeToggle'
import { SelectField } from '../../components/ui/SelectField'
import { errorMessage } from '../../lib/errors'
import {
  DIFFICULTY_LABEL,
  SCOPE_LABEL,
  type StudyChallenge,
  type StudyWorld,
  type StudyWorldCourse,
} from '../../lib/worldsTypes'
import type { Course } from '../../types'
import { useToast } from '../../toast'

interface Props {
  worldId: number
  onBack: () => void
  onOpenCourse: (courseId: number) => void
  onOpenChallenge: (challengeId: number) => void
}

export function WorldDetail({
  worldId,
  onBack,
  onOpenCourse,
  onOpenChallenge,
}: Props) {
  const { showToast } = useToast()
  const [world, setWorld] = useState<StudyWorld | null>(null)
  const [courses, setCourses] = useState<StudyWorldCourse[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [challenges, setChallenges] = useState<StudyChallenge[]>([])
  const [addCourseId, setAddCourseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [challengeOpen, setChallengeOpen] = useState(false)

  const refresh = useCallback(async () => {
    const [worlds, worldCourses, catalog, history] = await Promise.all([
      api.listWorlds(),
      api.listWorldCourses(worldId),
      api.listCourses(),
      api.listChallenges(worldId),
    ])
    const found = worlds.find((w) => w.id === worldId) ?? null
    setWorld(found)
    setCourses(worldCourses)
    setAllCourses(catalog)
    setChallenges(history)
  }, [worldId])

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

  const available = allCourses.filter(
    (c) => !courses.some((wc) => wc.course_id === c.id),
  )

  async function onAddCourse() {
    if (!addCourseId) return
    try {
      const next = await api.addWorldCourse(worldId, Number(addCourseId))
      setCourses(next)
      setAddCourseId('')
      showToast({
        tone: 'success',
        title: 'Materia agregada',
        subtitle: 'Ya puedes crear misiones en ella',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo agregar',
        subtitle: errorMessage(err),
      })
    }
  }

  return (
    <div className="worlds-shell">
      <header className="topbar">
        <div>
          <button type="button" className="ghost worlds-back" onClick={onBack}>
            ← Mundos
          </button>
          <p className="brand">{world?.title ?? 'Mundo'}</p>
          {world?.description && <p className="welcome">{world.description}</p>}
        </div>
        <div className="topbar-actions">
          <AccentPicker />
          <ThemeToggle />
          <button
            type="button"
            className="primary"
            onClick={() => setChallengeOpen(true)}
            disabled={loading || courses.length === 0}
          >
            Desafío del mundo
          </button>
        </div>
      </header>

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-two-col">
        <section>
          <h2 className="worlds-section-title">Materias</h2>
          {loading && <p className="muted">Cargando…</p>}
          {!loading && courses.length === 0 && (
            <p className="muted">Agrega una materia para empezar a crear misiones.</p>
          )}
          <ul className="worlds-list">
            {courses.map((course) => (
              <li key={course.course_id}>
                <button
                  type="button"
                  className="worlds-row"
                  onClick={() => onOpenCourse(course.course_id)}
                >
                  <span className="worlds-row-title">{course.course_name}</span>
                </button>
              </li>
            ))}
          </ul>

          {available.length > 0 && (
            <div className="worlds-add-course">
              <SelectField
                label="Agregar materia"
                value={addCourseId}
                onChange={setAddCourseId}
                options={available.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                placeholder="Elige una materia"
              />
              <button
                type="button"
                className="primary"
                disabled={!addCourseId}
                onClick={() => void onAddCourse()}
              >
                Agregar
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="worlds-section-title">Historial de desafíos</h2>
          {challenges.length === 0 && (
            <p className="muted">Aún no hay desafíos en este mundo.</p>
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
                    {' · '}
                    {ch.started_at}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ChallengeSetupModal
        open={challengeOpen}
        worldId={worldId}
        scope="world"
        title={world?.title}
        onClose={() => setChallengeOpen(false)}
        onStarted={onOpenChallenge}
      />
    </div>
  )
}
