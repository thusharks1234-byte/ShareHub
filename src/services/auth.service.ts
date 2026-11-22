import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabase/client'
import { normalizeEmail } from '../auth/validation'

function getCallbackUrl(path: '/auth/callback' | '/reset-password'): string {
  return new URL(path, window.location.origin).toString()
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.'

  const authError = error as Error & { code?: string; status?: number }
  const message = error.message.toLowerCase()
  if (authError.code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please verify your email before signing in.'
  }
  if (authError.code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'The email or password is incorrect.'
  }
  if (authError.code === 'user_already_exists' || authError.code === 'email_exists') {
    return 'An account with this email may already exist. Try signing in or resetting your password.'
  }
  if (authError.name === 'AuthRetryableFetchError' || authError.status === 0) {
    return 'Unable to reach ShareHub right now. Check your connection and try again.'
  }
  if (message.includes('password should be')) return 'Choose a stronger password and try again.'
  if (message.includes('rate limit')) return 'Too many requests. Wait a little and try again.'
  return 'We could not complete that request. Please try again.'
}

export interface SignUpResult {
  confirmationRequired: boolean
  user: User
}

export async function signUpWithEmail(displayName: string, email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: getCallbackUrl('/auth/callback'),
    },
  })

  if (error) throw error
  if (!data.user) throw new Error('The account could not be created. Please try again.')
  if (data.user.identities?.length === 0) {
    const duplicate = new Error('An account with this email may already exist.') as Error & { code: string }
    duplicate.code = 'user_already_exists'
    throw duplicate
  }

  return { confirmationRequired: !data.session, user: data.user }
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })
  if (error) throw error
  return data
}

export async function resendSignupVerification(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email: normalizeEmail(email),
    options: { emailRedirectTo: getCallbackUrl('/auth/callback') },
  })
  if (error) throw error
}

export async function requestPasswordRecovery(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    normalizeEmail(email),
    { redirectTo: getCallbackUrl('/reset-password') },
  )
  if (error) throw error
}

export async function setNewPassword(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password })
  if (error) throw error
}
