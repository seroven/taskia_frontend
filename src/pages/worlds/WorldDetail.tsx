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
import { ExpandIconButton } from '../../components/ExpandIconButton'
import { ChallengeSetupModal } from '../../components/worlds/ChallengeSetupModal'
import { ChallengeHistoryList } from '../../components/worlds/ChallengeHistoryList'
import { WorldsCoverCard } from '../../components/worlds/WorldsCoverCard'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import { courseProgressIcon } from '../../components/worlds/worldsIcons'
import { AppearanceTools } from '../../components/AppearanceTools'
import { SelectField } from '../../components/ui/SelectField'
import { errorMessage } from '../../lib/errors'
import {
  COURSE_PROGRESS_LABEL,
  courseProgress,
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
        title: 'Curso agregado',
        subtitle: 'Ya puedes crear misiones en él',
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
        <ExpandIconButton
          className="worlds-back"
          icon={ArrowLeft}
          label="Mundos"
          weight="bold"
          onClick={onBack}
        />
        <div className="worlds-nav-tools">
          <AppearanceTools />
        </div>
      </nav>

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <header className="worlds-hero worlds-hero--page">
          <WorldsIconBadge icon={GlobeHemisphereWest} size="lg" />
          <div className="worlds-hero-copy">
            <h1 className="worlds-hero-title">{world?.title ?? 'Mundo'}</h1>
            {world?.description ? (
              <p className="worlds-hero-lead">{world.description}</p>
            ) : (
              <p className="worlds-hero-lead">Toca un curso para ver sus temas.</p>
            )}
          </div>
        </header>

        <div className="worlds-two-col">
          <section className="worlds-panel">
            <p className="worlds-block-label">Cursos</p>
            {loading && <p className="muted">Cargando…</p>}
            {!loading && allCourses.length === 0 && (
              <WorldsEmptyState
                compact
                icon={BookOpen}
                title="Todavía no tienes cursos"
                description="Pídele a un adulto que te asigne cursos. Después los agregas a este mundo."
              />
            )}
            {!loading && allCourses.length > 0 && courses.length === 0 && (
              <WorldsEmptyState
                compact
                icon={BookOpen}
                title="Agrega un curso"
                description="Elige uno de los tuyos y empieza a crear misiones."
              />
            )}
            <ul className="worlds-cover-grid">
              {courses.map((course, index) => {
                const progress = courseProgress(course)
                const ProgressIcon = courseProgressIcon(progress)
                return (
                  <motion.li
                    key={course.course_id}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.24 }}
                  >
                    <WorldsCoverCard
                      kind="course"
                      icon={BookOpen}
                      title={course.course_name}
                      hint="Ver temas"
                      status={progress}
                      onClick={() => onOpenCourse(course.course_id)}
                      tags={
                        <span className="worlds-row-tags">
                          <span className={`worlds-status worlds-status-${progress}`}>
                            <ProgressIcon size={14} weight="fill" />
                            {COURSE_PROGRESS_LABEL[progress]}
                          </span>
                        </span>
                      }
                    />
                  </motion.li>
                )
              })}
            </ul>

            {available.length > 0 && (
              <div className="worlds-add-course">
                <SelectField
                  label="Agregar curso"
                  value={addCourseId}
                  onChange={setAddCourseId}
                  options={available.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  }))}
                  placeholder="Elige un curso"
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

          <ChallengeHistoryList
            className="worlds-panel worlds-challenges-panel"
            items={challenges}
            onOpen={onOpenChallenge}
            title="Desafíos"
            emptyText="Cuando completes un desafío, aparece aquí."
            action={
              <button
                type="button"
                className="primary"
                onClick={() => setChallengeOpen(true)}
                disabled={loading || courses.length === 0}
              >
                <Trophy size={18} weight="fill" />
                Desafío del mundo
              </button>
            }
          />
        </div>
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
