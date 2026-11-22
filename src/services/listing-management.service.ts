import { getSupabaseClient } from '../lib/supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database.types'
import type { CategoryRecord } from './categories.service'
import type { ListingImageView, ListingView } from './listings.service'

const bucketName = 'listing-images'
const maxImageBytes = 5 * 1024 * 1024
const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ListingStatus = 'active' | 'paused' | 'draft'

export interface ListingFormValues {
  category_id: string
  city: string
  description: string
  locality: string
  rent_per_day: number
  security_deposit: number
  title: string
}

export type ListingPhotoDraft =
  | { kind: 'existing'; image: ListingImageView; key: string }
  | { kind: 'new'; file: File; key: string; previewUrl: string }

export interface UploadProgress {
  completed: number
  currentFile: string
  total: number
}

export interface ListingWithOwner extends ListingView {
  owner: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_path' | 'bio' | 'city' | 'locality'> | null
}

async function getAuthenticatedUser() {
  const { data, error } = await getSupabaseClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Sign in to manage listings.')
  return data.user
}

function publicImage(path: string): string {
  return getSupabaseClient().storage.from(bucketName).getPublicUrl(path).data.publicUrl
}

async function fetchListingImages(listingIds: string[]): Promise<ListingImageView[]> {
  if (!listingIds.length) return []
  const { data, error } = await getSupabaseClient()
    .from('listing_images')
    .select('*')
    .in('listing_id', listingIds)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data.map((image) => ({ ...image, publicUrl: publicImage(image.storage_path) }))
}

function assembleListingViews(
  listings: Tables<'listings'>[],
  images: ListingImageView[],
  categories: CategoryRecord[],
): ListingView[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const imagesByListing = new Map<string, ListingImageView[]>()
  for (const image of images) {
    const current = imagesByListing.get(image.listing_id) ?? []
    current.push(image)
    imagesByListing.set(image.listing_id, current)
  }
  return listings.map((listing) => ({
    ...listing,
    category: categoryById.get(listing.category_id) ?? null,
    images: imagesByListing.get(listing.id) ?? [],
  }))
}

export async function getMyListings(): Promise<ListingView[]> {
  const client = getSupabaseClient()
  const user = await getAuthenticatedUser()
  const { data, error } = await client
    .from('listings')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  const listingIds = data.map((listing) => listing.id)
  const [imagesResult, categoriesResult] = await Promise.all([
    fetchListingImages(listingIds),
    client.from('categories').select('*').order('name', { ascending: true }),
  ])
  if (categoriesResult.error) throw categoriesResult.error
  return assembleListingViews(data, imagesResult, categoriesResult.data)
}

export async function getListingForOwner(listingId: string): Promise<ListingView | null> {
  const client = getSupabaseClient()
  const user = await getAuthenticatedUser()
  const { data: listing, error } = await client
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!listing) return null
  const [imagesResult, categoriesResult] = await Promise.all([
    fetchListingImages([listingId]),
    client.from('categories').select('*').order('name', { ascending: true }),
  ])
  if (categoriesResult.error) throw categoriesResult.error
  return assembleListingViews([listing], imagesResult, categoriesResult.data)[0] ?? null
}

export async function getListingDetails(listingId: string): Promise<ListingWithOwner | null> {
  const client = getSupabaseClient()
  const { data: listing, error } = await client
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()
  if (error) throw error
  if (!listing) return null

  const [images, categoryResult, ownerResult] = await Promise.all([
    fetchListingImages([listingId]),
    client.from('categories').select('*').eq('id', listing.category_id).maybeSingle(),
    client.from('profiles').select('id, display_name, avatar_path, bio, city, locality').eq('id', listing.owner_id).maybeSingle(),
  ])
  if (categoryResult.error) throw categoryResult.error
  if (ownerResult.error) throw ownerResult.error
  const listingView = assembleListingViews([listing], images, categoryResult.data ? [categoryResult.data] : [])[0]
  return { ...listingView, owner: ownerResult.data }
}

