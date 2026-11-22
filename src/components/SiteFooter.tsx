import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="site-footer" id="footer">
      <div className="page-container footer-inner">
        <div className="footer-brand-block">
          <Link aria-label="ShareHub home" className="inline-flex rounded-lg bg-white p-1.5" to="/">
            <img
              alt="ShareHub"
              className="footer-brand"
              height="345"
              src="/assets/sharehub-logo.png"
              width="522"
            />
          </Link>
          <p className="footer-tagline">Share Today • Use Tomorrow • Save Together</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-300">
            Find useful items nearby and make more of what we already have.
          </p>
        </div>
        <div>
          <h2 className="footer-heading">Discover</h2>
          <div className="footer-links">
            <a href="#categories">Browse categories</a>
            <a href="#listings">Browse items</a>
            <a href="#how-it-works">How it works</a>
          </div>
        </div>
        <div>
          <h2 className="footer-heading">Our community</h2>
          <div className="footer-links">
            <span>Share useful things with neighbours.</span>
            <span>Talk directly with listing owners.</span>
            <span>Keep everyday items in use.</span>
          </div>
        </div>
      </div>
      <div className="page-container footer-bottom">
        <span>© {new Date().getFullYear()} ShareHub</span>
        <span className="inline-flex items-center gap-1">Made for neighbours <Heart aria-hidden="true" className="text-emerald-300" fill="currentColor" size={12} /></span>
      </div>
    </footer>
  )
}
