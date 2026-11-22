import { ArrowRightFromLine, ChevronDown, Inbox, LayoutDashboard, Package, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useToast } from './ui/ToastContext'

export function AccountHeader() {
  const { signOut, user } = useAuth()
  const { notify } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = typeof user?.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : user?.email?.split('@')[0] || 'Your account'

  async function handleSignOut() {
    setMenuOpen(false)
    try { await signOut(); navigate('/') }
    catch { notify('We could not sign you out. Please try again.') }
  }

  const links = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Listings', to: '/my-listings', icon: Package },
    { label: 'Inbox', to: '/inbox', icon: Inbox },
    { label: 'Profile', to: '/profile', icon: UserRound },
  ]

  return (
    <header className="account-header">
      <div className="account-header__inner page-container">
        <Link aria-label="ShareHub home" className="brand-lockup account-header__brand" to="/"><img alt="ShareHub — Share Today • Use Tomorrow • Save Together" height="345" src="/assets/sharehub-logo.png" width="522" /></Link>
        <nav aria-label="Account navigation" className="account-header__nav">
          {user ? links.map(({ label, to, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(`${to}/`))
            return <Link aria-current={active ? 'page' : undefined} className={active ? 'is-active' : undefined} key={to} to={to}><Icon aria-hidden="true" size={16} /><span>{label}</span></Link>
          }) : <><Link to="/login">Log in</Link><Link className="button" to="/register">Create account</Link></>}
        </nav>
        {user ? <div className="account-menu"><button aria-expanded={menuOpen} aria-haspopup="menu" className="account-menu__trigger" onClick={() => setMenuOpen((value) => !value)} type="button"><span className="account-menu__avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><span className="account-menu__name">{displayName}</span><ChevronDown aria-hidden="true" size={15} /></button>
          {menuOpen ? <div className="account-menu__popover" role="menu"><div className="account-menu__email">{user.email}</div><Link onClick={() => setMenuOpen(false)} role="menuitem" to="/profile"><UserRound aria-hidden="true" size={16} /> Profile settings</Link><button onClick={handleSignOut} role="menuitem" type="button"><ArrowRightFromLine aria-hidden="true" size={16} /> Sign out</button></div> : null}</div> : null}
      </div>
    </header>
  )
}
