import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Field } from './Field'
import { useAnchoredPopoverStyle } from './useAnchoredPopoverStyle'

export interface SelectOption {
  value: string
  label: string
  keywords?: string
}

interface Props {
  label: string
  value: string
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  onChange: (value: string) => void
}

export function SelectField({
  label,
  value,
  options,
  placeholder = 'Selecciona…',
  required = false,
  className = '',
  searchable = false,
  searchPlaceholder = 'Buscar…',
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const searchId = useId()
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => {
      if (!option.value) return false
      const haystack = `${option.label} ${option.keywords ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [options, query])
  const { style, placement } = useAnchoredPopoverStyle({
    open,
    anchorRef: triggerRef,
    estimatedHeight: Math.min(
      280,
      (searchable ? 56 : 0) + 48 + Math.min(filtered.length, 6) * 48,
    ),
  })

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    if (searchable) {
      const id = window.requestAnimationFrame(() => searchRef.current?.focus())
      return () => window.cancelAnimationFrame(id)
    }
  }, [open, searchable])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
    }
  }

  return (
    <Field label={label} className={className}>
      <div className={`select-field${open ? ' is-open' : ''}`} ref={rootRef}>
        <button
          ref={triggerRef}
          type="button"
          className={`field-control select-trigger${open ? ' is-open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onTriggerKeyDown}
        >
          <span className={selected ? 'select-value' : 'select-placeholder'}>
            {selected?.label ?? placeholder}
          </span>
          <span className="select-chevron" aria-hidden>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <input
          className="select-native-mirror"
          tabIndex={-1}
          aria-hidden
          required={required}
          value={value}
          onChange={() => undefined}
        />

        {createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                id={listId}
                role="listbox"
                className={`select-menu popover-layer placement-${placement}${searchable ? ' has-search' : ''}`}
                style={style}
                initial={{
                  opacity: 0,
                  y: placement === 'down' ? -6 : 6,
                  scale: 0.98,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: placement === 'down' ? -4 : 4,
                  scale: 0.98,
                }}
                transition={{ duration: 0.16 }}
              >
                {searchable && (
                  <div className="select-search">
                    <input
                      ref={searchRef}
                      id={searchId}
                      type="search"
                      value={query}
                      placeholder={searchPlaceholder}
                      autoComplete="off"
                      aria-label={searchPlaceholder}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </div>
                )}
                {filtered.length === 0 ? (
                  <p className="select-search-empty">Sin coincidencias</p>
                ) : (
                  filtered.map((option) => {
                    const active = option.value === value
                    return (
                      <button
                        key={option.value || '__empty'}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`select-option${active ? ' is-active' : ''}`}
                        onClick={() => {
                          onChange(option.value)
                          setOpen(false)
                        }}
                      >
                        {option.label}
                      </button>
                    )
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </div>
    </Field>
  )
}
