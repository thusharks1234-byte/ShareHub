import { getSupabaseClient } from '../lib/supabase/client'
import type { Tables } from '../types/database.types'

export type CategoryRecord = Tables<'categories'>

export async function getCategories(): Promise<CategoryRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}