async function countActiveListings(ownerId: string): Promise<number> {
  const { count, error } = await getSupabaseClient()
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

function storagePath(ownerId: string, listingId: string, file: File): string {
  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const extension = extensionByType[file.type]
  if (!extension) throw new Error('Choose a JPEG, PNG, or WebP image.')
  return `${ownerId}/${listingId}/${crypto.randomUUID()}.${extension}`
}

function validateFiles(files: File[], requireAtLeastOne = true) {
  if ((requireAtLeastOne && files.length < 1) || files.length > 5) throw new Error('Add between 1 and 5 product photos.')
  for (const file of files) {
    if (!acceptedImageTypes.has(file.type)) throw new Error('Photos must be JPEG, PNG, or WebP images.')
    if (file.size > maxImageBytes) throw new Error('Each photo must be 5 MB or smaller.')
  }
}

async function reserveImageRow(listingId: string, path: string, displayOrder: number) {
  const { data, error } = await getSupabaseClient()
    .from('listing_images')
    .insert({ listing_id: listingId, storage_path: path, display_order: displayOrder })
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function uploadReservedImage(path: string, file: File): Promise<void> {
  const { error } = await getSupabaseClient().storage.from(bucketName).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
}

async function removeImageRow(imageId: string): Promise<void> {
  const { error } = await getSupabaseClient().from('listing_images').delete().eq('id', imageId)
  if (error) throw error
}

async function publishOrRestoreListing(listingId: string, status: ListingStatus): Promise<void> {
  const update: TablesUpdate<'listings'> = { status }
  const { error } = await getSupabaseClient()
    .from('listings')
    .update(update)
    .eq('id', listingId)
  if (error) throw error
}

interface PendingUpload {
  file: File
  imageId: string
  path: string
  uploaded: boolean
}

async function rollbackNewListing(listingId: string, pending: PendingUpload[]): Promise<boolean> {
  const client = getSupabaseClient()
  let cleanupFailed = false
  const retainImageIds = new Set<string>()
  for (const item of pending) {
    if (item.uploaded) {
      const { error } = await client.storage.from(bucketName).remove([item.path])
      if (error) {
        cleanupFailed = true
        retainImageIds.add(item.imageId)
        continue
      }
    }
    try {
      await removeImageRow(item.imageId)
    } catch {
      cleanupFailed = true
      retainImageIds.add(item.imageId)
    }
  }
  if (!cleanupFailed) {
    const { error } = await client.from('listings').delete().eq('id', listingId)
    if (error) return true
    return false
  }
  // Keep the draft and metadata for any object that could not be cleaned up.
  const removableIds = pending.map((item) => item.imageId).filter((id) => !retainImageIds.has(id))
  if (removableIds.length) {
    await client.from('listing_images').delete().in('id', removableIds)
  }
  return true
}

function enhanceError(error: unknown, retainedDraft: boolean): Error {
  const message = error instanceof Error ? error.message : 'The listing could not be saved.'
  if (retainedDraft) {
    return new Error(`${message} A private draft was kept because upload cleanup could not be completed. Check My Listings before retrying.`)
  }
  if (/at most 10 active listings/i.test(message)) {
    return new Error('You already have 10 active listings. Pause or remove one before publishing another.')
  }
  return new Error(message)
}

export async function createListing(
  values: ListingFormValues,
  files: File[],
  onProgress: (progress: UploadProgress) => void = () => undefined,
): Promise<string> {
  validateFiles(files)
  const client = getSupabaseClient()
  const user = await getAuthenticatedUser()
  if (await countActiveListings(user.id) >= 10) {
    throw new Error('You already have 10 active listings. Pause or remove one before publishing another.')
  }

  const insert: TablesInsert<'listings'> = { ...values, owner_id: user.id, status: 'draft' }
  const { data: listing, error } = await client.from('listings').insert(insert).select('id').single()
  if (error) throw error

  const pending: PendingUpload[] = []
  try {
    for (const [index, file] of files.entries()) {
      const path = storagePath(user.id, listing.id, file)
      const image = await reserveImageRow(listing.id, path, index)
      const upload: PendingUpload = { file, imageId: image.id, path, uploaded: false }
      pending.push(upload)
      onProgress({ completed: index, currentFile: file.name, total: files.length })
      await uploadReservedImage(path, file)
      upload.uploaded = true
      onProgress({ completed: index + 1, currentFile: file.name, total: files.length })
    }
    await publishOrRestoreListing(listing.id, 'active')
    return listing.id
  } catch (error) {
    const retainedDraft = await rollbackNewListing(listing.id, pending)
    throw enhanceError(error, retainedDraft)
  }
}

export async function updateListing(
  listingId: string,
  values: ListingFormValues,
  photos: ListingPhotoDraft[],
  onProgress: (progress: UploadProgress) => void = () => undefined,
): Promise<void> {
  if (photos.length < 1 || photos.length > 5) throw new Error('Keep between 1 and 5 product photos.')
  validateFiles(photos.flatMap((photo) => photo.kind === 'new' ? [photo.file] : []), false)
  const client = getSupabaseClient()
  const user = await getAuthenticatedUser()
  const { data: listing, error: listingError } = await client
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .single()
  if (listingError) throw listingError
  const { data: originalImages, error: imagesError } = await client
    .from('listing_images')
    .select('*')
    .eq('listing_id', listingId)
    .order('display_order', { ascending: true })
  if (imagesError) throw imagesError

  const finalExistingIds = new Set(photos.filter((photo) => photo.kind === 'existing').map((photo) => photo.image.id))
  const removedImages = originalImages.filter((image) => !finalExistingIds.has(image.id))
  const retainedImages = originalImages.filter((image) => finalExistingIds.has(image.id))
  const newPhotos = photos.filter((photo): photo is Extract<ListingPhotoDraft, { kind: 'new' }> => photo.kind === 'new')
  const pending: PendingUpload[] = []
  let statusWasDrafted = false

  try {
    if (listing.status === 'active') {
      await publishOrRestoreListing(listingId, 'draft')
      statusWasDrafted = true
    }

    // Delete removed objects while their metadata still authorizes Storage deletion.
    for (const image of removedImages) {
      const { error: storageError } = await client.storage.from(bucketName).remove([image.storage_path])
      if (storageError) throw storageError
      const { error: metadataError } = await client.from('listing_images').delete().eq('id', image.id)
      if (metadataError) throw metadataError
    }

    const occupied = new Set(retainedImages.map((image) => image.display_order))
    const freeOrders = [0, 1, 2, 3, 4].filter((order) => !occupied.has(order))
    if (freeOrders.length < newPhotos.length) throw new Error('There is no available image slot for the selected photos.')

    for (const [index, photo] of newPhotos.entries()) {
      const path = storagePath(user.id, listingId, photo.file)
      const image = await reserveImageRow(listingId, path, freeOrders[index])
      const upload: PendingUpload = { file: photo.file, imageId: image.id, path, uploaded: false }
      pending.push(upload)
      onProgress({ completed: index, currentFile: photo.file.name, total: newPhotos.length })
      await uploadReservedImage(path, photo.file)
      upload.uploaded = true
      onProgress({ completed: index + 1, currentFile: photo.file.name, total: newPhotos.length })
    }

    const finalRows: TablesInsert<'listing_images'>[] = photos.map((photo, displayOrder) => {
      if (photo.kind === 'existing') {
        return { id: photo.image.id, listing_id: listingId, storage_path: photo.image.storage_path, display_order: displayOrder }
      }
      const uploaded = pending.find((item) => item.file === photo.file)
      if (!uploaded) throw new Error('An image upload was not completed.')
      return { id: uploaded.imageId, listing_id: listingId, storage_path: uploaded.path, display_order: displayOrder }
    })

    // Recreate the small metadata set in the chosen order to avoid unique-slot collisions.
    const { error: clearError } = await client.from('listing_images').delete().eq('listing_id', listingId)
    if (clearError) throw clearError
    const { error: orderError } = await client.from('listing_images').insert(finalRows)
    if (orderError) {
      // Restore the retained and newly uploaded metadata so cleanup remains authorized.
      await client.from('listing_images').insert([
        ...retainedImages.map((image) => ({ ...image })),
        ...pending.map((item, index) => ({ id: item.imageId, listing_id: listingId, storage_path: item.path, display_order: freeOrders[index] })),
      ])
      throw orderError
    }

    const update: TablesUpdate<'listings'> = { ...values, status: listing.status as ListingStatus }
    const { error: updateError } = await client.from('listings').update(update).eq('id', listingId)
    if (updateError) throw updateError
  } catch (error) {
    if (pending.length) {
      const cleanupFailed = await rollbackPendingImages(listingId, pending)
      if (cleanupFailed) throw enhanceError(error, true)
    }
    // A listing with no remaining photos must stay private until the owner fixes it.
    if (statusWasDrafted && retainedImages.length > 0) {
      try {
        await publishOrRestoreListing(listingId, listing.status as ListingStatus)
      } catch {
        throw enhanceError(error, true)
      }
    }
    throw enhanceError(error, statusWasDrafted && retainedImages.length === 0)
  }
}

async function rollbackPendingImages(listingId: string, pending: PendingUpload[]): Promise<boolean> {
  const client = getSupabaseClient()
  let cleanupFailed = false
  for (const item of pending) {
    if (item.uploaded) {
      const { error } = await client.storage.from(bucketName).remove([item.path])
      if (error) {
        cleanupFailed = true
        continue
      }
    }
    const { error } = await client.from('listing_images').delete().eq('id', item.imageId)
    if (error) cleanupFailed = true
  }
  if (cleanupFailed) return true

  // Removed rows are already gone; restore the saved ordering of retained rows.
  const { data: current, error: currentError } = await client
    .from('listing_images')
    .select('*')
    .eq('listing_id', listingId)
  if (currentError) return true
  const stagedIds = new Set(pending.map((item) => item.imageId))
  const retained = current.filter((image) => !stagedIds.has(image.id))
  if (!retained.length) return false
  const { error: clearError } = await client.from('listing_images').delete().eq('listing_id', listingId)
  if (clearError) return true
  const { error: restoreError } = await client.from('listing_images').insert(
    retained.map(({ id, listing_id, storage_path, display_order }) => ({ id, listing_id, storage_path, display_order })),
  )
  return Boolean(restoreError)
}

export async function setListingStatus(listingId: string, status: 'active' | 'paused'): Promise<void> {
  const user = await getAuthenticatedUser()
  if (status === 'active') {
    const client = getSupabaseClient()
    const { data: listing, error: listingError } = await client
      .from('listings')
      .select('id, owner_id, status')
      .eq('id', listingId)
      .eq('owner_id', user.id)
      .single()
    if (listingError) throw listingError
    const { data: images, error: imagesError } = await client
      .from('listing_images')
      .select('storage_path')
      .eq('listing_id', listing.id)
    if (imagesError) throw imagesError
    if (images.length === 0) throw new Error('Add at least one successfully uploaded photo before reactivating this listing.')
    const folder = user.id + '/' + listing.id
    const { data: storedFiles, error: storageError } = await client.storage.from(bucketName).list(folder, { limit: 100 })
    if (storageError) throw new Error('The listing photo bucket is unavailable. Configure listing-images before reactivating this item.')
    const availablePaths = new Set(storedFiles.map((file) => folder + '/' + file.name))
    if (images.some((image) => !availablePaths.has(image.storage_path))) {
      throw new Error('One or more listing photos are missing from Storage. Edit the listing and upload the photos again before reactivating it.')
    }
  }
  if (status === 'active' && await countActiveListings(user.id) >= 10) {
    const { data: current, error } = await getSupabaseClient()
      .from('listings')
      .select('status')
      .eq('id', listingId)
      .eq('owner_id', user.id)
      .single()
    if (error) throw error
    if (current.status !== 'active') {
      throw new Error('You already have 10 active listings. Pause or remove one before reactivating this listing.')
    }
  }
  await publishOrRestoreListing(listingId, status)
}

export async function deleteListing(listingId: string): Promise<void> {
  const client = getSupabaseClient()
  const user = await getAuthenticatedUser()
  const { data: listing, error: listingError } = await client
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .single()
  if (listingError) throw listingError
  const { data: images, error: imagesError } = await client
    .from('listing_images')
    .select('id, storage_path')
    .eq('listing_id', listing.id)
  if (imagesError) throw imagesError

  for (const image of images) {
    const { error: storageError } = await client.storage.from(bucketName).remove([image.storage_path])
    if (storageError) {
      throw new Error(`Could not remove ${image.storage_path}. The listing was kept. ${storageError.message}`)
    }
    await removeImageRow(image.id)
  }
  const { error } = await client.from('listings').delete().eq('id', listingId).eq('owner_id', user.id)
  if (error) throw error
}

export function isListingLimitError(error: unknown): boolean {
  return error instanceof Error && /at most 10 active listings|already have 10 active listings/i.test(error.message)
}
