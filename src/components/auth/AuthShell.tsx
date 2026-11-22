import { ArrowLeft, Leaf, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthShellProps {
  children: ReactNode
  description: string
  title: string
  eyebrow?: string
}

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Link aria-label="ShareHub home" className="auth-logo" to="/">
          <img alt="ShareHub" height="345" src="/assets/sharehub-logo.png" width="522" />
        </Link>
        <div className="auth-aside__copy">
          <span className="auth-aside__eyebrow"><Sparkles aria-hidden="true" size={15} /> Neighbours sharing more</span>
          <h1>Good things are closer.</h1>
          <p>Find useful items nearby, connect with their owners, and help the things we already have go further.</p>
        </div>
        <div aria-hidden="true" className="auth-aside__art">
          <span className="auth-aside__ring auth-aside__ring--outer" />
          <span className="auth-aside__ring auth-aside__ring--inner" />
          <span className="auth-aside__leaf"><Leaf size={54} strokeWidth={1.3} /></span>
          <span className="auth-aside__tagline">Share Today <i>•</i> Use Tomorrow <i>•</i> Save Together</span>
        </div>
        <p className="auth-aside__footer">A little more sharing makes a lot more sense.</p>
      </aside>

      <main className="auth-panel">
        <Link aria-label="ShareHub home" className="auth-logo auth-logo--mobile" to="/">
          <img alt="ShareHub" height="345" src="/assets/sharehub-logo.png" width="522" />
        </Link>
        <Link className="auth-back-link" to="/">
          <ArrowLeft aria-hidden="true" size={15} /> Back to ShareHub
        </Link>
        <section aria-labelledby="auth-title" className="auth-card">
          <div className="auth-card__heading">
            {eyebrow ? <p className="auth-eyebrow">{eyebrow}</p> : null}
            <h2 id="auth-title">{title}</h2>
            <p>{description}</p>
          </div>
          {children}
        </section>
        <p className="auth-panel__tagline">Share Today <span>•</span> Use Tomorrow <span>•</span> Save Together</p>
      </main>
    </div>
  )
}
