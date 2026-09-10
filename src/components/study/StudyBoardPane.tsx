import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from '@phosphor-icons/react'

function useMobileStudy(maxWidth = 900) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${maxWidth}px)`).matches
      : false,
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const onChange = () => setMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [maxWidth])

  return mobile
}

export function StudyBoardPane({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const mobile = useMobileStudy()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 340)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [open, onClose])

  const pane = (
    <div className={`study-board-pane${open ? ' is-open' : ''}`}>
      <div className="study-board-mobile-bar">
        <button type="button" className="ghost" onClick={onClose}>
          <ArrowLeft size={18} weight="bold" />
          Chat
        </button>
        <p className="study-board-mobile-title">Pizarra</p>
      </div>
      <div className="study-board-canvas">{children}</div>
    </div>
  )

  if (mobile) return createPortal(pane, document.body)
  return pane
}
