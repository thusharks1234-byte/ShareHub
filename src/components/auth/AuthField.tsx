import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  error?: string
  id: string
  label: string
  passwordToggle?: boolean
}

export function AuthField({ error, id, label, passwordToggle = false, ...props }: AuthFieldProps) {
  const [visible, setVisible] = useState(false)
  const type = passwordToggle ? (visible ? 'text' : 'password') : props.type

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className={`auth-field__control ${error ? 'auth-field__control--error' : ''}`}>
        <input aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} id={id} {...props} type={type} />
        {passwordToggle ? (
          <button
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="auth-field__toggle"
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
          </button>
        ) : null}
      </div>
      {error ? <p className="auth-field__error" id={`${id}-error`}>{error}</p> : null}
    </div>
  )
}
