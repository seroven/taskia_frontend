import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Icon } from '@phosphor-icons/react'
import { WorldsIconBadge } from './WorldsIconBadge'

export function WorldsModalShell({
  open,
  onClose,
  titleId,
  title,
  lead,
  icon,
  wide = false,
  children,
}: {
  open: boolean
  onClose: () => void
  titleId: string
  title: string
  lead: ReactNode
  icon: Icon
  wide?: boolean
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`modal-panel${wide ? ' modal-panel-wide' : ''}`}
            role="dialog"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-panel-header worlds-modal-header">
              <WorldsIconBadge icon={icon} size="lg" />
              <div>
                <h2 id={titleId}>{title}</h2>
                <p className="lede">{lead}</p>
              </div>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
