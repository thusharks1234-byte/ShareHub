import { ArrowRight, ChevronDown, LayoutDashboard, LogOut, Menu, Search, X, Inbox, Package, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchBar } from './SearchBar'
import { Button } from './ui/Button'
import { useToast } from './ui/ToastContext'
import { useAuth } from '../auth/useAuth'

interface SiteHeaderProps {
  onSearch: (query: string, location: string) => void
}

export function SiteHeader({ onSearch }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { notify } = useToast()
  const { signOut, user } = useAuth()

  function goToListingForm() {
    setMenuOpen(false)
    navigate(user ? '/listings/new' : '/login', user ? undefined : { state: { from: { pathname: '/listings/new' } } })
  }

  async function handleSignOut() {
    setUserMenuOpen(false)
    setMenuOpen(false)
    try {
      await signOut()
    } catch {
      notify('We could not sign you out. Please try again.')
    }
  }

  const displayName = typeof user?.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name
    : user?.email?.split('@')[0] ?? 'Your account'

  return (
    <header className="site-header sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link aria-label="ShareHub home" className="brand-lockup shrink-0" to="/">
          <img
            alt="ShareHub — Share Today • Use Tomorrow • Save Together"
            className="brand-lockup__logo"
            height="345"
            src="/assets/sharehub-logo.png"
            width="522"
          />
          <span className="sr-only">Share Today • Use Tomorrow • Save Together</span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center px-3 lg:flex">
          <SearchBar onSearch={onSearch} />
        </div>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 xl:flex">
          <a className="site-nav-link" href="#listings">Explore</a>
          <a className="site-nav-link" href="#categories">Categories</a>
          <a className="site-nav-link" href="#how-it-works">How it works</a>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {user ? (
            <>
              <nav aria-label="Account navigation" className="user-primary-nav hidden items-center gap-3 xl:flex">
                <Link className="site-nav-link" to="/dashboard">Dashboard</Link>
                <Link className="site-nav-link" to="/my-listings">My Listings</Link>
                <Link className="site-nav-link" to="/inbox">Inbox</Link>
                <Link className="site-nav-link" to="/profile">Profile</Link>
              </nav>
              <div className="user-menu">
                <button aria-expanded={userMenuOpen} className="user-menu__trigger" onClick={() => setUserMenuOpen((value) => !value)} type="button">
                  <span className="user-menu__avatar">{displayName.slice(0, 1).toUpperCase()}</span>
                  <span className="user-menu__name">{displayName}</span>
                  <ChevronDown aria-hidden="true" size={15} />
                </button>
                {userMenuOpen ? (
                  <div className="user-menu__popover">
                    <Link onClick={() => setUserMenuOpen(false)} to="/dashboard"><LayoutDashboard aria-hidden="true" size={16} /> Dashboard</Link>
                    <Link onClick={() => setUserMenuOpen(false)} to="/my-listings"><Package aria-hidden="true" size={16} /> My Listings</Link>
                    <Link onClick={() => setUserMenuOpen(false)} to="/profile"><UserRound aria-hidden="true" size={16} /> Profile</Link>
                    <button onClick={handleSignOut} type="button"><LogOut aria-hidden="true" size={16} /> Log out</button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link className="rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-navy hover:bg-slate-50" to="/login">Log in</Link>
              <Link className="button px-4" to="/register">Create account</Link>
            </>
          )}
          <Button className="px-4" onClick={goToListingForm}>
            List an item <ArrowRight aria-hidden="true" size={15} />
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            aria-label="Search listings"
            className="grid size-10 place-items-center rounded-xl text-brand-navy hover:bg-slate-100"
            onClick={() => document.getElementById('home-search')?.scrollIntoView({ behavior: 'smooth' })}
            type="button"
          >
            <Search aria-hidden="true" size={20} />
          </button>
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="grid size-10 place-items-center rounded-xl text-brand-navy hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav aria-label="Mobile navigation menu" className="mobile-menu md:hidden">
          <a href="#listings" onClick={() => setMenuOpen(false)}>Explore items</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Browse categories</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How ShareHub works</a>
          {user ? (
            <>
              <Link to="/inbox" onClick={() => setMenuOpen(false)}><Inbox aria-hidden="true" size={17} /> Inbox</Link>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}><LayoutDashboard aria-hidden="true" size={17} /> Dashboard</Link>
              <Link to="/my-listings" onClick={() => setMenuOpen(false)}><Package aria-hidden="true" size={17} /> My Listings</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)}><UserRound aria-hidden="true" size={17} /> Profile</Link>
              <button onClick={handleSignOut} type="button"><LogOut aria-hidden="true" size={17} /> Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link>
            </>
          )}
          <button onClick={goToListingForm} type="button">List an item</button>
        </nav>
      ) : null}
    </header>
  )
}
