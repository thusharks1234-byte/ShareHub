import { ArrowLeft, ImageOff, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountHeader } from '../components/AccountHeader'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { getOrCreateConversation } from '../services/conversations.service'
import { getListingDetails, type ListingWithOwner } from '../services/listing-management.service'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function ListingDetailsPage() {
  const { listingId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [result, setResult] = useState<{ error: boolean; listing: ListingWithOwner | null; requestId: string } | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [contacting, setContacting] = useState(false)
  const [contactError, setContactError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let current = true
    getListingDetails(listingId)
      .then((listing) => { if (current) { setResult({ error: false, listing, requestId: listingId }); setActiveImage(0) } })
      .catch(() => { if (current) setResult({ error: true, listing: null, requestId: listingId }) })
    return () => { current = false }
  }, [listingId, retry])

  const loading = result?.requestId !== listingId
  const failed = !loading && result?.error === true
  const listing = !loading && !failed ? result?.listing ?? null : null

  async function messageOwner() {
    if (!listing) return
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/listings/' + listing.id } } })
      return
    }
    setContactError('')
    setContacting(true)
    try {
      const conversation = await getOrCreateConversation(listing.id)
      navigate('/inbox/' + conversation.id)
    } catch (cause) {
      setContactError(cause instanceof Error ? cause.message : 'The conversation could not be opened. Try again.')
    } finally {
      setContacting(false)
    }
  }

  const image = listing?.images[activeImage]
  const isOwner = Boolean(user && listing && user.id === listing.owner_id)

  return (
    <div className="account-page listing-details-page">
      <AccountHeader />
      <main className="listing-detail page-container">
        <Link className="listing-back" to="/#listings"><ArrowLeft aria-hidden="true" size={16} /> Explore items</Link>
        {loading ? <StateMessage kind="loading" message="Loading this listing from ShareHub." title="Getting item details" /> : null}
        {failed ? <StateMessage action={<Button onClick={() => setRetry((value) => value + 1)} variant="secondary">Try again</Button>} kind="error" message="The listing could not be loaded. Check your connection and try again." title="Unable to load this item" /> : null}
        {!loading && !failed && !listing ? <StateMessage action={<Link className="button" to="/">Explore ShareHub</Link>} kind="empty" message="It may have been removed or is no longer publicly available." title="This listing is unavailable" /> : null}

        {listing ? (
          <div className="listing-detail__layout">
            <section aria-label="Product photographs" className="listing-gallery">
              <div className="listing-gallery__main">
                {image ? <img alt={listing.title} src={image.publicUrl} /> : <span><ImageOff aria-hidden="true" size={30} />No photo available</span>}
              </div>
              {listing.images.length > 1 ? (
                <div className="listing-gallery__thumbs">
                  {listing.images.map((photo, index) => (
                    <button aria-label={'Show photo ' + (index + 1)} aria-pressed={activeImage === index} className={activeImage === index ? 'listing-gallery__thumb listing-gallery__thumb--active' : 'listing-gallery__thumb'} key={photo.id} onClick={() => setActiveImage(index)} type="button">
                      <img alt="" src={photo.publicUrl} />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
            <article className="listing-detail__info">
              <p className="eyebrow">{listing.category?.name ?? 'ShareHub item'}</p>
              <h1>{listing.title}</h1>
              <p className="listing-detail__location"><MapPin aria-hidden="true" size={16} /> Approximate location: {listing.locality}, {listing.city}</p>
              <div className="listing-detail__price-card">
                <div><strong>₹{inr.format(listing.rent_per_day)}</strong><span>per day</span></div>
                <div><strong>₹{inr.format(listing.security_deposit)}</strong><span>security deposit</span></div>
              </div>
              <section className="listing-detail__section">
                <h2>About this item</h2>
                <p className="listing-detail__description">{listing.description}</p>
              </section>
              <section className="listing-detail__owner">
                <Link aria-label={`View ${listing.owner?.display_name || 'owner'}'s public profile`} className="listing-detail__owner-profile" to={`/profiles/${listing.owner_id}`}>
                  <span className="listing-detail__owner-avatar" aria-hidden="true">{(listing.owner?.display_name || 'S').trim().slice(0, 1).toUpperCase()}</span>
                  <div><small>Shared by</small><strong>{listing.owner?.display_name || 'ShareHub member'}</strong><span>{[listing.owner?.locality, listing.owner?.city].filter(Boolean).join(', ') || 'Local owner'}</span></div>
                </Link>
              </section>
              {contactError ? <p className="auth-alert auth-alert--error" role="alert">{contactError}</p> : null}
              {isOwner ? (
                <Link className="button listing-detail__contact" to={'/my-listings/' + listing.id + '/edit'}>Manage your listing</Link>
              ) : (
                <Button className="listing-detail__contact" disabled={contacting} onClick={() => void messageOwner()}><MessageCircle aria-hidden="true" size={17} />{contacting ? 'Opening conversation…' : 'Message owner'}</Button>
              )}
              <p className="listing-detail__notice"><ShieldCheck aria-hidden="true" size={15} /> ShareHub displays listing prices and deposits only. No booking or payment is processed here.</p>
            </article>
          </div>
        ) : null}
      </main>
    </div>
  )
}
