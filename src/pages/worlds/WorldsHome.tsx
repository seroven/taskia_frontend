import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, GlobeHemisphereWest, Plus } from '@phosphor-icons/react'
import { api } from '../../api'
import { ExpandIconButton } from '../../components/ExpandIconButton'
import { CreateWorldModal } from '../../components/worlds/CreateWorldModal'
import { WorldsCoverCard } from '../../components/worlds/WorldsCoverCard'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { WorldsIconBadge } from '../../components/worlds/WorldsIconBadge'
import { AppearanceTools } from '../../components/AppearanceTools'
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
        <ExpandIconButton
          className="worlds-back"
          icon={ArrowLeft}
          label="Tablero"
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
            <h1 className="worlds-hero-title">Mundos</h1>
            <p className="worlds-hero-lead">
              Elige un mundo para estudiar… o crea uno nuevo.
            </p>
          </div>
          {worlds.length > 0 && (
            <div className="worlds-hero-actions">
              <button type="button" className="primary" onClick={() => setModalOpen(true)}>
                <Plus size={18} weight="bold" />
                Nuevo mundo
              </button>
            </div>
          )}
        </header>

        {loading && <p className="muted worlds-center-text">Cargando mundos…</p>}

        {!loading && worlds.length === 0 && (
          <WorldsEmptyState
            icon={GlobeHemisphereWest}
            title="Tu primer Mundo"
            description="Aquí viven tus cursos y misiones. Empieza con uno y listo."
            action={
              <button type="button" className="primary" onClick={() => setModalOpen(true)}>
                <Plus size={20} weight="bold" />
                Crear mundo
              </button>
            }
          />
        )}

        <AnimatePresence>
          <ul className="worlds-cover-grid">
            {worlds.map((world, index) => (
              <motion.li
                key={world.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.28), duration: 0.28 }}
              >
                <WorldsCoverCard
                  kind="world"
                  icon={GlobeHemisphereWest}
                  title={world.title}
                  description={world.description}
                  hint="Entrar"
                  onClick={() => onOpenWorld(world.id)}
                />
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
