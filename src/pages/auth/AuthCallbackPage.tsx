import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { AuthShell } from '../../components/auth/AuthShell'
import { getCurrentProfile } from '../../services/profiles.service'

export function AuthCallbackPage() {
  const { loading, user } = useAuth()
  const [params] = useSearchParams()
  const authError = params.has('error') || params.has('error_description')
  const [profileState, setProfileState] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking')

  useEffect(() => {
    if (loading || authError || !user) return
    let current = true
    getCurrentProfile()
      .then((profile) => {
        if (current) setProfileState(profile ? 'ready' : 'missing')
      })
      .catch(() => {
        if (current) setProfileState('error')
      })
    return () => { current = false }
  }, [authError, loading, user])

  if (loading) {
    return <AuthShell description="Confirming your ShareHub email." title="One moment">
      <div className="auth-loading" role="status">Processing the secure link…</div>
    </AuthShell>
  }

  if (authError || !user || profileState === 'missing' || profileState === 'error') {
    const profileProblem = profileState === 'missing' || profileState === 'error'
    return (
      <AuthShell description={profileProblem ? 'Your email is confirmed, but account setup needs attention.' : 'The verification link may have expired or already been used.'} eyebrow="Email verification" title={profileProblem ? 'Profile setup needs attention' : 'We couldn’t verify this link'}>
        <div className="auth-confirmation">
          <span className="auth-confirmation__icon auth-confirmation__icon--error"><CircleAlert aria-hidden="true" size={27} /></span>
          <p>{profileProblem ? 'Your email was confirmed, but we could not verify that your ShareHub profile is ready. Please contact support before trying to register again.' : 'Return to sign in and request a new verification email if you still need one.'}</p>
          <Link className="button auth-submit" to="/login">Continue to log in</Link>
        </div>
      </AuthShell>
    )
  }

  if (profileState === 'checking') {
    return <AuthShell description="Confirming your profile was created securely." title="One moment">
      <div className="auth-loading" role="status">Checking your ShareHub profile…</div>
    </AuthShell>
  }

  return (
    <AuthShell description="Your email address has been confirmed." eyebrow="Email verified" title="Welcome to ShareHub">
      <div className="auth-confirmation">
        <span className="auth-confirmation__icon"><CheckCircle2 aria-hidden="true" size={27} /></span>
        <p>Your account is ready. Your profile was created from your registration details.</p>
        <Link className="button auth-submit" to="/dashboard">Continue to your account</Link>
      </div>
    </AuthShell>
  )
}
