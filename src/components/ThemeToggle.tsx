import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from '../theme'
import { ExpandIconButton } from './ExpandIconButton'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <ExpandIconButton
      icon={isDark ? Sun : Moon}
      label={isDark ? 'Claro' : 'Oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
    />
  )
}
