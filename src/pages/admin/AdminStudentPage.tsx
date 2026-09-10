import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Copy,
  FloppyDisk,
  GlobeHemisphereWest,
  Pause,
  Play,
  Plus,
  Student,
  Trophy,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { EmptyState } from '../../components/EmptyState'
import { DateField } from '../../components/ui/DateField'
import { PasswordField, TextField } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import { errorMessage } from '../../lib/errors'
import { phaseLabel } from '../../lib/studyProtocol'
import type {
  AdminCourse,
  AdminOverview,
  AdminStudent,
  AdminStudyRow,
  AdminTaskRow,
} from '../../lib/adminTypes'
import {
  DIFFICULTY_LABEL,
  SCOPE_LABEL,
} from '../../lib/worldsTypes'
import { STATUS_COLUMNS, todayISO } from '../../types'
import { useToast } from '../../toast'
import { AdminChallengeReview } from './AdminChallengeReview'
import { AdminStatCard } from './AdminStatCard'
import { AdminWorldsExplorer } from './AdminWorldsExplorer'
import {
  formatDay,
  formatWhen,
  taskStatusLabel,
} from './adminFormat'

type StudentTab = 'resumen' | 'tareas' | 'mundos' | 'cuenta'

const TABS: { id: StudentTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'mundos', label: 'Mundos' },
  { id: 'cuenta', label: 'Cuenta' },
]

const tabMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
}

