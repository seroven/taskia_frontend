import { STATUS_COLUMNS } from '../../types'

export function formatWhen(value: string | null | undefined) {
  if (!value) return '—'
  const raw = value.includes('T') ? value : value.replace(' ', 'T')
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDay(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function taskStatusLabel(status: string) {
  return STATUS_COLUMNS.find((column) => column.id === status)?.label ?? status
}

export const STUDY_KIND_LABEL: Record<string, string> = {
  task: 'Tarea',
  mission: 'Tema',
}
