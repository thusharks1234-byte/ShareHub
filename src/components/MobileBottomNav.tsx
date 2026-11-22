import { Compass, Home, Inbox, PlusCircle, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const isHome = location.pathname === '/' && !location.hash
  const isExplore = location.pathname === '/' && location.hash === '#listings'
  const authPage = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'].includes(location.pathname)

  if (authPage) return null

  return (
    <nav aria-label="Mobile bottom navigation" className="mobile-bottom-nav md:hidden">
      <Link aria-current={isHome ? 'page' : undefined} className={`mobile-bottom-nav__item${isHome ? ' mobile-bottom-nav__item--active' : ''}`} to="/"><Home aria-hidden="true" size={19} /><span>Home</span></Link>
      <Link aria-current={isExplore ? 'page' : undefined} className={`mobile-bottom-nav__item${isExplore ? ' mobile-bottom-nav__item--active' : ''}`} to="/#listings"><Compass aria-hidden="true" size={19} /><span>Explore</span></Link>
      <Link className="mobile-bottom-nav__item" to={user ? '/listings/new' : '/login'}><PlusCircle aria-hidden="true" size={19} /><span>List Item</span></Link>
      <Link aria-current={location.pathname.startsWith('/inbox') ? 'page' : undefined} className={`mobile-bottom-nav__item${location.pathname.startsWith('/inbox') ? ' mobile-bottom-nav__item--active' : ''}`} to={user ? '/inbox' : '/login'}><Inbox aria-hidden="true" size={19} /><span>Inbox</span></Link>
      <Link aria-current={location.pathname === '/profile' ? 'page' : undefined} className={`mobile-bottom-nav__item${location.pathname === '/profile' ? ' mobile-bottom-nav__item--active' : ''}`} to={user ? '/profile' : '/login'}><UserRound aria-hidden="true" size={19} /><span>Profile</span></Link>
    </nav>
  )
}
