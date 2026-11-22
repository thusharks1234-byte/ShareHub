import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type StateKind = 'loading' | 'error' | 'empty'

interface StateMessageProps {
  action?: ReactNode
  kind: StateKind
  message: string
  title: string
}

const icons = {
  loading: LoaderCircle,
  error: AlertCircle,
  empty: Inbox,
}

export function StateMessage({
  action,
  kind,
  message,
  title,
}: StateMessageProps) {
  const Icon = icons[kind]

  return (
    <div
      aria-live={kind === 'loading' ? 'polite' : 'assertive'}
      className="flex min-h-52 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center"
      role="status"
    >
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-sky-50 text-brand-blue">
        <Icon aria-hidden="true" className={kind === 'loading' ? 'animate-spin' : ''} size={22} />
      </span>
      <h3 className="font-display text-lg font-bold text-brand-navy">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
