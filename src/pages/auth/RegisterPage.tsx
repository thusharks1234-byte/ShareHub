import { CheckCircle2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { isValidEmail, normalizeEmail, passwordStrengthError } from '../../auth/validation'
import { AuthField } from '../../components/auth/AuthField'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui/Button'
import { getAuthErrorMessage, resendSignupVerification, signUpWithEmail } from '../../services/auth.service'

export function RegisterPage() {
  const { loading: authLoading, user } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (authLoading) {
    return <AuthShell description="Restoring your secure ShareHub session." title="One moment">
      <div className="auth-loading" role="status">Checking your session…</div>
    </AuthShell>
  }
  if (user) return <Navigate replace to="/dashboard" />

  function validateForm() {
    const errors: Record<string, string> = {}
    if (fullName.trim().length < 2 || fullName.trim().length > 80) errors.fullName = 'Enter a name between 2 and 80 characters.'
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
    const passwordError = passwordStrengthError(password)
    if (passwordError) errors.password = passwordError
    if (password !== confirmPassword) errors.confirmPassword = 'Your passwords do not match.'
    if (!acceptedTerms) errors.terms = 'Please accept the Terms and Conditions to continue.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const result = await signUpWithEmail(fullName, normalizeEmail(email), password)
      setPassword('')
      setConfirmPassword('')
      if (result.confirmationRequired) {
        setRegisteredEmail(normalizeEmail(email))
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (cause) {
      setError(getAuthErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  async function resendVerification() {
    setResending(true)
    setError('')
    setNotice('')
    try {
      await resendSignupVerification(registeredEmail)
      setNotice('If the account needs verification, a new link is on its way.')
    } catch (cause) {
      setError(getAuthErrorMessage(cause))
    } finally {
      setResending(false)
    }
  }

  if (registeredEmail) {
    return (
      <AuthShell description="One quick step before you can sign in." eyebrow="Check your inbox" title="Verify your email">
        <div className="auth-confirmation">
          <span className="auth-confirmation__icon"><CheckCircle2 aria-hidden="true" size={27} /></span>
          <p>We sent a verification link to <strong>{registeredEmail}</strong>. Open it to confirm your address, then come back to log in.</p>
          {error ? <div className="auth-alert auth-alert--error" role="alert">{error}</div> : null}
          {notice ? <div className="auth-alert auth-alert--success" role="status">{notice}</div> : null}
          <Button className="auth-submit" onClick={() => navigate('/login', { replace: true })}>Continue to log in</Button>
          <button className="auth-resend" disabled={resending} onClick={resendVerification} type="button">
            {resending ? 'Sending verification link…' : 'Resend verification email'}
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      description="Create your account to connect with people sharing useful things nearby."
      eyebrow="Join your community"
      title="Create your account"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error ? <div className="auth-alert auth-alert--error" role="alert">{error}</div> : null}
        <AuthField
          autoComplete="name"
          error={fieldErrors.fullName}
          id="register-name"
          label="Full name"
          maxLength={80}
          name="name"
          onChange={(event) => { setFullName(event.currentTarget.value); setFieldErrors((old) => ({ ...old, fullName: '' })) }}
          placeholder="Your name"
          required
          value={fullName}
        />
        <AuthField
          autoComplete="email"
          error={fieldErrors.email}
          id="register-email"
          label="Email address"
          name="email"
          onChange={(event) => { setEmail(event.currentTarget.value); setFieldErrors((old) => ({ ...old, email: '' })) }}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <AuthField
          autoComplete="new-password"
          error={fieldErrors.password}
          id="register-password"
          label="Password"
          name="new-password"
          onChange={(event) => { setPassword(event.currentTarget.value); setFieldErrors((old) => ({ ...old, password: '' })) }}
          passwordToggle
          placeholder="At least 8 characters"
          required
          value={password}
        />
        <p className="auth-password-hint">Use 8+ characters with an uppercase letter, a lowercase letter, and a number.</p>
        <AuthField
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          id="register-confirm-password"
          label="Confirm password"
          name="confirm-password"
          onChange={(event) => { setConfirmPassword(event.currentTarget.value); setFieldErrors((old) => ({ ...old, confirmPassword: '' })) }}
          passwordToggle
          placeholder="Enter your password again"
          required
          value={confirmPassword}
        />
        <div>
          <label className="auth-check auth-check--terms">
            <input checked={acceptedTerms} onChange={(event) => { setAcceptedTerms(event.currentTarget.checked); setFieldErrors((old) => ({ ...old, terms: '' })) }} type="checkbox" />
            <span>I accept the <strong>Terms and Conditions</strong>.</span>
          </label>
          {fieldErrors.terms ? <p className="auth-field__error" role="alert">{fieldErrors.terms}</p> : null}
        </div>
        <Button className="auth-submit" disabled={submitting} type="submit">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </AuthShell>
  )
}
