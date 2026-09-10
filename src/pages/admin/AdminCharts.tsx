import { useMemo } from 'react'
import {
  ChartBar,
  ChartLine,
  CheckCircle,
  CurrencyDollar,
  Lightning,
  UsersThree,
} from '@phosphor-icons/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useAccent } from '../../accent'
import { EmptyState } from '../../components/EmptyState'
import { useTheme } from '../../theme'
import type { AdminDashboard, AdminRosterRow } from '../../lib/adminTypes'
import { formatDay } from './adminFormat'

const IDLE_DAYS = 3
const MAX_BARS = 10
const MAX_FOLLOWUP = 8

function formatUsd(value: number) {
  if (value <= 0) return '$0'
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}

function useChartColors() {
  const { theme } = useTheme()
  const { accent } = useAccent()
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string) => {
      const value = styles.getPropertyValue(name).trim()
      return value || fallback
    }
    return {
      accent: read('--accent', '#2563eb'),
      ink: read('--ink', '#1a2a4a'),
      muted: read('--muted', '#5a6d8c'),
      danger: read('--danger', '#e11d48'),
      panel: read('--panel-strong', '#ffffff'),
      line: read('--line', 'rgba(37, 99, 235, 0.14)'),
      done: '#16a34a',
      studying: '#0d9488',
      voice: '#d97706',
      pending: read('--muted', '#5a6d8c'),
      progress: read('--accent', '#2563eb'),
    }
  }, [theme, accent])
}

function shortDay(value: string) {
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value.slice(5)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function shortName(name: string) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name
}

function daysSince(value: string | null) {
  if (!value) return null
  const raw = value.includes('T') ? value : value.replace(' ', 'T')
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))
}

function ChartTooltip({
  active,
  payload,
  label,
  colors,
}: TooltipContentProps & {
  colors: { panel: string; ink: string; muted: string; line: string }
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="admin-chart-tooltip"
      style={{ background: colors.panel, borderColor: colors.line }}
    >
      {label != null && label !== '' && (
        <p className="admin-chart-tooltip-label" style={{ color: colors.muted }}>
          {String(label)}
        </p>
      )}
      {payload.map((item) => {
        const isUsd = String(item.dataKey) === 'estimated_usd'
        const raw = Number(item.value ?? 0)
        return (
          <p key={String(item.dataKey ?? item.name)} style={{ color: item.color ?? colors.ink }}>
            {String(item.name ?? '')}:{' '}
            <strong>{isUsd ? formatUsd(raw) : String(item.value ?? 0)}</strong>
          </p>
        )
      })}
    </div>
  )
}

function followupReason(row: AdminRosterRow) {
  const idle = daysSince(row.last_study_at)
  const enrolled = daysSince(row.created_at) ?? 0
  const neverStudied = row.last_study_at == null && enrolled >= IDLE_DAYS
  const stale = idle != null && idle >= IDLE_DAYS
  if (row.tasks_overdue <= 0 && !neverStudied && !stale) return null
  return {
    overdue: row.tasks_overdue,
    idle,
    neverStudied,
  }
}

