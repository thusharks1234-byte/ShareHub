import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Package } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AccountHeader } from '../components/AccountHeader'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProductCard } from '../components/ProductCard'
import { StateMessage } from '../components/ui/StateMessage'
import { getPublicOwnerProfile, type PublicOwnerProfile } from '../services/public-profiles.service'

export function PublicProfilePage() {
  const { profileId = '' } = useParams()
  const [result, setResult] = useState<{ data: PublicOwnerProfile | null; error: boolean; profileId: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const loading = result?.profileId !== profileId

  useEffect(() => {
    let active = true
    getPublicOwnerProfile(profileId)
      .then((data) => { if (active) setResult({ data, error: false, profileId }) })
      .catch(() => { if (active) setResult({ data: null, error: true, profileId }) })
    return () => { active = false }
  }, [profileId, retry])

  const profile = !loading && !result?.error ? result?.data?.profile : null

  return (
    <div className="account-page">
      <AccountHeader />
      <main className="public-profile-page page-container">
        <Link className="listing-back" to="/"><ArrowLeft aria-hidden="true" size={16} /> Explore ShareHub</Link>
        {loading ? <StateMessage kind="loading" message="Loading public profile and active items." title="Opening owner profile" /> : null}
        {!loading && result?.error ? <StateMessage action={<button className="button button--secondary" onClick={() => setRetry((value) => value + 1)} type="button">Try again</button>} kind="error" message="This public profile could not be loaded. Please retry." title="Unable to load profile" /> : null}
        {!loading && !result?.error && !profile ? <StateMessage action={<Link className="button" to="/">Explore ShareHub</Link>} kind="empty" message="This profile may no longer be available." title="Profile not found" /> : null}
        {profile && result?.data ? <>
          <section aria-labelledby="public-profile-name" className="public-profile-card">
            <ProfileAvatar avatarPath={profile.avatar_path} name={profile.display_name} size="large" />
            <div className="public-profile-card__content"><p className="eyebrow">ShareHub owner</p><h1 id="public-profile-name">{profile.display_name?.trim() || 'ShareHub member'}</h1>
              {[profile.locality, profile.city].some(Boolean) ? <p className="public-profile-card__location"><MapPin aria-hidden="true" size={15} />{[profile.locality, profile.city].filter(Boolean).join(', ')}</p> : null}
              {profile.bio?.trim() ? <p className="public-profile-card__bio">{profile.bio}</p> : <p className="public-profile-card__bio public-profile-card__bio--empty">This member hasn’t added a bio yet.</p>}
            </div>
            <div className="public-profile-card__count"><Package aria-hidden="true" size={18} /><strong>{result.data.activeListings.length}</strong><span>active {result.data.activeListings.length === 1 ? 'item' : 'items'}</span></div>
          </section>
          <section aria-labelledby="public-profile-listings" className="public-profile-listings"><div className="section-heading"><div><p className="eyebrow">Available to explore</p><h2 className="section-title" id="public-profile-listings">Active listings</h2></div></div>
            {result.data.activeListings.length ? <div className="product-grid">{result.data.activeListings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div> : <StateMessage kind="empty" message="This owner doesn’t have any active listings right now." title="No active listings" />}
          </section>
        </> : null}
      </main>
    </div>
  )
}
