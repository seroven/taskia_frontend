import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, GlobeHemisphereWest, Plus } from '@phosphor-icons/react'
import { api } from '../../api'
import { CreateWorldModal } from '../../components/worlds/CreateWorldModal'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
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
      <nav className="worlds-nav">
        <button type="button" className="ghost worlds-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Tablero
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
          <h1 className="worlds-hero-title">Mundos</h1>
          <p className="worlds-hero-lead">
            Elige un mundo para estudiar… o crea uno nuevo.
          </p>
          {worlds.length > 0 && (
            <button type="button" className="primary" onClick={() => setModalOpen(true)}>
              <Plus size={18} weight="bold" />
              Nuevo mundo
            </button>
          )}
        </header>

        {loading && <p className="muted worlds-center-text">Cargando mundos…</p>}

        {!loading && worlds.length === 0 && (
          <WorldsEmptyState
            icon={GlobeHemisphereWest}
            title="Tu primer Mundo"
            description="Aquí viven tus materias y misiones. Empieza con uno y listo."
            action={
              <button type="button" className="primary" onClick={() => setModalOpen(true)}>
                <Plus size={20} weight="bold" />
                Crear mundo
              </button>
            }
          />
        )}

        <AnimatePresence>
          <ul className="worlds-tile-grid">
            {worlds.map((world, index) => (
              <motion.li
                key={world.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.28), duration: 0.24 }}
              >
                <button
                  type="button"
                  className="worlds-tile worlds-tile--card"
                  onClick={() => onOpenWorld(world.id)}
                >
                  <WorldsIconBadge icon={GlobeHemisphereWest} size="lg" />
                  <span className="worlds-tile-body">
                    <span className="worlds-tile-title">{world.title}</span>
                    {world.description && (
                      <span className="worlds-tile-desc muted">{world.description}</span>
                    )}
                    <span className="worlds-tile-hint">Entrar</span>
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
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
