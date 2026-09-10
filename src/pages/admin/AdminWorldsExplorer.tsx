import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CaretDown,
  CaretRight,
  Flag,
  GlobeHemisphereWest,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { DateField } from '../../components/ui/DateField'
import { SelectField } from '../../components/ui/SelectField'
import { errorMessage } from '../../lib/errors'
import type {
  AdminChallengeRow,
  AdminWorldTree,
  AdminWorldTreeCourse,
  AdminWorldTreeMission,
  AdminWorldTreeWorld,
} from '../../lib/adminTypes'
import {
  DIFFICULTY_LABEL,
  MISSION_STATUS_LABEL,
  SCOPE_LABEL,
} from '../../lib/worldsTypes'
import { formatWhen } from './adminFormat'
import { phaseLabel } from '../../lib/studyProtocol'
import { todayISO } from '../../types'

type Selection =
  | { kind: 'world'; worldId: number }
  | { kind: 'course'; worldId: number; courseId: number }
  | { kind: 'mission'; worldId: number; courseId: number; missionId: number }

function selKey(sel: Selection) {
  if (sel.kind === 'world') return `w-${sel.worldId}`
  if (sel.kind === 'course') return `c-${sel.worldId}-${sel.courseId}`
  return `m-${sel.worldId}-${sel.courseId}-${sel.missionId}`
}

function worldKey(id: number) {
  return `w-${id}`
}

function courseKey(worldId: number, courseId: number) {
  return `c-${worldId}-${courseId}`
}

