export function StudyBoardToggle({
  usesBoard,
  disabled,
  onChange,
}: {
  usesBoard: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="study-mode-toggle" role="group" aria-label="Pizarra">
      <button
        type="button"
        className={!usesBoard ? 'active' : ''}
        disabled={disabled}
        aria-pressed={!usesBoard}
        onClick={() => onChange(false)}
      >
        Chat
      </button>
      <button
        type="button"
        className={usesBoard ? 'active' : ''}
        disabled={disabled}
        aria-pressed={usesBoard}
        onClick={() => onChange(true)}
      >
        Pizarra
      </button>
    </div>
  )
}
