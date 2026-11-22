import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { passwordStrengthError } from '../../auth/validation'
import { AuthField } from '../../components/auth/AuthField'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui/Button'
import { getAuthErrorMessage, setNewPassword } from '../../services/auth.service'

export function ResetPasswordPage() {
  const { clearRecoveryMode, loading: authLoading, recoveryMode, user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updated, setUpdated] = useState(false)

  if (authLoading) {
    return <AuthShell description="Checking your secure recovery link." title="One moment">
      <div className="auth-loading" role="status">Validating reset link…</div>
    </AuthShell>
  }

  if (updated) {
    return (
      <AuthShell description="Your new password is saved." eyebrow="Password updated" title="You’re all set">
        <div className="auth-confirmation">
          <p>Your password has been changed. You can now continue to your ShareHub account.</p>
          <Button className="auth-submit" onClick={() => navigate('/dashboard', { replace: true })}>Continue to ShareHub</Button>
        </div>
      </AuthShell>
    )
  }

  if (!recoveryMode) {
    if (user && !updated) return <Navigate replace to="/dashboard" />
    return (
      <AuthShell description="Password recovery links can only be used once and may expire." eyebrow="Secure recovery" title="This link is no longer active">
        <div className="auth-confirmation">
          <p>Request a fresh password reset link to continue.</p>
          <Link className="button auth-submit" to="/forgot-password">Request a new link</Link>
        </div>
      </AuthShell>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const strengthError = passwordStrengthError(password)
    if (strengthError) {
      setError(strengthError)
      return
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await setNewPassword(password)
      setPassword('')
      setConfirmPassword('')
      setUpdated(true)
      clearRecoveryMode()
    } catch (cause) {
      setError(getAuthErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell description="Choose a strong password you have not used for another account." eyebrow="Secure recovery" title="Set a new password">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error ? <div className="auth-alert auth-alert--error" role="alert">{error}</div> : null}
        <AuthField
          autoComplete="new-password"
          id="reset-password"
          label="New password"
          name="new-password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          passwordToggle
          placeholder="At least 8 characters"
          required
          value={password}
        />
        <p className="auth-password-hint">Use 8+ characters with an uppercase letter, a lowercase letter, and a number.</p>
        <AuthField
          autoComplete="new-password"
          id="reset-confirm-password"
          label="Confirm new password"
          name="confirm-password"
          onChange={(event) => setConfirmPassword(event.currentTarget.value)}
          passwordToggle
          placeholder="Enter your new password again"
          required
          value={confirmPassword}
        />
        <Button className="auth-submit" disabled={submitting} type="submit">
          {submitting ? 'Updating password…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  )
}
