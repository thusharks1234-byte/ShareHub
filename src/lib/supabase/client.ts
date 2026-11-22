import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

let sessionOnly = false

const authStorage = {
  getItem(storageKey: string) {
    if (typeof window === 'undefined') return null
    const localValue = window.localStorage.getItem(storageKey)
    const sessionValue = window.sessionStorage.getItem(storageKey)
    if (!localValue && sessionValue) sessionOnly = true
    return localValue ?? sessionValue
  },
  setItem(storageKey: string, value: string) {
    if (typeof window === 'undefined') return
    const destination = sessionOnly ? window.sessionStorage : window.localStorage
    const other = sessionOnly ? window.localStorage : window.sessionStorage
    destination.setItem(storageKey, value)
    other.removeItem(storageKey)
  },
  removeItem(storageKey: string) {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(storageKey)
    window.sessionStorage.removeItem(storageKey)
  },
}

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: authStorage,
      },
    })
  : null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).',
    )
  }
  return supabase
}

export function setRememberMe(rememberMe: boolean) {
  sessionOnly = !rememberMe
  if (!url || typeof window === 'undefined') return

  const projectRef = new URL(url).hostname.split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`
  const currentValue = window.localStorage.getItem(storageKey) ?? window.sessionStorage.getItem(storageKey)
  if (!currentValue) return

  const destination = rememberMe ? window.localStorage : window.sessionStorage
  const other = rememberMe ? window.sessionStorage : window.localStorage
  destination.setItem(storageKey, currentValue)
  other.removeItem(storageKey)
}
