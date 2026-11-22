import { ArrowRight, ImageOff, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccountHeader } from '../components/AccountHeader'
import { ConfirmDialog } from '../components/listings/ConfirmDialog'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { useToast } from '../components/ui/ToastContext'
import { deleteListing, getMyListings, setListingStatus } from '../services/listing-management.service'
import type { ListingView } from '../services/listings.service'

type PendingAction = { kind: 'pause' | 'reactivate' | 'delete'; listing: ListingView } | null
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function MyListingsPage() {
  const [result, setResult] = useState<{ error: boolean; listings: ListingView[]; requestId: number } | null>(null)
  const [retry, setRetry] = useState(0)
  const [pending, setPending] = useState<PendingAction>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const { notify } = useToast()

  useEffect(() => {
    let current = true
    getMyListings()
      .then((rows) => { if (current) setResult({ error: false, listings: rows, requestId: retry }) })
      .catch(() => { if (current) setResult({ error: true, listings: [], requestId: retry }) })
    return () => { current = false }
  }, [retry])

  const loading = result?.requestId !== retry
  const loadState = loading ? 'loading' : result?.error ? 'error' : 'ready'
  const listings = !loading && result && !result.error ? result.listings : []

  async function confirmAction() {
    if (!pending) return
    setBusy(true)
    setActionError('')
    try {
      if (pending.kind === 'delete') {
        await deleteListing(pending.listing.id)
        notify('The listing has been deleted.', 'success')
      } else {
        await setListingStatus(pending.listing.id, pending.kind === 'pause' ? 'paused' : 'active')
        notify(pending.kind === 'pause' ? 'The listing is paused.' : 'The listing is active again.', 'success')
      }
      setPending(null)
      setRetry((value) => value + 1)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'The listing action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const activeCount = listings.filter((listing) => listing.status === 'active').length

  return (
    <div className="account-page">
      <AccountHeader />
      <main className="account-main page-container my-listings-page">
        <header className="my-listings-heading">
          <div><p className="eyebrow">Your sharing space</p><h1 className="section-title">My Listings</h1><p className="section-subtitle">Manage what you have shared with your neighbourhood.</p></div>
          <Link className="button" to="/listings/new"><Plus aria-hidden="true" size={17} /> List an item</Link>
        </header>
        <div className="my-listings-summary"><span>{listings.length} {listings.length === 1 ? 'listing' : 'listings'}</span><span>{activeCount}/10 active</span></div>

        {loadState === 'loading' ? <StateMessage kind="loading" message="Loading your items from ShareHub." title="Getting your listings" /> : null}
        {loadState === 'error' ? (
          <StateMessage action={<Button onClick={() => setRetry((value) => value + 1)} variant="secondary">Try again</Button>} kind="error" message="Your listing records could not be loaded. Nothing has been replaced with sample data." title="Unable to load My Listings" />
        ) : null}
        {loadState === 'ready' && listings.length === 0 ? (
          <StateMessage action={<Link className="button" to="/listings/new">List Your Item <ArrowRight aria-hidden="true" size={16} /></Link>} kind="empty" message="Items you publish will appear here so you can edit, pause, reactivate, or remove them." title="You haven't listed any products yet." />
        ) : null}

        {loadState === 'ready' && listings.length > 0 ? (
          <div className="owner-listings">
            {listings.map((listing) => {
              const cover = listing.images[0]?.publicUrl
              return (
                <article className="owner-listing-card" key={listing.id}>
                  <Link aria-label={'View ' + listing.title} className="owner-listing-card__media" to={'/listings/' + listing.id}>
                    {cover ? <img alt="" loading="lazy" src={cover} /> : <span><ImageOff aria-hidden="true" size={25} />No photo</span>}
                  </Link>
                  <div className="owner-listing-card__content">
                    <div className="owner-listing-card__top">
                      <span className={'listing-status listing-status--' + listing.status}>{listing.status}</span>
                      <span className="owner-listing-card__category">{listing.category?.name ?? 'Category unavailable'}</span>
                    </div>
                    <Link className="owner-listing-card__title" to={'/listings/' + listing.id}>{listing.title}</Link>
                    <p className="owner-listing-card__location"><MapPin aria-hidden="true" size={14} />{listing.locality}, {listing.city}</p>
                    <div className="owner-listing-card__prices"><strong>₹{inr.format(listing.rent_per_day)}<small> / day</small></strong><span>₹{inr.format(listing.security_deposit)} deposit</span></div>
                    <div className="owner-listing-card__actions">
                      <Link className="owner-listing-card__edit" to={'/my-listings/' + listing.id + '/edit'}><Pencil aria-hidden="true" size={15} /> Edit</Link>
                      {listing.status === 'active' ? (
                        <button onClick={() => { setActionError(''); setPending({ kind: 'pause', listing }) }} type="button">Pause</button>
                      ) : (
                        <button disabled={activeCount >= 10} onClick={() => { setActionError(''); setPending({ kind: 'reactivate', listing }) }} type="button">Reactivate</button>
                      )}
                      <button aria-label={'Delete ' + listing.title} className="owner-listing-card__delete" onClick={() => { setActionError(''); setPending({ kind: 'delete', listing }) }} type="button"><Trash2 aria-hidden="true" size={15} /><span>Delete</span></button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </main>

      <ConfirmDialog
        busy={busy}
        confirmLabel={pending?.kind === 'delete' ? 'Delete listing' : pending?.kind === 'pause' ? 'Pause listing' : 'Reactivate listing'}
        destructive={pending?.kind === 'delete'}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmAction()}
        open={Boolean(pending)}
        title={pending?.kind === 'delete' ? 'Delete this listing?' : pending?.kind === 'pause' ? 'Pause this listing?' : 'Reactivate this listing?'}
      >
        {actionError ? <p className="auth-alert auth-alert--error" role="alert">{actionError}</p> : null}
        <p>{pending?.kind === 'delete' ? 'This removes the listing and its photos from ShareHub. This action cannot be undone.' : pending?.kind === 'pause' ? 'This hides the item from marketplace search. You can reactivate it later.' : 'This makes the item visible in the marketplace again.'}</p>
      </ConfirmDialog>
    </div>
  )
}
