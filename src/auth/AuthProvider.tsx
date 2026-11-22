import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [recoveryMode, setRecoveryMode] = useState(false)
  const user: User | null = session?.user ?? null

  useEffect(() => {
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT') setRecoveryMode(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    clearRecoveryMode: () => setRecoveryMode(false),
    loading,
    recoveryMode,
    session,
    signOut: async () => {
      if (!supabase) throw new Error('Supabase is not configured.')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    user,
  }), [loading, recoveryMode, session, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
