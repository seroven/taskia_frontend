import { ArrowLeft } from '@phosphor-icons/react'
import { ExpandIconButton } from '../ExpandIconButton'
import { AppearanceTools } from '../AppearanceTools'

export function WorldsNav({
  backLabel,
  onBack,
  showAppearance = true,
}: {
  backLabel: string
  onBack: () => void
  showAppearance?: boolean
}) {
  return (
    <nav className="worlds-nav">
      <ExpandIconButton
        className="worlds-back"
        icon={ArrowLeft}
        label={backLabel}
        weight="bold"
        onClick={onBack}
      />
      {showAppearance && (
        <div className="worlds-nav-tools">
          <AppearanceTools />
        </div>
      )}
    </nav>
  )
}
