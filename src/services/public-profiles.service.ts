import { getSupabaseClient } from '../lib/supabase/client'
import type { Tables } from '../types/database.types'
import type { CategoryRecord } from './categories.service'
import type { ListingImageView, ListingView } from './listings.service'

export type PublicProfile = Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_path' | 'bio' | 'city' | 'locality'>

export interface PublicOwnerProfile {
  profile: PublicProfile
  activeListings: ListingView[]
}

export async function getPublicOwnerProfile(profileId: string): Promise<PublicOwnerProfile | null> {
  const client = getSupabaseClient()
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, display_name, avatar_path, bio, city, locality')
    .eq('id', profileId)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) return null

  const { data: listings, error: listingsError } = await client
    .from('listings')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (listingsError) throw listingsError
  if (!listings.length) return { profile, activeListings: [] }

  const listingIds = listings.map((listing) => listing.id)
  const [imagesResult, categoriesResult] = await Promise.all([
    client.from('listing_images').select('*').in('listing_id', listingIds).order('display_order', { ascending: true }),
    client.from('categories').select('*'),
  ])
  if (imagesResult.error) throw imagesResult.error
  if (categoriesResult.error) throw categoriesResult.error

  const imagesByListing = new Map<string, ListingImageView[]>()
  for (const image of imagesResult.data) {
    const current = imagesByListing.get(image.listing_id) ?? []
    current.push({
      ...image,
      publicUrl: client.storage.from('listing-images').getPublicUrl(image.storage_path).data.publicUrl,
    })
    imagesByListing.set(image.listing_id, current)
  }
  const categoriesById = new Map<string, CategoryRecord>(categoriesResult.data.map((category) => [category.id, category]))
  return {
    profile,
    activeListings: listings.map((listing) => ({
      ...listing,
      category: categoriesById.get(listing.category_id) ?? null,
      images: imagesByListing.get(listing.id) ?? [],
    })),
  }
}
