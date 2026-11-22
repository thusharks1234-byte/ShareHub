import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p className="font-display text-6xl font-extrabold text-brand-blue">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-brand-navy">We couldn’t find that page</h1>
        <p className="mt-2 text-sm text-slate-500">The address may be incorrect or the page may have moved.</p>
        <Link className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white" to="/">
          <ArrowLeft aria-hidden="true" size={16} /> Back to ShareHub
        </Link>
      </div>
    </main>
  )
}
