import { useEffect, useState } from 'react'
import { GlobeHemisphereWest, Plus } from '@phosphor-icons/react'
import { api } from '../../api'
import { CreateWorldModal } from '../../components/worlds/CreateWorldModal'
import { WorldsCoverCard } from '../../components/worlds/WorldsCoverCard'
import { WorldsCoverGrid, WorldsCoverItem } from '../../components/worlds/WorldsCoverGrid'
import { WorldsEmptyState } from '../../components/worlds/WorldsEmptyState'
import { WorldsHero } from '../../components/worlds/WorldsHero'
import { WorldsNav } from '../../components/worlds/WorldsNav'
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
      <WorldsNav backLabel="Tablero" onBack={onBack} />

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <WorldsHero
          icon={GlobeHemisphereWest}
          title="Mundos"
          lead="Elige un mundo para estudiar… o crea uno nuevo."
          actions={
            worlds.length > 0 ? (
              <button type="button" className="primary" onClick={() => setModalOpen(true)}>
                <Plus size={18} weight="bold" />
                Nuevo mundo
              </button>
            ) : null
          }
        />

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

        <WorldsCoverGrid>
          {worlds.map((world, index) => (
            <WorldsCoverItem
              key={world.id}
              index={index}
              delayStep={0.05}
              delayCap={0.28}
              duration={0.28}
              y={16}
              scale={0.96}
            >
              <WorldsCoverCard
                kind="world"
                icon={GlobeHemisphereWest}
                title={world.title}
                description={world.description}
                hint="Entrar"
                onClick={() => onOpenWorld(world.id)}
              />
            </WorldsCoverItem>
          ))}
        </WorldsCoverGrid>
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