export function AdminStudentPage({
  studentId,
  onBack,
}: {
  studentId: number
  onBack: () => void
}) {
  const { showToast } = useToast()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<StudentTab>('resumen')
  const [challengeId, setChallengeId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const next = await api.getStudentOverview(studentId)
    setOverview(next)
  }, [studentId])

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

  async function onToggleActive() {
    if (!overview) return
    const next = !overview.student.is_active
    try {
      await api.updateStudent(studentId, { is_active: next })
      await refresh()
      showToast({
        tone: 'success',
        title: next ? 'Cuenta activa' : 'Cuenta pausada',
        subtitle: next
          ? 'Ya puede entrar de nuevo.'
          : 'No podrá entrar hasta que la actives.',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo cambiar',
        subtitle: errorMessage(err),
      })
    }
  }

  if (loading) {
    return <AppLoader message="Cargando ficha…" />
  }

  if (error || !overview) {
    return (
      <div>
        <button type="button" className="ghost worlds-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Panel general
        </button>
        <p className="form-error banner">{error ?? 'No se pudo abrir la ficha'}</p>
      </div>
    )
  }

  const { student, courses, tasks, worlds, missions, challenges } = overview
  const activeCourses = courses.filter((c) => c.is_active)
  const archivedCourses = courses.filter((c) => !c.is_active)

  return (
    <>
      <nav className="admin-file-nav">
        <button type="button" className="ghost worlds-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Panel general
        </button>
        <button type="button" className="ghost" onClick={() => void onToggleActive()}>
          {student.is_active ? (
            <>
              <Pause size={16} weight="fill" />
              Pausar cuenta
            </>
          ) : (
            <>
              <Play size={16} weight="fill" />
              Activar cuenta
            </>
          )}
        </button>
      </nav>

      <AnimatePresence mode="wait">
        {challengeId != null ? (
          <motion.div
            key={`challenge-${challengeId}`}
            className="admin-challenge-stage"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <AdminChallengeReview
              studentId={studentId}
              challengeId={challengeId}
              onBack={() => setChallengeId(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="student-file"
            className="admin-file-stage"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          <header className="admin-identity">
            <WorldsIconBadge
              icon={Student}
              size="xl"
              tone={student.is_active ? 'accent' : 'muted'}
            />
            <div>
              <h1>{student.username}</h1>
              <p>
                {student.email}
                {student.is_active ? '' : ' · cuenta pausada'}
                {' · '}
                Último estudio: {formatWhen(overview.last_study_at)}
              </p>
            </div>
          </header>

          <div className="admin-tabs" role="tablist" aria-label="Secciones de la ficha">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`admin-tab${tab === item.id ? ' is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="admin-tab-stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                className="admin-tab-panel"
                initial={tabMotion.initial}
                animate={tabMotion.animate}
                exit={tabMotion.exit}
                transition={tabMotion.transition}
              >
              {tab === 'resumen' && (
                <ResumenTab
                  tasks={tasks}
                  worlds={worlds}
                  missions={missions}
                  challenges={challenges}
                  activeCourses={activeCourses.length}
                  archivedCourses={archivedCourses.length}
                  onOpenChallenge={(id) => setChallengeId(id)}
                />
              )}
              {tab === 'tareas' && (
                <>
                  <TasksTab studentId={studentId} courses={courses} />
                  <TaskStudyBlock studentId={studentId} />
                </>
              )}
              {tab === 'mundos' && (
                <AdminWorldsExplorer
                  studentId={studentId}
                  onOpenChallenge={(id) => setChallengeId(id)}
                />
              )}
              {tab === 'cuenta' && (
                <AccountTab
                  studentId={studentId}
                  overview={overview}
                  onRefresh={refresh}
                />
              )}
              </motion.div>
            </AnimatePresence>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ResumenTab({
  tasks,
  worlds,
  missions,
  challenges,
  activeCourses,
  archivedCourses,
  onOpenChallenge,
}: {
  tasks: AdminOverview['tasks']
  worlds: AdminOverview['worlds']
  missions: AdminOverview['missions']
  challenges: AdminOverview['challenges']
  activeCourses: number
  archivedCourses: number
  onOpenChallenge: (id: number) => void
}) {
  return (
    <>
      <section className="admin-stat-grid admin-stat-grid--4" aria-label="Resumen">
        <AdminStatCard
          icon={CheckCircle}
          label="Tareas"
          value={`${tasks.done}/${tasks.total || 0}`}
          hint={
            tasks.overdue > 0 ? `${tasks.overdue} atrasadas` : 'Sin atrasadas'
          }
        />
        <AdminStatCard
          icon={GlobeHemisphereWest}
          label="Mundos"
          value={String(worlds.count)}
          hint={`${missions.mastered} temas dominados`}
        />
        <AdminStatCard
          icon={BookOpen}
          label="Materias"
          value={String(activeCourses)}
          hint={`${archivedCourses} archivadas`}
        />
        <AdminStatCard
          icon={Trophy}
          label="Desafíos"
          value={String(challenges.completed_count)}
          hint={
            challenges.avg_score == null
              ? 'Sin calificaciones'
              : `Promedio ${challenges.avg_score} pts`
          }
        />
      </section>

      <div className="admin-dash-split">
        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>Tareas recientes</h2>
            <p className="muted">
              Pendiente {tasks.pending} · En proceso {tasks.in_progress} · En
              estudio {tasks.studying} · Terminado {tasks.done}
            </p>
          </div>
          {tasks.items.length === 0 ? (
            <EmptyState
              compact
              icon={CheckCircle}
              title="Sin tareas"
              description="Aún no tiene tareas."
            />
          ) : (
            <div className="admin-table-wrap admin-table-wrap--flush">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Materia</th>
                    <th>Estado</th>
                    <th>Entrega</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.items.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.title}</strong>
                        {item.study_passed ? (
                          <span className="admin-table-sub">Visto del tutor</span>
                        ) : null}
                      </td>
                      <td>{item.course_name}</td>
                      <td>{taskStatusLabel(item.status)}</td>
                      <td>{formatDay(item.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>Últimos desafíos</h2>
          </div>
          {challenges.recent.length === 0 ? (
            <EmptyState
              compact
              icon={Trophy}
              title="Sin desafíos"
              description="Todavía no completa un desafío."
            />
          ) : (
            <div className="admin-table-wrap admin-table-wrap--flush">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Desafío</th>
                    <th>Puntaje</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.recent.map((ch) => (
                    <tr
                      key={ch.id}
                      className="is-clickable"
                      tabIndex={0}
                      onClick={() => onOpenChallenge(ch.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpenChallenge(ch.id)
                        }
                      }}
                    >
                      <td>
                        <strong>
                          {SCOPE_LABEL[ch.scope] ?? ch.scope}
                          {ch.mission_title ? ` · ${ch.mission_title}` : ''}
                        </strong>
                        <span className="admin-table-sub">
                          {DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty}
                          {ch.course_name ? ` · ${ch.course_name}` : ''}
                          {' · '}
                          {ch.world_title}
                        </span>
                      </td>
                      <td>{ch.score ?? '—'} pts</td>
                      <td>Ver detalle</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function TasksTab({
  studentId,
  courses,
}: {
  studentId: number
  courses: AdminCourse[]
}) {
  const [createdFrom, setCreatedFrom] = useState(todayISO)
  const [createdTo, setCreatedTo] = useState(todayISO)
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [rows, setRows] = useState<AdminTaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setRows(
          await api.listAdminStudentTasks(studentId, {
            created_from: createdFrom || null,
            created_to: createdTo || null,
            due_from: dueFrom || null,
            due_to: dueTo || null,
            status: status || null,
            course_id: courseId ? Number(courseId) : null,
          }),
        )
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [studentId, createdFrom, createdTo, dueFrom, dueTo, status, courseId])

  const hasFilters = Boolean(
    createdFrom || createdTo || dueFrom || dueTo || status || courseId,
  )

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <h2>Tareas</h2>
      </div>
      <div className="admin-filters">
        <DateField
          label="Creada desde"
          value={createdFrom}
          onChange={setCreatedFrom}
        />
        <DateField
          label="Creada hasta"
          value={createdTo}
          onChange={setCreatedTo}
        />
        <DateField label="Entrega desde" value={dueFrom} onChange={setDueFrom} />
        <DateField label="Entrega hasta" value={dueTo} onChange={setDueTo} />
        <SelectField
          label="Estado"
          value={status}
          placeholder="Todos"
          options={[
            { value: '', label: 'Todos' },
            ...STATUS_COLUMNS.map((column) => ({
              value: column.id,
              label: column.label,
            })),
          ]}
          onChange={setStatus}
        />
        <SelectField
          label="Materia"
          value={courseId}
          placeholder="Todas"
          options={[
            { value: '', label: 'Todas' },
            ...courses.map((course) => ({
              value: String(course.id),
              label: course.is_active ? course.name : `${course.name} (archivada)`,
            })),
          ]}
          onChange={setCourseId}
        />
        <button
          type="button"
          className="ghost filters-clear"
          disabled={!hasFilters}
          onClick={() => {
            setCreatedFrom('')
            setCreatedTo('')
            setDueFrom('')
            setDueTo('')
            setStatus('')
            setCourseId('')
          }}
        >
          Limpiar filtros
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <AppLoader message="Cargando tareas…" variant="section" />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={CheckCircle}
          title="Sin tareas"
          description="No hay tareas con estos filtros."
        />
      ) : (
        <div className="admin-table-wrap admin-table-wrap--flush">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Materia</th>
                <th>Estado</th>
                <th>Tutor</th>
                <th>Creada</th>
                <th>Entrega</th>
                <th>Actualizada</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td>{item.course_name}</td>
                  <td>{taskStatusLabel(item.status)}</td>
                  <td>{item.study_passed ? 'Listo' : 'Pendiente'}</td>
                  <td>{formatWhen(item.created_at)}</td>
                  <td>{formatDay(item.due_date)}</td>
                  <td>{formatWhen(item.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TaskStudyBlock({ studentId }: { studentId: number }) {
  const [from, setFrom] = useState(todayISO)
  const [to, setTo] = useState(todayISO)
  const [rows, setRows] = useState<AdminStudyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setRows(
          await api.listAdminStudentStudy(studentId, {
            from: from || null,
            to: to || null,
            kind: 'task',
          }),
        )
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [studentId, from, to])

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <h2>Estudio de tareas</h2>
        <p className="muted">Sesiones del tutor en el tablero, no de mundos.</p>
      </div>
      <div className="admin-filters">
        <DateField label="Desde" value={from} onChange={setFrom} />
        <DateField label="Hasta" value={to} onChange={setTo} />
        <button
          type="button"
          className="ghost filters-clear"
          disabled={!from && !to}
          onClick={() => {
            setFrom('')
            setTo('')
          }}
        >
          Limpiar filtros
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <AppLoader message="Cargando estudio…" variant="section" />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={BookOpen}
          title="Sin sesiones"
          description="No hay sesiones de estudio de tareas en este período."
        />
      ) : (
        <div className="admin-table-wrap admin-table-wrap--flush">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Materia</th>
                <th>Fase</th>
                <th>Resumen</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={`${item.kind}-${item.ref_id}-${item.updated_at}-${index}`}>
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td>{item.course_name}</td>
                  <td>{phaseLabel(item.phase)}</td>
                  <td className="admin-table-summary">{item.summary || '—'}</td>
                  <td>{formatWhen(item.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AccountTab({
  studentId,
  overview,
  onRefresh,
}: {
  studentId: number
  overview: AdminOverview
  onRefresh: () => Promise<void>
}) {
  const { showToast } = useToast()
  const [courseName, setCourseName] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [username, setUsername] = useState(overview.student.username)
  const [email, setEmail] = useState(overview.student.email)
  const [password, setPassword] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)

  useEffect(() => {
    setUsername(overview.student.username)
    setEmail(overview.student.email)
  }, [overview.student.username, overview.student.email])

  const { courses } = overview
  const activeCourses = courses.filter((c) => c.is_active)
  const archivedCourses = courses.filter((c) => !c.is_active)

  async function onSaveStudent(event: FormEvent) {
    event.preventDefault()
    setSavingStudent(true)
    try {
      await api.updateStudent(studentId, {
        username,
        email,
        password: password.trim() || undefined,
      })
      setPassword('')
      await onRefresh()
      showToast({
        tone: 'success',
        title: 'Datos guardados',
        subtitle: 'La cuenta quedó actualizada.',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo guardar',
        subtitle: errorMessage(err),
      })
    } finally {
      setSavingStudent(false)
    }
  }

  async function onAddCourse(event: FormEvent) {
    event.preventDefault()
    const name = courseName.trim()
    if (!name) return
    setSavingCourse(true)
    try {
      await api.createStudentCourse(studentId, name)
      setCourseName('')
      await onRefresh()
      showToast({
        tone: 'success',
        title: 'Materia agregada',
        subtitle: name,
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo agregar',
        subtitle: errorMessage(err),
      })
    } finally {
      setSavingCourse(false)
    }
  }

  async function onArchiveCourse(courseId: number, name: string) {
    try {
      await api.archiveStudentCourse(studentId, courseId)
      await onRefresh()
      showToast({
        tone: 'success',
        title: 'Materia archivada',
        subtitle: `${name} ya no aparece para el alumno.`,
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo archivar',
        subtitle: errorMessage(err),
      })
    }
  }

  async function onRestoreCourse(courseId: number, name: string) {
    try {
      await api.updateStudentCourse(studentId, courseId, { is_active: true })
      await onRefresh()
      showToast({
        tone: 'success',
        title: 'Materia restaurada',
        subtitle: name,
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo restaurar',
        subtitle: errorMessage(err),
      })
    }
  }

  return (
    <div className="admin-dash-split">
      <section className="admin-panel">
        <div className="admin-section-head">
          <h2>Cuenta</h2>
        </div>
        <form className="admin-edit-form" onSubmit={(e) => void onSaveStudent(e)}>
          <TextField
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordField
            label="Nueva contraseña (opcional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
          <button type="submit" className="primary" disabled={savingStudent}>
            <FloppyDisk size={18} weight="fill" />
            {savingStudent ? 'Guardando…' : 'Guardar cuenta'}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <h2>Materias</h2>
        </div>
        <form className="admin-course-add" onSubmit={(e) => void onAddCourse(e)}>
          <TextField
            label="Nueva materia"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Ej. Matemáticas"
          />
          <button
            type="submit"
            className="primary"
            disabled={savingCourse || !courseName.trim()}
          >
            <Plus size={18} weight="bold" />
            Agregar
          </button>
        </form>
        <ImportCoursesBlock studentId={studentId} onImported={onRefresh} />
        {courses.length === 0 && (
          <EmptyState
            compact
            icon={BookOpen}
            title="Sin materias"
            description="Todavía no tiene materias asignadas."
          />
        )}
        <ul className="admin-course-list">
          {activeCourses.map((course) => (
            <li key={course.id} className="admin-course-row">
              <span>{course.name}</span>
              <button
                type="button"
                className="ghost"
                onClick={() => void onArchiveCourse(course.id, course.name)}
              >
                Archivar
              </button>
            </li>
          ))}
          {archivedCourses.map((course) => (
            <li key={course.id} className="admin-course-row is-archived">
              <span>{course.name} (archivada)</span>
              <button
                type="button"
                className="ghost"
                onClick={() => void onRestoreCourse(course.id, course.name)}
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ImportCoursesBlock({
  studentId,
  onImported,
}: {
  studentId: number
  onImported: () => Promise<void>
}) {
  const { showToast } = useToast()
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [sourceId, setSourceId] = useState('')
  const [sourceCourses, setSourceCourses] = useState<AdminCourse[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const list = await api.listStudents()
        setStudents(list.filter((student) => student.id !== studentId))
      } catch {
        setStudents([])
      }
    })()
  }, [studentId])

  useEffect(() => {
    if (!sourceId) {
      setSourceCourses([])
      setSelectedIds([])
      return
    }
    void (async () => {
      setLoadingCourses(true)
      try {
        const courses = (await api.listStudentCourses(Number(sourceId))).filter(
          (course) => course.is_active,
        )
        setSourceCourses(courses)
        setSelectedIds(courses.map((course) => course.id))
      } catch (err) {
        setSourceCourses([])
        setSelectedIds([])
        showToast({
          tone: 'error',
          title: 'No se pudieron cargar las materias',
          subtitle: errorMessage(err),
        })
      } finally {
        setLoadingCourses(false)
      }
    })()
  }, [sourceId, showToast])

  function toggleCourse(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  async function onImport() {
    if (!sourceId || selectedIds.length === 0) return
    setImporting(true)
    try {
      const result = await api.importStudentCourses(studentId, {
        from_student_id: Number(sourceId),
        course_ids: selectedIds,
      })
      await onImported()
      const added = result.created.length + result.reactivated.length
      showToast({
        tone: 'success',
        title: added > 0 ? 'Materias importadas' : 'Nada nuevo que agregar',
        subtitle:
          added > 0
            ? `${added} ${added === 1 ? 'materia copiada' : 'materias copiadas'}${
                result.skipped.length > 0
                  ? ` · ${result.skipped.length} ya las tenía`
                  : ''
              }.`
            : 'Este alumno ya tenía esas materias.',
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo importar',
        subtitle: errorMessage(err),
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="admin-import">
      <p className="admin-import-label">Importar de otro alumno</p>
      {students.length === 0 ? (
        <EmptyState
          compact
          icon={Student}
          title="Sin otros alumnos"
          description="No hay otros alumnos de quienes copiar materias."
        />
      ) : (
        <>
          <SelectField
            label="Copiar desde"
            value={sourceId}
            placeholder="Elige un alumno"
            options={[
              { value: '', label: 'Elige un alumno' },
              ...students.map((student) => ({
                value: String(student.id),
                label: student.username,
              })),
            ]}
            onChange={setSourceId}
          />
          {loadingCourses && (
            <AppLoader message="Cargando cursos…" variant="section" />
          )}
          {!loadingCourses && sourceId && sourceCourses.length === 0 && (
            <EmptyState
              compact
              icon={BookOpen}
              title="Sin materias activas"
              description="Ese alumno no tiene materias activas."
            />
          )}
          {sourceCourses.length > 0 && (
            <>
              <div className="admin-import-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setSelectedIds(sourceCourses.map((course) => course.id))
                  }
                >
                  Todas
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSelectedIds([])}
                >
                  Ninguna
                </button>
              </div>
              <ul className="admin-import-list">
                {sourceCourses.map((course) => {
                  const on = selectedIds.includes(course.id)
                  return (
                    <li key={course.id}>
                      <button
                        type="button"
                        className={`admin-import-chip${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => toggleCourse(course.id)}
                      >
                        {course.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="primary"
                disabled={importing || selectedIds.length === 0}
                onClick={() => void onImport()}
              >
                <Copy size={18} weight="bold" />
                {importing
                  ? 'Importando…'
                  : `Importar ${selectedIds.length} ${
                      selectedIds.length === 1 ? 'materia' : 'materias'
                    }`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
