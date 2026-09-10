import { motion } from 'framer-motion'

type AppLoaderProps = {
  message: string
  variant?: 'page' | 'section'
}

export function AppLoader({ message, variant = 'page' }: AppLoaderProps) {
  return (
    <motion.div
      className={`app-loader app-loader--${variant}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="app-loader-card">
        <span className="app-loader-spinner" aria-hidden />
        <p>{message}</p>
      </div>
    </motion.div>
  )
}