export function AdminDashboardCharts({
  data,
  onOpenStudent,
}: {
  data: AdminDashboard
  onOpenStudent: (id: number) => void
}) {
  const colors = useChartColors()
  const activity = useMemo(
    () =>
      data.series.days.map((point) => ({
        ...point,
        label: shortDay(point.date),
      })),
    [data.series.days],
  )
  const hasActivity = activity.some(
    (point) => point.tasks > 0 || point.study > 0 || point.challenges > 0,
  )

  const byStudent = useMemo(
    () =>
      [...(data.by_student ?? [])]
        .filter((row) => row.study > 0 || row.tasks_done > 0 || row.challenges > 0)
        .sort(
          (a, b) =>
            b.study + b.tasks_done + b.challenges - (a.study + a.tasks_done + a.challenges),
        )
        .slice(0, MAX_BARS)
        .map((row) => ({
          ...row,
          name: shortName(row.username),
          fullName: row.username,
          estudio: row.study,
          tareas: row.tasks_done,
          desafios: row.challenges,
        })),
    [data.by_student],
  )

  const followup = useMemo(
    () =>
      data.roster
        .map((row) => {
          const reason = followupReason(row)
          if (!reason) return null
          return { row, reason }
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
        .sort((a, b) => {
          if (b.reason.overdue !== a.reason.overdue) {
            return b.reason.overdue - a.reason.overdue
          }
          const idleA = a.reason.neverStudied ? 999 : (a.reason.idle ?? 0)
          const idleB = b.reason.neverStudied ? 999 : (b.reason.idle ?? 0)
          return idleB - idleA
        })
        .slice(0, MAX_FOLLOWUP),
    [data.roster],
  )

  const usage = data.usage
  const usageDays = useMemo(
    () =>
      (usage?.days ?? []).map((point) => ({
        ...point,
        label: shortDay(point.date),
      })),
    [usage],
  )
  const hasUsageCalls = usageDays.some(
    (point) => point.tutor > 0 || point.challenges > 0 || point.voice > 0,
  )
  const hasChildActions = usageDays.some((point) => point.child_messages > 0)
  const costRows = useMemo(
    () =>
      [...(usage?.by_student ?? [])]
        .filter((row) => row.calls > 0 || row.estimated_usd > 0)
        .slice(0, MAX_BARS)
        .map((row) => ({
          ...row,
          name: shortName(row.username),
          fullName: row.username,
        })),
    [usage],
  )
  const kindRows = useMemo(() => {
    const rows = usage?.by_kind ?? []
    return [
      { kind: 'tutor', label: 'Tutor' },
      { kind: 'challenges', label: 'Desafíos' },
      { kind: 'voice', label: 'Transcripciones' },
    ].map((item) => ({
      ...item,
      calls: rows.find((row) => row.kind === item.kind)?.calls ?? 0,
    }))
  }, [usage])
  const kindFill = (kind: string) => {
    if (kind === 'voice') return colors.voice
    if (kind === 'challenges') return colors.danger
    return colors.studying
  }
  const actionRows = useMemo(
    () =>
      [...(usage?.by_student ?? [])]
        .filter(
          (row) =>
            row.calls > 0 ||
            row.child_messages > 0 ||
            (row.challenges_created ?? 0) > 0 ||
            row.voice > 0,
        )
        .slice(0, MAX_BARS)
        .map((row) => ({
          ...row,
          name: shortName(row.username),
          fullName: row.username,
          tutor: row.tutor,
          mensajes: row.child_messages,
          desafios: row.challenges_created ?? 0,
          transcripciones: row.voice,
        })),
    [usage],
  )

  const tooltip = (props: TooltipContentProps) => (
    <ChartTooltip {...props} colors={colors} />
  )
  const tooltipUi = {
    cursor: false as const,
    wrapperStyle: {
      outline: 'none',
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
    },
  }

  const showByStudent = byStudent.length > 1

  return (
    <div className="admin-chart-grid">
      <section className="admin-panel admin-panel--wide">
        <div className="admin-section-head">
          <h2>Actividad del período</h2>
          <p className="muted">
            {formatDay(data.series.from)} — {formatDay(data.series.to)}
          </p>
        </div>
        {hasActivity ? (
          <div className="admin-chart admin-chart--wide">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.line} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={{ stroke: colors.line }}
                  tickLine={false}
                  interval="equidistantPreserveStart"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={tooltip} {...tooltipUi} />
                <Legend wrapperStyle={{ fontWeight: 800, fontSize: 13 }} />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tareas"
                  stroke={colors.accent}
                  fill={colors.accent}
                  fillOpacity={0.16}
                  strokeWidth={2.4}
                />
                <Area
                  type="monotone"
                  dataKey="study"
                  name="Estudio"
                  stroke={colors.studying}
                  fill={colors.studying}
                  fillOpacity={0.12}
                  strokeWidth={2.4}
                />
                <Area
                  type="monotone"
                  dataKey="challenges"
                  name="Desafíos"
                  stroke={colors.danger}
                  fill={colors.danger}
                  fillOpacity={0.1}
                  strokeWidth={2.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            compact
            icon={ChartLine}
            title="Sin actividad"
            description="No hay tareas, estudio ni desafíos en este período."
          />
        )}
      </section>

      <section className="admin-panel admin-panel--wide">
        <div className="admin-section-head">
          <h2>Uso de Gemini</h2>
          <p className="muted">
            {usage?.measured
              ? 'Llamadas reales registradas'
              : 'Estimado por respuestas del tutor y desafíos'}
            {usage
              ? ` · ${usage.totals.calls} llamadas · ${formatUsd(usage.totals.estimated_usd)}`
              : ''}
          </p>
        </div>
        {hasUsageCalls ? (
          <div className="admin-chart admin-chart--wide">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageDays} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.line} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={{ stroke: colors.line }}
                  tickLine={false}
                  interval="equidistantPreserveStart"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={tooltip} {...tooltipUi} />
                <Legend wrapperStyle={{ fontWeight: 800, fontSize: 13 }} />
                <Area
                  type="monotone"
                  dataKey="tutor"
                  name="Tutor"
                  stroke={colors.studying}
                  fill={colors.studying}
                  fillOpacity={0.16}
                  strokeWidth={2.4}
                />
                <Area
                  type="monotone"
                  dataKey="challenges"
                  name="Desafíos"
                  stroke={colors.danger}
                  fill={colors.danger}
                  fillOpacity={0.12}
                  strokeWidth={2.4}
                />
                <Area
                  type="monotone"
                  dataKey="voice"
                  name="Transcripciones"
                  stroke={colors.voice}
                  fill={colors.voice}
                  fillOpacity={0.12}
                  strokeWidth={2.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            compact
            icon={Lightning}
            title="Sin uso de Gemini"
            description="Nadie usó el tutor, transcripciones ni desafíos en este período."
          />
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <h2>Costo estimado</h2>
          <p className="muted">
            Gemini Flash · {usage?.measured ? 'tokens medidos' : 'aprox. por acción'}
          </p>
        </div>
        {costRows.length === 0 ? (
          <EmptyState
            compact
            icon={CurrencyDollar}
            title="Sin gasto"
            description="Sin gasto de IA en este período."
          />
        ) : (
          <div
            className="admin-chart"
            style={{ height: Math.max(240, costRows.length * 42 + 48) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={costRows}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid stroke={colors.line} strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => formatUsd(Number(value))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fill: colors.ink, fontSize: 12, fontWeight: 800 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipUi}
                  content={(props) => {
                    const label = costRows.find((row) => row.name === props.label)?.fullName
                    return <ChartTooltip {...props} label={label ?? props.label} colors={colors} />
                  }}
                />
                <Bar
                  dataKey="estimated_usd"
                  name="Costo"
                  fill={colors.accent}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <h2>Acciones por alumno</h2>
        </div>
        {actionRows.length === 0 && !hasChildActions && !hasUsageCalls ? (
          <EmptyState
            compact
            icon={UsersThree}
            title="Sin acciones"
            description="No hay acciones en este período."
          />
        ) : actionRows.length === 0 ? (
          <EmptyState
            compact
            icon={ChartBar}
            title="Sin desglose"
            description="Hay actividad, pero no se pudo agrupar por alumno."
          />
        ) : (
          <div
            className="admin-chart"
            style={{ height: Math.max(260, actionRows.length * 56 + 72) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={actionRows}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid stroke={colors.line} strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fill: colors.ink, fontSize: 12, fontWeight: 800 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipUi}
                  content={(props) => {
                    const label = actionRows.find((row) => row.name === props.label)?.fullName
                    return <ChartTooltip {...props} label={label ?? props.label} colors={colors} />
                  }}
                />
                <Legend wrapperStyle={{ fontWeight: 800, fontSize: 13 }} />
                <Bar
                  dataKey="mensajes"
                  name="Mensajes"
                  fill={colors.pending}
                  radius={[0, 6, 6, 0]}
                />
                <Bar dataKey="tutor" name="Tutor" fill={colors.studying} radius={[0, 6, 6, 0]} />
                <Bar
                  dataKey="desafios"
                  name="Desafíos"
                  fill={colors.danger}
                  radius={[0, 6, 6, 0]}
                />
                <Bar
                  dataKey="transcripciones"
                  name="Transcripciones"
                  fill={colors.voice}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <h2>Llamadas por tipo</h2>
        </div>
        <div className="admin-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kindRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.muted, fontSize: 12, fontWeight: 800 }}
                axisLine={{ stroke: colors.line }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={tooltip} {...tooltipUi} />
              <Bar dataKey="calls" name="Llamadas" radius={[8, 8, 0, 0]}>
                {kindRows.map((row) => (
                  <Cell key={row.kind} fill={kindFill(row.kind)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {showByStudent && (
        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>Quién avanzó</h2>
            <p className="muted">Estudio, tareas terminadas y desafíos del período</p>
          </div>
          <div
            className="admin-chart"
            style={{ height: Math.max(260, byStudent.length * 44 + 56) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byStudent}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                barCategoryGap={8}
              >
                <CartesianGrid stroke={colors.line} strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: colors.muted, fontSize: 12, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fill: colors.ink, fontSize: 12, fontWeight: 800 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipUi}
                  content={(props) => {
                    const label = byStudent.find(
                      (row) => row.name === props.label,
                    )?.fullName
                    return <ChartTooltip {...props} label={label ?? props.label} colors={colors} />
                  }}
                />
                <Legend wrapperStyle={{ fontWeight: 800, fontSize: 13 }} />
                <Bar dataKey="estudio" name="Estudio" fill={colors.studying} radius={[0, 6, 6, 0]} />
                <Bar dataKey="tareas" name="Tareas" fill={colors.accent} radius={[0, 6, 6, 0]} />
                <Bar dataKey="desafios" name="Desafíos" fill={colors.danger} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className={`admin-panel${showByStudent ? '' : ' admin-panel--wide'}`}>
        <div className="admin-section-head">
          <h2>Necesitan seguimiento</h2>
          <p className="muted">Atrasos o más de {IDLE_DAYS} días sin estudiar</p>
        </div>
        {followup.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle}
            title="Todo al día"
            description="Nadie tiene atrasos ni lleva varios días sin estudiar."
          />
        ) : (
          <ul className="admin-followup">
            {followup.map(({ row, reason }) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="admin-followup-row"
                  onClick={() => onOpenStudent(row.id)}
                >
                  <span className="admin-followup-name">
                    <strong>{row.username}</strong>
                    <span className="admin-table-sub">{row.email}</span>
                  </span>
                  <span className="admin-followup-meta">
                    {reason.overdue > 0 && (
                      <span className="admin-pill is-warn">
                        {reason.overdue} atrasada{reason.overdue === 1 ? '' : 's'}
                      </span>
                    )}
                    {reason.neverStudied && (
                      <span className="admin-pill is-muted">Nunca estudió</span>
                    )}
                    {!reason.neverStudied && reason.idle != null && reason.idle >= IDLE_DAYS && (
                      <span className="admin-pill is-muted">
                        {reason.idle} días sin estudiar
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
