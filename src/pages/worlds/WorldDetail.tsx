import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  GlobeHemisphereWest,
  Plus,
  Trophy,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import { challengeDifficultyIcon } from '../../components/worlds/worldsIcons'
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
      <nav className="worlds-nav">
        <button type="button" className="ghost worlds-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Mundos
        </button>
        <div className="worlds-nav-tools">
          <AccentPicker />
          <ThemeToggle />
        </div>
      </nav>

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <header className="worlds-hero">
          <WorldsIconBadge icon={GlobeHemisphereWest} size="xl" />
          <h1 className="worlds-hero-title">{world?.title ?? 'Mundo'}</h1>
          {world?.description ? (
            <p className="worlds-hero-lead">{world.description}</p>
          ) : (
            <p className="worlds-hero-lead">Toca una materia para ver sus misiones.</p>
          )}
          <button
            type="button"
            className="primary worlds-cta-btn"
            onClick={() => setChallengeOpen(true)}
            disabled={loading || courses.length === 0}
          >
            <Trophy size={18} weight="fill" />
            Desafío del mundo
          </button>
        </header>

        <section className="worlds-block">
          <p className="worlds-block-label">Materias</p>
          {loading && <p className="muted worlds-center-text">Cargando…</p>}
          {!loading && courses.length === 0 && (
            <WorldsEmptyState
              compact
              icon={BookOpen}
              title="Agrega una materia"
              description="Elige una del catálogo y empieza a crear misiones."
            />
          )}
          <ul className="worlds-tile-stack">
            {courses.map((course, index) => (
              <motion.li
                key={course.course_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.2 }}
              >
                <button
                  type="button"
                  className="worlds-tile worlds-tile--card"
                  onClick={() => onOpenCourse(course.course_id)}
                >
                  <WorldsIconBadge icon={BookOpen} size="lg" />
                  <span className="worlds-tile-body">
                    <span className="worlds-tile-title">{course.course_name}</span>
                    <span className="worlds-tile-hint">Ver misiones</span>
                  </span>
                </button>
              </motion.li>
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
                <Plus size={18} weight="bold" />
                Agregar
              </button>
            </div>
          )}
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
                          {' · '}
                          {ch.started_at}
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