export function AdminWorldsExplorer({
  studentId,
  onOpenChallenge,
}: {
  studentId: number
  onOpenChallenge: (id: number) => void
}) {
  const [from, setFrom] = useState(todayISO)
  const [to, setTo] = useState(todayISO)
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [data, setData] = useState<AdminWorldTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Selection | null>(null)

  const hasFilters = Boolean(from || to || status || courseId || difficulty)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const tree = await api.getAdminStudentWorldsTree(studentId, {
          from: from || null,
          to: to || null,
          status: status || null,
          course_id: courseId ? Number(courseId) : null,
          difficulty: difficulty || null,
        })
        setData(tree)
        setExpanded((current) => {
          const next = new Set(current)
          for (const world of tree.worlds) {
            next.add(worldKey(world.id))
            for (const course of world.courses) {
              if (
                course.missions.some((mission) => mission.status === 'studying') ||
                course.challenges.length > 0
              ) {
                next.add(courseKey(world.id, course.id))
              }
            }
          }
          return next
        })
        setSelected((current) => {
          if (current && findSelection(tree.worlds, current)) return current
          const first = tree.worlds[0]
          return first ? { kind: 'world', worldId: first.id } : null
        })
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [studentId, from, to, status, courseId, difficulty])

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function select(next: Selection, expandParents = true) {
    if (expandParents) {
      setExpanded((current) => {
        const copy = new Set(current)
        copy.add(worldKey(next.worldId))
        if (next.kind !== 'world') copy.add(courseKey(next.worldId, next.courseId))
        return copy
      })
    }
    setSelected(next)
  }

  const resolved = useMemo(
    () => (data && selected ? findSelection(data.worlds, selected) : null),
    [data, selected],
  )

  return (
    <div className="admin-worlds-explorer-wrap">
      <div className="admin-filters">
        <DateField label="Desde" value={from} onChange={setFrom} />
        <DateField label="Hasta" value={to} onChange={setTo} />
        <SelectField
          label="Estado del tema"
          value={status}
          placeholder="Todos"
          options={[
            { value: '', label: 'Todos' },
            { value: 'pending', label: MISSION_STATUS_LABEL.pending },
            { value: 'studying', label: MISSION_STATUS_LABEL.studying },
            { value: 'mastered', label: MISSION_STATUS_LABEL.mastered },
          ]}
          onChange={setStatus}
        />
        <SelectField
          label="Curso"
          value={courseId}
          placeholder="Todas"
          options={[
            { value: '', label: 'Todas' },
            ...(data?.courses ?? []).map((course) => ({
              value: String(course.id),
              label: course.name,
            })),
          ]}
          onChange={setCourseId}
        />
        <SelectField
          label="Dificultad"
          value={difficulty}
          placeholder="Todas"
          options={[
            { value: '', label: 'Todas' },
            { value: 'warm', label: DIFFICULTY_LABEL.warm },
            { value: 'quest', label: DIFFICULTY_LABEL.quest },
            { value: 'boss', label: DIFFICULTY_LABEL.boss },
          ]}
          onChange={setDifficulty}
        />
        <button
          type="button"
          className="ghost filters-clear"
          disabled={!hasFilters}
          onClick={() => {
            setFrom('')
            setTo('')
            setStatus('')
            setCourseId('')
            setDifficulty('')
          }}
        >
          Limpiar filtros
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading && <AppLoader message="Cargando mundos…" variant="section" />}
      {!loading && data && data.worlds.length === 0 && (
        <p className="muted">
          {hasFilters
            ? 'Ningún mundo coincide con los filtros.'
            : 'Aún no tiene mundos de estudio.'}
        </p>
      )}
      {!loading && data && data.worlds.length > 0 && (
        <div className="admin-worlds-explorer">
          <nav className="admin-panel admin-tree-panel" aria-label="Mundos">
            <ul className="admin-tree">
              {data.worlds.map((world) => {
                const wKey = worldKey(world.id)
                const open = expanded.has(wKey)
                const worldSel: Selection = { kind: 'world', worldId: world.id }
                return (
                  <li key={world.id}>
                    <div className="admin-tree-row">
                      <button
                        type="button"
                        className="admin-tree-caret"
                        aria-label={open ? 'Contraer' : 'Expandir'}
                        onClick={() => toggle(wKey)}
                      >
                        {open ? (
                          <CaretDown size={14} weight="bold" />
                        ) : (
                          <CaretRight size={14} weight="bold" />
                        )}
                      </button>
                      <button
                        type="button"
                        className={`admin-tree-btn${selected && selKey(selected) === selKey(worldSel) ? ' is-active' : ''}`}
                        onClick={() => select(worldSel, false)}
                      >
                        <GlobeHemisphereWest size={16} weight="duotone" />
                        <span className="admin-tree-copy">
                          <strong>{world.title}</strong>
                          <span>
                            {countMastered(world)}/
                            {world.courses.reduce((n, c) => n + c.missions.length, 0)} temas
                            {world.challenges.length > 0
                              ? ` · ${world.challenges.length} desafíos`
                              : ''}
                          </span>
                        </span>
                      </button>
                    </div>
                    {open && (
                      <ul className="admin-tree admin-tree--nested">
                        {world.courses.map((course) => {
                          const cKey = courseKey(world.id, course.id)
                          const courseOpen = expanded.has(cKey)
                          const courseSel: Selection = {
                            kind: 'course',
                            worldId: world.id,
                            courseId: course.id,
                          }
                          return (
                            <li key={course.id}>
                              <div className="admin-tree-row">
                                <button
                                  type="button"
                                  className="admin-tree-caret"
                                  aria-label={courseOpen ? 'Contraer' : 'Expandir'}
                                  onClick={() => toggle(cKey)}
                                >
                                  {courseOpen ? (
                                    <CaretDown size={14} weight="bold" />
                                  ) : (
                                    <CaretRight size={14} weight="bold" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className={`admin-tree-btn${selected && selKey(selected) === selKey(courseSel) ? ' is-active' : ''}`}
                                  onClick={() => select(courseSel)}
                                >
                                  <BookOpen size={16} weight="duotone" />
                                  <span className="admin-tree-copy">
                                    <strong>{course.name}</strong>
                                    <span>
                                      {course.missions.filter((m) => m.status === 'mastered').length}
                                      /{course.missions.length} dominados
                                    </span>
                                  </span>
                                </button>
                              </div>
                              {courseOpen && (
                                <ul className="admin-tree admin-tree--nested">
                                  {course.missions.map((mission) => {
                                    const missionSel: Selection = {
                                      kind: 'mission',
                                      worldId: world.id,
                                      courseId: course.id,
                                      missionId: mission.id,
                                    }
                                    return (
                                      <li key={mission.id}>
                                        <div className="admin-tree-row">
                                          <span className="admin-tree-caret is-spacer" />
                                          <button
                                            type="button"
                                            className={`admin-tree-btn${selected && selKey(selected) === selKey(missionSel) ? ' is-active' : ''}`}
                                            onClick={() => select(missionSel)}
                                          >
                                            <Flag size={16} weight="duotone" />
                                            <span className="admin-tree-copy">
                                              <strong>{mission.title}</strong>
                                              <span>
                                                {MISSION_STATUS_LABEL[mission.status] ??
                                                  mission.status}
                                                {mission.challenges.length > 0
                                                  ? ` · ${mission.challenges.length} desafíos`
                                                  : ''}
                                              </span>
                                            </span>
                                          </button>
                                        </div>
                                      </li>
                                    )
                                  })}
                                </ul>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          <section className="admin-panel admin-tree-detail">
            {!resolved && <p className="muted">Elige un mundo, curso o tema.</p>}
            {resolved?.kind === 'world' && (
              <WorldDetail
                world={resolved.world}
                onOpenChallenge={onOpenChallenge}
                onOpenCourse={(courseId) =>
                  select({ kind: 'course', worldId: resolved.world.id, courseId })
                }
              />
            )}
            {resolved?.kind === 'course' && (
              <CourseDetail
                worldTitle={resolved.world.title}
                course={resolved.course}
                onOpenChallenge={onOpenChallenge}
                onOpenMission={(missionId) =>
                  select({
                    kind: 'mission',
                    worldId: resolved.world.id,
                    courseId: resolved.course.id,
                    missionId,
                  })
                }
              />
            )}
            {resolved?.kind === 'mission' && (
              <MissionDetail
                worldTitle={resolved.world.title}
                courseName={resolved.course.name}
                mission={resolved.mission}
                onOpenChallenge={onOpenChallenge}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function countMastered(world: AdminWorldTreeWorld) {
  return world.courses.reduce(
    (n, course) => n + course.missions.filter((m) => m.status === 'mastered').length,
    0,
  )
}

function findSelection(worlds: AdminWorldTreeWorld[], sel: Selection) {
  const world = worlds.find((item) => item.id === sel.worldId)
  if (!world) return null
  if (sel.kind === 'world') return { kind: 'world' as const, world }
  const course = world.courses.find((item) => item.id === sel.courseId)
  if (!course) return null
  if (sel.kind === 'course') return { kind: 'course' as const, world, course }
  const mission = course.missions.find((item) => item.id === sel.missionId)
  if (!mission) return null
  return { kind: 'mission' as const, world, course, mission }
}

function WorldDetail({
  world,
  onOpenChallenge,
  onOpenCourse,
}: {
  world: AdminWorldTreeWorld
  onOpenChallenge: (id: number) => void
  onOpenCourse: (courseId: number) => void
}) {
  return (
    <>
      <header className="admin-tree-detail-head">
        <p className="admin-tree-kicker">Mundo</p>
        <h2>{world.title}</h2>
        {world.description && <p className="muted">{world.description}</p>}
        <p className="muted">Actualizado {formatWhen(world.updated_at)}</p>
      </header>
      {world.courses.length === 0 ? (
        <p className="muted">Este mundo no tiene cursos.</p>
      ) : (
        <ul className="admin-tree-summary">
          {world.courses.map((course) => (
            <li key={course.id}>
              <button type="button" onClick={() => onOpenCourse(course.id)}>
                <strong>{course.name}</strong>
                <span>
                  {course.missions.filter((m) => m.status === 'mastered').length}/
                  {course.missions.length} temas dominados
                  {course.challenges.length > 0
                    ? ` · ${course.challenges.length} desafíos`
                    : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ChallengeBlock
        title="Desafíos de todo el mundo"
        empty="No hay desafíos a nivel de mundo."
        rows={world.challenges}
        onOpen={onOpenChallenge}
      />
    </>
  )
}

function CourseDetail({
  worldTitle,
  course,
  onOpenChallenge,
  onOpenMission,
}: {
  worldTitle: string
  course: AdminWorldTreeCourse
  onOpenChallenge: (id: number) => void
  onOpenMission: (missionId: number) => void
}) {
  return (
    <>
      <header className="admin-tree-detail-head">
        <p className="admin-tree-kicker">{worldTitle}</p>
        <h2>{course.name}</h2>
      </header>
      {course.missions.length === 0 ? (
        <p className="muted">Este curso no tiene temas.</p>
      ) : (
        <ul className="admin-tree-summary">
          {course.missions.map((mission) => (
            <li key={mission.id}>
              <button type="button" onClick={() => onOpenMission(mission.id)}>
                <strong>{mission.title}</strong>
                <span>
                  {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
                  {mission.study
                    ? ` · ${phaseLabel(mission.study.phase)} · ${formatWhen(mission.study.updated_at)}`
                    : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ChallengeBlock
        title="Desafíos del curso"
        empty="No hay desafíos de todo el curso."
        rows={course.challenges}
        onOpen={onOpenChallenge}
      />
    </>
  )
}

function MissionDetail({
  worldTitle,
  courseName,
  mission,
  onOpenChallenge,
}: {
  worldTitle: string
  courseName: string
  mission: AdminWorldTreeMission
  onOpenChallenge: (id: number) => void
}) {
  return (
    <>
      <header className="admin-tree-detail-head">
        <p className="admin-tree-kicker">
          {worldTitle} · {courseName}
        </p>
        <h2>{mission.title}</h2>
        <p className="muted">
          {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
          {mission.uses_board ? ' · usa pizarra' : ''}
          {' · actualizado '}
          {formatWhen(mission.updated_at)}
        </p>
      </header>
      {mission.study ? (
        <div className="admin-study-card">
          <p className="admin-tree-kicker">Última sesión de estudio</p>
          <p>
            <strong>{phaseLabel(mission.study.phase)}</strong>
            {' · '}
            {formatWhen(mission.study.updated_at)}
          </p>
          <p className="muted">{mission.study.summary || 'Sin resumen.'}</p>
        </div>
      ) : (
        <p className="muted">No hay sesión de estudio en este período.</p>
      )}
      <ChallengeBlock
        title="Desafíos del tema"
        empty="No hay desafíos de este tema."
        rows={mission.challenges}
        onOpen={onOpenChallenge}
      />
    </>
  )
}

function ChallengeBlock({
  title,
  empty,
  rows,
  onOpen,
}: {
  title: string
  empty: string
  rows: AdminChallengeRow[]
  onOpen: (id: number) => void
}) {
  return (
    <div className="admin-challenge-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Alcance</th>
                <th>Dificultad</th>
                <th>Estado</th>
                <th>Puntaje</th>
                <th>Completado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ch) => (
                <tr
                  key={ch.id}
                  className="is-clickable"
                  tabIndex={0}
                  onClick={() => onOpen(ch.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpen(ch.id)
                    }
                  }}
                >
                  <td>
                    <strong>{SCOPE_LABEL[ch.scope] ?? ch.scope}</strong>
                    <span className="admin-table-sub">
                      {ch.mission_title ?? ch.course_name ?? '—'}
                    </span>
                  </td>
                  <td>{DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty}</td>
                  <td>
                    {ch.status === 'completed'
                      ? 'Completado'
                      : ch.status === 'in_progress'
                        ? 'En curso'
                        : ch.status}
                  </td>
                  <td>{ch.score == null ? '—' : `${ch.score} pts`}</td>
                  <td>{formatWhen(ch.completed_at)}</td>
                  <td>Ver detalle</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}