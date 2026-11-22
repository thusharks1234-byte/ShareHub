import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthField } from '../../components/auth/AuthField'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../auth/useAuth'
import { isValidEmail, normalizeEmail } from '../../auth/validation'
import { getAuthErrorMessage, resendSignupVerification, signInWithEmail } from '../../services/auth.service'
import { setRememberMe } from '../../lib/supabase/client'

interface LoginLocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { loading: authLoading, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LoginLocationState | null
  const requestedPath = state?.from?.pathname
  const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [notice, setNotice] = useState('')

  if (authLoading) {
    return <AuthShell description="Restoring your secure ShareHub session." title="One moment">
      <div className="auth-loading" role="status">Checking your session…</div>
    </AuthShell>
  }
  if (user) return <Navigate replace to={destination} />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setNeedsVerification(false)

    const normalizedEmail = normalizeEmail(email)
    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailError('')
    if (!password) {
      setError('Enter your password to continue.')
      return
    }

    setSubmitting(true)
    try {
      setRememberMe(remember)
      const result = await signInWithEmail(normalizedEmail, password)
      if (!result.session) throw new Error('Your sign-in could not be completed.')
      setPassword('')
      navigate(destination, { replace: true })
    } catch (cause) {
      const mapped = getAuthErrorMessage(cause)
      setError(mapped)
      setNeedsVerification(mapped === 'Please verify your email before signing in.')
    } finally {
      setSubmitting(false)
    }
  }

  async function resendVerification() {
    setResending(true)
    setNotice('')
    setError('')
    try {
      await resendSignupVerification(email)
      setNotice('If the account needs verification, a new link is on its way.')
    } catch (cause) {
      setError(getAuthErrorMessage(cause))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      description="Sign in to pick up where your neighbourhood sharing left off."
      eyebrow="Welcome back"
      title="Log in to ShareHub"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error ? <div className="auth-alert auth-alert--error" role="alert">{error}</div> : null}
        {notice ? <div className="auth-alert auth-alert--success" role="status">{notice}</div> : null}
        <AuthField
          autoComplete="email"
          error={emailError}
          id="login-email"
          label="Email address"
          name="email"
          onChange={(event) => { setEmail(event.currentTarget.value); setEmailError('') }}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <AuthField
          autoComplete="current-password"
          id="login-password"
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          passwordToggle
          placeholder="Enter your password"
          required
          value={password}
        />
        <div className="auth-form__row">
          <label className="auth-check">
            <input checked={remember} onChange={(event) => setRemember(event.currentTarget.checked)} type="checkbox" />
            <span>Remember me</span>
          </label>
          <Link className="auth-inline-link" to="/forgot-password">Forgot password?</Link>
        </div>
        <Button className="auth-submit" disabled={submitting} type="submit">
          {submitting ? 'Signing in…' : 'Log in'}
        </Button>
        {needsVerification ? (
          <button className="auth-resend" disabled={resending} onClick={resendVerification} type="button">
            {resending ? 'Sending verification link…' : 'Resend verification email'}
          </button>
        ) : null}
        <p className="auth-switch">New to ShareHub? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  )
}
