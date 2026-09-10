import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AccentId =
  | 'blue'
  | 'teal'
  | 'green'
  | 'amber'
  | 'rose'
  | 'pink'
  | 'violet'

export const ACCENTS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Azul', swatch: '#2563eb' },
  { id: 'teal', label: 'Turquesa', swatch: '#0d9488' },
  { id: 'green', label: 'Verde', swatch: '#16a34a' },
  { id: 'amber', label: 'Ámbar', swatch: '#d97706' },
  { id: 'rose', label: 'Fresa', swatch: '#e11d48' },
  { id: 'pink', label: 'Rosa', swatch: '#db2777' },
  { id: 'violet', label: 'Violeta', swatch: '#7c3aed' },
]

const STORAGE_KEY = 'taskia-accent'

interface AccentContextValue {
  accent: AccentId
  setAccent: (id: AccentId) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

function getInitialAccent(): AccentId {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (ACCENTS.some((a) => a.id === saved)) return saved as AccentId
  return 'blue'
}

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(getInitialAccent)

  useEffect(() => {
    document.documentElement.dataset.accent = accent
    localStorage.setItem(STORAGE_KEY, accent)
  }, [accent])

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id)
  }, [])

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent])

  return (
    <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
  )
}

export function useAccent() {
  const ctx = useContext(AccentContext)
  if (!ctx) throw new Error('useAccent debe usarse dentro de AccentProvider')
  return ctx
}
