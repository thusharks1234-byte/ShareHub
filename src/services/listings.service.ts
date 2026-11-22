import { getSupabaseClient } from '../lib/supabase/client'
import type { CategoryRecord } from './categories.service'
import type { Tables } from '../types/database.types'

export type ListingRecord = Tables<'listings'>
export type ListingImageRecord = Tables<'listing_images'>
export type ListingSort = 'newest' | 'rent-asc' | 'rent-desc'

export interface ListingFilters {
  categoryId: string | null
  location: string
  page: number
  pageSize: number
  query: string
  sort: ListingSort
  minRent?: number | null
  maxRent?: number | null
}

export interface ListingImageView extends ListingImageRecord {
  publicUrl: string
}

export interface ListingView extends ListingRecord {
  category: CategoryRecord | null
  images: ListingImageView[]
}

export interface ListingPage {
  items: ListingView[]
  total: number
}

function safeSearchTerm(value: string): string {
  return value.trim().replace(/[%,()\\]/g, ' ').replace(/\s+/g, ' ')
}

export async function getActiveListings(
  filters: ListingFilters,
  categories: CategoryRecord[],
): Promise<ListingPage> {
  const client = getSupabaseClient()
  let request = client
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'active')

  if (filters.categoryId) request = request.eq('category_id', filters.categoryId)
  if (filters.minRent !== null && filters.minRent !== undefined) request = request.gte('rent_per_day', filters.minRent)
  if (filters.maxRent !== null && filters.maxRent !== undefined) request = request.lte('rent_per_day', filters.maxRent)

  const query = safeSearchTerm(filters.query)
  if (query) request = request.ilike('title', `%${query}%`)

  const location = safeSearchTerm(filters.location)
  if (location) {
    request = request.or(`city.ilike.%${location}%,locality.ilike.%${location}%`)
  }

  if (filters.sort === 'rent-asc') {
    request = request.order('rent_per_day', { ascending: true })
  } else if (filters.sort === 'rent-desc') {
    request = request.order('rent_per_day', { ascending: false })
  } else {
    request = request.order('created_at', { ascending: false })
  }

  const from = Math.max(0, filters.page - 1) * filters.pageSize
  const { data: listings, error, count } = await request.range(from, from + filters.pageSize - 1)
  if (error) throw error
  if (!listings?.length) return { items: [], total: count ?? 0 }

  const { data: imageRows, error: imageError } = await client
    .from('listing_images')
    .select('*')
    .in('listing_id', listings.map((listing) => listing.id))
    .order('display_order', { ascending: true })
  if (imageError) throw imageError

  const imagesByListing = new Map<string, ListingImageView[]>()
  for (const image of imageRows ?? []) {
    const { data } = client.storage.from('listing-images').getPublicUrl(image.storage_path)
    const items = imagesByListing.get(image.listing_id) ?? []
    items.push({ ...image, publicUrl: data.publicUrl })
    imagesByListing.set(image.listing_id, items)
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]))
  return {
    items: listings.map((listing) => ({
      ...listing,
      category: categoryById.get(listing.category_id) ?? null,
      images: imagesByListing.get(listing.id) ?? [],
    })),
    total: count ?? 0,
  }
}
