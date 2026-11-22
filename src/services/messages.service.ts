import { getSupabaseClient } from '../lib/supabase/client'
import type { Tables } from '../types/database.types'

export type MessageRecord = Tables<'messages'>
export const MESSAGE_PAGE_SIZE = 50

export async function getConversationMessages(
  conversationId: string,
  offset = 0,
  limit = MESSAGE_PAGE_SIZE,
): Promise<{ items: MessageRecord[]; total: number }> {
  const { data, error, count } = await getSupabaseClient()
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return { items: data.reverse(), total: count ?? 0 }
}

export async function sendMessage(conversationId: string, body: string): Promise<MessageRecord> {
  const client = getSupabaseClient()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Sign in to send a message.')

  const normalizedBody = body.trim()
  if (!normalizedBody || normalizedBody.length > 2000) {
    throw new Error('Messages must be between 1 and 2,000 characters.')
  }

  const { data, error } = await client
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: auth.user.id, body: normalizedBody })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function markConversationMessagesRead(conversationId: string): Promise<number> {
  const client = getSupabaseClient()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Sign in to update message status.')
  const { data, error } = await client
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', auth.user.id)
    .is('read_at', null)
    .select('id')
  if (error) throw error
  return data.length
}

export function subscribeToConversationMessages(
  conversationId: string,
  onMessage: (message: MessageRecord) => void,
  onStatus?: (status: string) => void,
) {
  return getSupabaseClient()
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as MessageRecord),
    )
    .subscribe((status) => onStatus?.(status))
}

/** RLS limits delivered rows to messages the signed-in user can access. */
export function subscribeToInboxMessages(
  onMessage: (message: MessageRecord, event: 'INSERT' | 'UPDATE') => void,
  onStatus?: (status: string) => void,
) {
  return getSupabaseClient()
    .channel('inbox:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      onMessage(payload.new as MessageRecord, 'INSERT')
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
      onMessage(payload.new as MessageRecord, 'UPDATE')
    })
    .subscribe((status) => onStatus?.(status))
}
