import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

export function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function TextField({
  label,
  className = '',
  ...props
}: {
  label: string
  className?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} className={className}>
      <input className="field-control" {...props} />
    </Field>
  )
}

export function PasswordField({
  label,
  className = '',
  ...props
}: {
  label: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <Field label={label} className={className}>
      <div className="password-field">
        <input
          className="field-control password-field-control"
          type={visible ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setVisible((v) => !v)
          }}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
              <path
                d="M3 3l18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M9.9 5.2A10.4 10.4 0 0 1 12 5c5 0 8.5 3.4 10 7-.4.9-1 1.8-1.7 2.6M6.7 6.7C4.7 8 3.4 9.8 2 12c1.5 3.6 5 7 10 7 1.4 0 2.7-.3 3.9-.7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
              <path
                d="M2 12c1.5-3.6 5-7 10-7s8.5 3.4 10 7c-1.5 3.6-5 7-10 7s-8.5-3.4-10-7z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
        </button>
      </div>
    </Field>
  )
}

export function TextAreaField({
  label,
  className = '',
  ...props
}: {
  label: string
  className?: string
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} className={className}>
      <textarea className="field-control field-control--area" {...props} />
    </Field>
  )
}
