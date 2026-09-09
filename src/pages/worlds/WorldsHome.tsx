import { useEffect, useState } from 'react'
import { api } from '../../api'
import { CreateWorldModal } from '../../components/worlds/CreateWorldModal'
import { AccentPicker } from '../../components/AccentPicker'
import { ThemeToggle } from '../../components/ThemeToggle'
import { errorMessage } from '../../lib/errors'
import type { StudyWorld } from '../../lib/worldsTypes'
import { useToast } from '../../toast'

interface Props {
  onBack: () => void
  onOpenWorld: (worldId: number) => void
}

export function WorldsHome({ onBack, onOpenWorld }: Props) {
  const { showToast } = useToast()
  const [worlds, setWorlds] = useState<StudyWorld[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function refresh() {
    const list = await api.listWorlds()
    setWorlds(list)
  }

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
  }, [])

  return (
    <div className="worlds-shell">
      <header className="topbar">
        <div>
          <button type="button" className="ghost worlds-back" onClick={onBack}>
            ← Tablero
          </button>
          <p className="brand">Mundos</p>
          <p className="welcome">Elige un mundo o crea uno nuevo para estudiar.</p>
        </div>
        <div className="topbar-actions">
          <AccentPicker />
          <ThemeToggle />
          <button type="button" className="primary" onClick={() => setModalOpen(true)}>
            Nuevo mundo
          </button>
        </div>
      </header>

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content">
        {loading && <p className="muted">Cargando mundos…</p>}
        {!loading && worlds.length === 0 && (
          <div className="worlds-empty">
            <h2>Crea tu primer Mundo</h2>
            <p className="muted">
              Un mundo agrupa materias y misiones. Después podrás estudiar temas y lanzar desafíos.
            </p>
            <button type="button" className="primary" onClick={() => setModalOpen(true)}>
              Crear mundo
            </button>
          </div>
        )}
        <ul className="worlds-list">
          {worlds.map((world) => (
            <li key={world.id}>
              <button
                type="button"
                className="worlds-row"
                onClick={() => onOpenWorld(world.id)}
              >
                <span className="worlds-row-title">{world.title}</span>
                {world.description && (
                  <span className="worlds-row-desc muted">{world.description}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <CreateWorldModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={async (title, description) => {
          const world = await api.createWorld(title, description)
          await refresh()
          showToast({
            tone: 'success',
            title: 'Mundo creado',
            subtitle: world.title,
          })
          onOpenWorld(world.id)
        }}
      />
    </div>
  )
}
