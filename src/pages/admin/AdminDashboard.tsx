import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  GlobeHemisphereWest,
  Student,
  Trophy,
  UserPlus,
  WarningCircle,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { DateField } from '../../components/ui/DateField'
import { TextField } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { errorMessage } from '../../lib/errors'
import type {
  AdminDashboard as AdminDashboardData,
  AdminStudent,
} from '../../lib/adminTypes'
import { AppLoader } from '../../components/AppLoader'
import { AdminDashboardCharts } from './AdminCharts'
import { AdminStatCard } from './AdminStatCard'
import { formatWhen } from './adminFormat'

interface Props {
  onOpenStudent: (id: number) => void
  onCreateStudent: () => void
}

export function AdminDashboard({ onOpenStudent, onCreateStudent }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [studentId, setStudentId] = useState('')
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [query, setQuery] = useState('')
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setStudents(await api.listStudents())
      } catch {
        /* el listado del dashboard sirve de respaldo */
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setData(
          await api.getAdminDashboard({
            from: from || null,
            to: to || null,
            student_id: studentId ? Number(studentId) : null,
          }),
        )
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [from, to, studentId])

  const roster = useMemo(() => {
    const list = data?.roster ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (row) =>
        row.username.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q),
    )
  }, [data, query])

  const studentOptions = useMemo(() => {
    const list = students.length > 0 ? students : (data?.roster ?? [])
    return list.map((row) => ({
      value: String(row.id),
      label: row.username,
      keywords: `${row.username} ${row.email}`,
    }))
  }, [students, data])

  const hasPeriod = Boolean(from || to)
  const selectedStudentId = studentId ? Number(studentId) : null

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-filters">
          <SelectField
            label="Alumno"
            value={studentId}
            placeholder="Todos"
            searchable
            searchPlaceholder="Usuario o correo"
            options={[{ value: '', label: 'Todos' }, ...studentOptions]}
            onChange={setStudentId}
            className="admin-student-filter"
          />
          <DateField label="Desde" value={from} onChange={setFrom} />
          <DateField label="Hasta" value={to} onChange={setTo} />
          <button
            type="button"
            className="ghost filters-clear"
            disabled={!hasPeriod && !studentId}
            onClick={() => {
              setFrom('')
              setTo('')
              setStudentId('')
            }}
          >
            Limpiar filtros
          </button>
        </div>
        <div className="admin-toolbar-actions">
          {selectedStudentId != null && (
            <button
              type="button"
              className="admin-open-student"
              onClick={() => onOpenStudent(selectedStudentId)}
            >
              <Student size={18} weight="fill" />
              Ver ficha
              <ArrowRight size={16} weight="bold" />
            </button>
          )}
          <button type="button" className="primary" onClick={onCreateStudent}>
            <UserPlus size={18} weight="fill" />
            Nuevo alumno
          </button>
        </div>
      </div>

      {error && <p className="form-error banner">{error}</p>}
      {loading && <AppLoader message="Cargando dashboard…" />}

      {data && !loading && (
        <>
          <section className="admin-stat-grid" aria-label="Indicadores">
            <AdminStatCard
              icon={Student}
              label="Alumnos"
              value={String(data.students.total)}
              hint={`${data.students.active} activos · ${data.students.paused} pausados`}
            />
            <AdminStatCard
              icon={CheckCircle}
              label="Tareas"
              value={String(data.tasks.total)}
              hint={`${data.tasks.done} terminadas · ${data.tasks.studying} en estudio`}
            />
            <AdminStatCard
              icon={WarningCircle}
              label="Atrasadas"
              value={String(data.tasks.overdue)}
              hint={
                data.tasks.overdue === 0
                  ? 'Sin vencidas abiertas'
                  : 'Pendientes o en curso fuera de fecha'
              }
            />
            <AdminStatCard
              icon={Trophy}
              label="Desafíos"
              value={String(data.challenges.completed_count)}
              hint={
                data.challenges.avg_score == null
                  ? 'Sin calificaciones'
                  : `Promedio ${data.challenges.avg_score} pts`
              }
            />
            <AdminStatCard
              icon={GlobeHemisphereWest}
              label="Mundos"
              value={String(data.worlds.count)}
              hint={`${data.missions.mastered} temas dominados`}
            />
            <AdminStatCard
              icon={BookOpen}
              label="Temas"
              value={`${data.missions.mastered}/${data.missions.total || 0}`}
              hint={`${data.missions.studying} en marcha · ${data.missions.pending} por empezar`}
            />
          </section>

          <AdminDashboardCharts data={data} onOpenStudent={onOpenStudent} />

          <section className="admin-panel" aria-label="Alumnos">
            <div className="admin-section-head">
              <h2>Alumnos</h2>
              <TextField
                label="Buscar"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Usuario o correo"
                className="admin-search-field"
              />
            </div>
            <div className="admin-table-wrap admin-table-wrap--flush">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Estado</th>
                    <th>Materias</th>
                    <th>Tareas</th>
                    <th>Atrasadas</th>
                    <th>Desafíos</th>
                    <th>Promedio</th>
                    <th>Último estudio</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="admin-table-empty">
                        {data.roster.length === 0
                          ? 'Todavía no hay alumnos. Crea el primero para empezar.'
                          : 'Ningún alumno coincide con la búsqueda.'}
                      </td>
                    </tr>
                  ) : (
                    roster.map((row) => (
                      <tr
                        key={row.id}
                        className="is-clickable"
                        tabIndex={0}
                        onClick={() => onOpenStudent(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpenStudent(row.id)
                          }
                        }}
                      >
                        <td>
                          <strong>{row.username}</strong>
                          <span className="admin-table-sub">{row.email}</span>
                        </td>
                        <td>
                          <span
                            className={`admin-pill${row.is_active ? '' : ' is-muted'}`}
                          >
                            {row.is_active ? 'Activo' : 'Pausado'}
                          </span>
                        </td>
                        <td>{row.course_count}</td>
                        <td>
                          {row.tasks_done}/{row.tasks_total}
                        </td>
                        <td>
                          {row.tasks_overdue > 0 ? (
                            <span className="admin-pill is-warn">
                              {row.tasks_overdue}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td>{row.challenges_completed}</td>
                        <td>
                          {row.avg_score == null ? '—' : row.avg_score}
                        </td>
                        <td>{formatWhen(row.last_study_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
