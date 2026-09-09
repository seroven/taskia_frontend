import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { ACCENTS, useAccent } from '../accent'

export function AccentPicker() {
  const { accent, setAccent } = useAccent()

  return (
    <div className="accent-picker" role="group" aria-label="Color de la app">
      {ACCENTS.map((item) => (
        <motion.button
          key={item.id}
          type="button"
          className={`accent-swatch${accent === item.id ? ' is-active' : ''}`}
          style={{ '--swatch': item.swatch } as CSSProperties}
          aria-label={item.label}
          aria-pressed={accent === item.id}
          title={item.label}
          onClick={() => setAccent(item.id)}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.08 }}
        />
      ))}
    </div>
  )
}
