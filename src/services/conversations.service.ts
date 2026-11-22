import { getSupabaseClient } from '../lib/supabase/client'
import type { Tables } from '../types/database.types'

export type ConversationRecord = Tables<'conversations'>
export type ConversationMessagePreview = Pick<Tables<'messages'>, 'id' | 'sender_id' | 'body' | 'created_at' | 'read_at'>
export type ConversationParticipant = Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_path' | 'city' | 'locality'>
export type ConversationListing = Pick<Tables<'listings'>, 'id' | 'title' | 'city' | 'locality'> & { imageUrl: string | null }

export type ConversationView = ConversationRecord & {
  listing: ConversationListing | null
  latestMessage: ConversationMessagePreview | null
  otherParticipant: ConversationParticipant | null
  unreadCount: number
}

async function getSignedInUser() {
  const { data, error } = await getSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Sign in to view conversations.')
  return data.user
}

async function enrichConversations(rows: ConversationRecord[], userId: string): Promise<ConversationView[]> {
  if (rows.length === 0) return []
  const client = getSupabaseClient()
  const listingIds = [...new Set(rows.map((row) => row.listing_id))]
  const participantIds = [...new Set(rows.map((row) => row.owner_id === userId ? row.renter_id : row.owner_id))]
  const [listingResult, participantResult, imageResult] = await Promise.all([
    client.from('listings').select('id, title, city, locality').in('id', listingIds),
    client.from('profiles').select('id, display_name, avatar_path, city, locality').in('id', participantIds),
    client.from('listing_images').select('listing_id, storage_path, display_order').in('listing_id', listingIds).order('display_order', { ascending: true }),
  ])
  if (listingResult.error) throw listingResult.error
  if (participantResult.error) throw participantResult.error
  if (imageResult.error) throw imageResult.error

  const imageByListing = new Map<string, string>()
  for (const image of imageResult.data) {
    if (!imageByListing.has(image.listing_id)) {
      imageByListing.set(image.listing_id, client.storage.from('listing-images').getPublicUrl(image.storage_path).data.publicUrl)
    }
  }
  const listingById = new Map(listingResult.data.map((listing) => [listing.id, listing]))
  const participantById = new Map(participantResult.data.map((profile) => [profile.id, profile]))
  const summaries = await Promise.all(rows.map(async (conversation) => {
    const [latest, unread] = await Promise.all([
      client.from('messages')
        .select('id, sender_id, body, created_at, read_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .neq('sender_id', userId)
        .is('read_at', null),
    ])
    if (latest.error) throw latest.error
    if (unread.error) throw unread.error
    return { conversationId: conversation.id, latestMessage: latest.data, unreadCount: unread.count ?? 0 }
  }))
  const summaryById = new Map(summaries.map((summary) => [summary.conversationId, summary]))

  return rows.map((conversation) => {
    const listing = listingById.get(conversation.listing_id)
    const otherId = conversation.owner_id === userId ? conversation.renter_id : conversation.owner_id
    const summary = summaryById.get(conversation.id)
    return {
      ...conversation,
      listing: listing ? { ...listing, imageUrl: imageByListing.get(listing.id) ?? null } : null,
      latestMessage: summary?.latestMessage ?? null,
      otherParticipant: participantById.get(otherId) ?? null,
      unreadCount: summary?.unreadCount ?? 0,
    }
  }).sort((a, b) => {
    const aTime = new Date(a.last_message_at ?? a.created_at).getTime()
    const bTime = new Date(b.last_message_at ?? b.created_at).getTime()
    return bTime - aTime
  })
}

export async function getMyConversations(): Promise<ConversationView[]> {
  const client = getSupabaseClient()
  const user = await getSignedInUser()
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return enrichConversations(data, user.id)
}

export async function getMyConversation(conversationId: string): Promise<ConversationView | null> {
  const client = getSupabaseClient()
  const user = await getSignedInUser()
  const { data, error } = await client.from('conversations').select('*').eq('id', conversationId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [conversation] = await enrichConversations([data], user.id)
  return conversation ?? null
}

export async function getUnreadMessageCount(conversationId: string): Promise<number> {
  const user = await getSignedInUser()
  const { count, error } = await getSupabaseClient()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function getOrCreateConversation(listingId: string): Promise<ConversationRecord> {
  const client = getSupabaseClient()
  const user = await getSignedInUser()
  const { data: listing, error: listingError } = await client
    .from('listings')
    .select('id, owner_id')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()
  if (listingError) throw listingError
  if (listing.owner_id === user.id) throw new Error('You cannot start a conversation about your own listing.')

  const existing = await client
    .from('conversations')
    .select('*')
    .eq('listing_id', listing.id)
    .eq('renter_id', user.id)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data

  const created = await client
    .from('conversations')
    .insert({ listing_id: listing.id, owner_id: listing.owner_id, renter_id: user.id })
    .select('*')
    .single()
  if (!created.error) return created.data

  // The unique listing/renter constraint safely handles concurrent starts.
  if (created.error.code === '23505') {
    const retry = await client
      .from('conversations')
      .select('*')
      .eq('listing_id', listing.id)
      .eq('renter_id', user.id)
      .single()
    if (!retry.error) return retry.data
  }
  throw created.error
}
