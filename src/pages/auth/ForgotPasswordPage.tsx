import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthField } from '../../components/auth/AuthField'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui/Button'
import { isValidEmail, normalizeEmail } from '../../auth/validation'
import { getAuthErrorMessage, requestPasswordRecovery } from '../../services/auth.service'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailError('')
    setError('')
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      await requestPasswordRecovery(normalizeEmail(email))
      setSent(true)
    } catch (cause) {
      setError(getAuthErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      description="Enter the email address on your account and we’ll send a secure password reset link."
      eyebrow="Account recovery"
      title={sent ? 'Check your inbox' : 'Forgot your password?'}
    >
      {sent ? (
        <div className="auth-confirmation">
          <p>If an account exists for <strong>{normalizeEmail(email)}</strong>, a password reset link is on its way.</p>
          <p className="auth-muted">The link opens a secure ShareHub page where you can choose a new password.</p>
          <Link className="button auth-submit" to="/login">Back to log in</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error ? <div className="auth-alert auth-alert--error" role="alert">{error}</div> : null}
          <AuthField
            autoComplete="email"
            error={emailError}
            id="recovery-email"
            label="Email address"
            name="email"
            onChange={(event) => { setEmail(event.currentTarget.value); setEmailError('') }}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <Button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? 'Sending link…' : 'Send reset link'}
          </Button>
          <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
        </form>
      )}
    </AuthShell>
  )
}
