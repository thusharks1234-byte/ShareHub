import { getSupabaseClient } from '../lib/supabase/client'
import type { Tables, TablesUpdate } from '../types/database.types'

export type ProfileRecord = Tables<'profiles'>
export type ProfileUpdate = Pick<
  TablesUpdate<'profiles'>,
  'display_name' | 'avatar_path' | 'bio' | 'city' | 'locality'
>

export async function getCurrentProfile(): Promise<ProfileRecord | null> {
  const client = getSupabaseClient()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) return null

  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, avatar_path, bio, city, locality, created_at, updated_at')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateCurrentProfile(changes: ProfileUpdate): Promise<ProfileRecord> {
  const client = getSupabaseClient()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Sign in to update your profile.')

  const { data, error } = await client
    .from('profiles')
    .update(changes)
    .eq('id', auth.user.id)
    .select('id, display_name, avatar_path, bio, city, locality, created_at, updated_at')
    .single()
  if (error) throw error
  return data
}
