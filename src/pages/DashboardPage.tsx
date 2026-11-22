import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Clock3, Package, Plus, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountHeader } from '../components/AccountHeader'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ConversationList } from '../components/messaging/ConversationList'
import { StateMessage } from '../components/ui/StateMessage'
import { getMyConversations, type ConversationView } from '../services/conversations.service'
import { getMyListings } from '../services/listing-management.service'
import { getCurrentProfile, type ProfileRecord } from '../services/profiles.service'
import type { ListingView } from '../services/listings.service'

interface DashboardData {
  conversations: ConversationView[]
  conversationError: boolean
  conversationLoading: boolean
  listingError: boolean
  listingLoading: boolean
  listings: ListingView[]
  profile: ProfileRecord | null
  profileError: boolean
  profileLoading: boolean
  userId: string
}

const emptyListings: ListingView[] = []

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function DashboardPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [data, setData] = useState<DashboardData | null>(null)
  const current = data?.userId === userId ? data : null

  useEffect(() => {
    if (!userId) return
    let active = true
    Promise.allSettled([getCurrentProfile(), getMyListings(), getMyConversations()]).then(([profileResult, listingsResult, conversationsResult]) => {
      if (!active) return
      const profileError = profileResult.status === 'rejected'
      const listingError = listingsResult.status === 'rejected'
      const conversationError = conversationsResult.status === 'rejected'
      setData({
        conversations: conversationsResult.status === 'fulfilled' ? conversationsResult.value.slice(0, 3) : [],
        conversationError, conversationLoading: false,
        listingError, listingLoading: false,
        listings: listingsResult.status === 'fulfilled' ? listingsResult.value : [],
        profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
        profileError, profileLoading: false, userId,
      })
    })
    return () => { active = false }
  }, [userId])

  const listings = current?.listings ?? emptyListings
  const activeCount = listings.filter((listing) => listing.status === 'active').length
  const pausedCount = listings.filter((listing) => listing.status === 'paused').length
  const recentCreated = useMemo(() => [...listings].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3), [listings])
  const recentlyUpdated = useMemo(() => [...listings].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 3), [listings])
  const profile = current?.profile
  const completionFields = [profile?.display_name, profile?.avatar_path, profile?.bio, profile?.city, profile?.locality]
  const completedFields = completionFields.filter((field) => typeof field === 'string' && field.trim().length > 0).length
  const completion = Math.round((completedFields / completionFields.length) * 100)
  const firstName = profile?.display_name?.trim().split(/\s+/)[0]

  return (
    <div className="account-page">
      <AccountHeader />
      <main className="dashboard-page page-container">
        <header className="dashboard-welcome"><div><p className="eyebrow">Your ShareHub space</p><h1 className="section-title">Welcome{firstName ? `, ${firstName}` : ''}</h1><p className="section-subtitle">Keep your items up to date and stay in touch with your neighbourhood.</p></div><Link className="button" to="/listings/new"><Plus aria-hidden="true" size={17} /> List an item</Link></header>

        <section aria-label="Your account overview" className="dashboard-overview">
          <article className="dashboard-profile-summary">
            {!current || current.profileLoading ? <div className="auth-loading" role="status">Loading your profile…</div> : current.profileError ? <p className="auth-alert auth-alert--error" role="alert">Your profile summary could not be loaded.</p> : <>
              <div className="dashboard-profile-summary__identity"><ProfileAvatar avatarPath={profile?.avatar_path} name={profile?.display_name || user?.email} size="large" /><div><span>Your profile</span><strong>{profile?.display_name?.trim() || 'Complete your profile'}</strong><small>{[profile?.locality, profile?.city].filter(Boolean).join(', ') || user?.email || ''}</small></div></div>
              <div className="dashboard-completion"><div><span>Profile completion</span><strong>{completion}%</strong></div><div aria-label={`${completedFields} of ${completionFields.length} profile fields completed`} className="dashboard-completion__track" role="img"><span style={{ width: `${completion}%` }} /></div><small>{completedFields} of {completionFields.length} profile fields have information.</small></div>
              <Link className="dashboard-profile-summary__link" to="/profile">View and edit profile <ArrowRight aria-hidden="true" size={15} /></Link>
            </>}</article>
            <div className="dashboard-stat-grid">
              {!current || current.listingLoading ? <div className="auth-loading" role="status">Loading listing totals…</div> : current.listingError ? <div className="auth-alert auth-alert--error" role="alert">Listing totals could not be loaded.</div> : <>
                <article className="dashboard-stat-card"><span className="dashboard-stat-card__icon dashboard-stat-card__icon--active"><Package aria-hidden="true" size={18} /></span><strong>{activeCount}</strong><span>Active listings</span><Link to="/my-listings">View active <ArrowUpRight aria-hidden="true" size={14} /></Link></article>
                <article className="dashboard-stat-card"><span className="dashboard-stat-card__icon dashboard-stat-card__icon--paused"><Clock3 aria-hidden="true" size={18} /></span><strong>{pausedCount}</strong><span>Paused listings</span><Link to="/my-listings">Manage paused <ArrowUpRight aria-hidden="true" size={14} /></Link></article>
                <article className="dashboard-stat-card"><span className="dashboard-stat-card__icon"><Package aria-hidden="true" size={18} /></span><strong>{listings.length}</strong><span>Total listings</span><Link to="/my-listings">All your items <ArrowUpRight aria-hidden="true" size={14} /></Link></article>
              </>}
            </div>
        </section>

        <div className="dashboard-activity-grid">
          <section aria-labelledby="recent-listings-title" className="account-card dashboard-activity-card"><div className="dashboard-section-heading"><div><p className="eyebrow">Your newest items</p><h2 id="recent-listings-title">Recently created</h2></div><Link to="/my-listings">All listings <ArrowRight aria-hidden="true" size={14} /></Link></div>
            {!current || current.listingLoading ? <div className="auth-loading" role="status">Loading recent listings…</div> : current.listingError ? <StateMessage kind="error" message="Your listing activity is temporarily unavailable." title="Unable to load listings" /> : recentCreated.length ? <div className="dashboard-listing-activity">{recentCreated.map((listing) => <DashboardListingRow key={listing.id} listing={listing} dateLabel="Created" />)}</div> : <p className="dashboard-activity-empty">You haven’t listed an item yet. <Link to="/listings/new">Create your first listing</Link>.</p>}
          </section>
          <section aria-labelledby="updated-listings-title" className="account-card dashboard-activity-card"><div className="dashboard-section-heading"><div><p className="eyebrow">Latest changes</p><h2 id="updated-listings-title">Recently updated</h2></div><Link to="/my-listings">My Listings <ArrowRight aria-hidden="true" size={14} /></Link></div>
            {!current || current.listingLoading ? <div className="auth-loading" role="status">Loading listing updates…</div> : current.listingError ? <StateMessage kind="error" message="Your listing activity is temporarily unavailable." title="Unable to load listings" /> : recentlyUpdated.length ? <div className="dashboard-listing-activity">{recentlyUpdated.map((listing) => <DashboardListingRow key={listing.id} listing={listing} dateLabel="Updated" />)}</div> : <p className="dashboard-activity-empty">Your listing updates will appear here.</p>}
          </section>
        </div>

        <section aria-labelledby="dashboard-recent-messages-title" className="account-card dashboard-recent-messages"><div className="account-card__heading dashboard-recent-messages__heading"><div><p className="eyebrow">Stay connected</p><h2 id="dashboard-recent-messages-title">Recent conversations</h2><p>Your latest messages about ShareHub listings.</p></div><Link to="/inbox">Open inbox <ArrowRight aria-hidden="true" size={15} /></Link></div>
          {!current || current.conversationLoading ? <div className="auth-loading" role="status">Loading your conversations…</div> : current.conversationError ? <StateMessage kind="error" message="Recent conversations could not be loaded. Open your inbox to retry." title="Unable to load conversations" /> : current.conversations.length ? <ConversationList conversations={current.conversations} userId={userId} /> : <p className="dashboard-activity-empty">You have no conversations yet. <Link to="/#listings">Explore available items</Link>.</p>}
        </section>
        <section className="dashboard-quick-actions"><div><span className="dashboard-quick-actions__icon"><UserRound aria-hidden="true" size={19} /></span><div><strong>Keep your profile current</strong><p>A complete public profile helps neighbours know who they’re contacting.</p></div></div><Link className="button button--secondary" to="/profile">Update profile <ArrowRight aria-hidden="true" size={15} /></Link><Link className="button" to="/listings/new"><Plus aria-hidden="true" size={16} /> List an item</Link></section>
      </main>
    </div>
  )
}

function DashboardListingRow({ listing, dateLabel }: { listing: ListingView; dateLabel: 'Created' | 'Updated' }) {
  const timestamp = dateLabel === 'Created' ? listing.created_at : listing.updated_at
  const cover = listing.images[0]?.publicUrl
  return <article className="dashboard-listing-row"><Link aria-label={`View ${listing.title}`} className="dashboard-listing-row__image" to={listing.status === 'active' ? `/listings/${listing.id}` : '/my-listings'}>{cover ? <img alt="" loading="lazy" src={cover} /> : <Package aria-hidden="true" size={18} />}</Link><div className="dashboard-listing-row__content"><div><Link to={listing.status === 'active' ? `/listings/${listing.id}` : '/my-listings'}>{listing.title}</Link><span className={`listing-status listing-status--${listing.status}`}>{listing.status}</span></div><p>{listing.category?.name ?? 'Category unavailable'} · ₹{listing.rent_per_day}/day</p><small>{dateLabel} {formatDate(timestamp)}</small></div></article>
}
