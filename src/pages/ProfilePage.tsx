import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Camera, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountHeader } from '../components/AccountHeader'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { ProductCard } from '../components/ProductCard'
import { Button } from '../components/ui/Button'
import { StateMessage } from '../components/ui/StateMessage'
import { getMyListings } from '../services/listing-management.service'
import { getCurrentProfile, updateCurrentProfile, type ProfileRecord } from '../services/profiles.service'
import type { ListingView } from '../services/listings.service'

type PageData = { error: boolean; listings: ListingView[]; profile: ProfileRecord | null; userId: string }

export function ProfilePage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [data, setData] = useState<PageData | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [locality, setLocality] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [retry, setRetry] = useState(0)
  const current = data?.userId === userId ? data : null

  useEffect(() => {
    if (!userId) return
    let active = true
    Promise.all([getCurrentProfile(), getMyListings()])
      .then(([profile, listings]) => {
        if (!active) return
        setData({ error: false, listings, profile, userId })
        setDisplayName(profile?.display_name ?? '')
        setBio(profile?.bio ?? '')
        setCity(profile?.city ?? '')
        setLocality(profile?.locality ?? '')
      })
      .catch(() => { if (active) setData({ error: true, listings: [], profile: null, userId }) })
    return () => { active = false }
  }, [userId, retry])

  const activeListings = useMemo(() => current?.listings.filter((listing) => listing.status === 'active') ?? [], [current])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = displayName.trim()
    if (!cleanName) { setSaveError('Enter a display name.'); return }
    setSaveError('')
    setSaved(false)
    setSaving(true)
    try {
      const profile = await updateCurrentProfile({
        display_name: cleanName,
        bio: bio.trim() || null,
        city: city.trim() || null,
        locality: locality.trim() || null,
      })
      setData((previous) => previous?.userId === userId ? { ...previous, profile } : previous)
      setSaved(true)
    } catch {
      setSaveError('Your profile could not be saved. Check your connection and try again.')
    } finally { setSaving(false) }
  }

  const profile = current?.profile
  const accountCreated = user?.created_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(user.created_at)) : 'Not available'

  return (
    <div className="account-page">
      <AccountHeader />
      <main className="profile-page page-container">
        <header className="profile-page__heading"><div><p className="eyebrow">Your ShareHub account</p><h1 className="section-title">Your profile</h1><p className="section-subtitle">Manage your public details and see the items you currently share.</p></div><Link className="button button--secondary" to="/dashboard">Dashboard <ArrowRight aria-hidden="true" size={15} /></Link></header>
        {!current ? data?.error && data.userId === userId ? <StateMessage action={<Button onClick={() => { setData(null); setRetry((value) => value + 1) }} variant="secondary">Retry</Button>} kind="error" message="Your profile could not be loaded. Try again." title="Unable to load profile" /> : <StateMessage kind="loading" message="Loading profile and listings from your account." title="Opening your profile" /> : <>
          <div className="profile-page__grid">
            <section aria-labelledby="profile-edit-title" className="account-card profile-editor-card">
              <div className="profile-editor-card__identity"><ProfileAvatar avatarPath={profile?.avatar_path} name={profile?.display_name || user?.email} size="large" /><div><p className="eyebrow">Public profile</p><h2>{profile?.display_name || 'ShareHub member'}</h2><span>{[profile?.locality, profile?.city].filter(Boolean).join(', ') || 'Add your location'}</span></div></div>
              <div className="profile-photo-note"><Camera aria-hidden="true" size={17} /><span>Profile photo uploads are not configured yet. Your initials remain visible until a secure photo bucket is set up.</span></div>
              <form className="profile-form" onSubmit={handleSubmit}>
                <h2 id="profile-edit-title">Profile information</h2>
                <label className="auth-field" htmlFor="profile-name"><span>Display name</span><input id="profile-name" autoComplete="name" maxLength={80} onChange={(event) => setDisplayName(event.currentTarget.value)} required value={displayName} /></label>
                <label className="auth-field" htmlFor="profile-bio"><span>Bio</span><textarea id="profile-bio" maxLength={500} onChange={(event) => setBio(event.currentTarget.value)} placeholder="Share a little about yourself and what you enjoy lending." rows={4} value={bio} /><small>{bio.length}/500</small></label>
                <div className="profile-form__location">
                  <label className="auth-field" htmlFor="profile-city"><span>City</span><input id="profile-city" autoComplete="address-level2" maxLength={100} onChange={(event) => setCity(event.currentTarget.value)} value={city} /></label>
                  <label className="auth-field" htmlFor="profile-locality"><span>Locality</span><input id="profile-locality" autoComplete="address-level3" maxLength={100} onChange={(event) => setLocality(event.currentTarget.value)} value={locality} /></label>
                </div>
                {saveError ? <div className="auth-alert auth-alert--error" role="alert">{saveError}</div> : null}
                {saved ? <div className="auth-alert auth-alert--success" role="status">Your profile changes have been saved.</div> : null}
                <Button disabled={saving} type="submit"><Save aria-hidden="true" size={16} />{saving ? 'Saving…' : 'Save changes'}</Button>
              </form>
            </section>
            <aside className="profile-account-column">
              <section aria-labelledby="account-info-title" className="account-card profile-account-card"><p className="eyebrow">Account</p><h2 id="account-info-title">Account information</h2><dl><div><dt>Email</dt><dd>{user?.email || 'Not available'}</dd></div><div><dt>Member since</dt><dd>{accountCreated}</dd></div></dl><p className="profile-account-card__note">Your email and sign-in details are managed securely by Supabase Auth.</p></section>
              <section className="account-card profile-listing-summary"><p className="eyebrow">Currently sharing</p><strong>{activeListings.length}</strong><span>active {activeListings.length === 1 ? 'listing' : 'listings'}</span><Link to="/my-listings">Manage My Listings <ArrowRight aria-hidden="true" size={15} /></Link></section>
            </aside>
          </div>
          <section aria-labelledby="profile-listings-title" className="profile-active-listings"><div className="section-heading"><div><p className="eyebrow">Available in the marketplace</p><h2 className="section-title" id="profile-listings-title">Your active listings</h2></div><Link className="text-link" to="/my-listings">Manage listings <ArrowRight aria-hidden="true" size={15} /></Link></div>
            {activeListings.length ? <div className="product-grid profile-product-grid">{activeListings.slice(0, 4).map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div> : <StateMessage action={<Link className="button" to="/listings/new">List Your Item</Link>} kind="empty" message="Active listings you publish will be visible on your profile." title="No active listings yet" />}
          </section>
        </>}
      </main>
    </div>
  )
}
