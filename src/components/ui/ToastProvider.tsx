import { Check, Info, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ToastContext } from './ToastContext'

type ToastTone = 'success' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), 3600),
    )

    return () => timers.forEach(window.clearTimeout)
  }, [dismiss, toasts])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:top-6"
        role="region"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? Check : Info

          return (
            <div
              aria-live="polite"
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-navy shadow-xl shadow-slate-900/10"
              key={toast.id}
              role="status"
            >
              <Icon
                aria-hidden="true"
                className={toast.tone === 'success' ? 'text-brand-green' : 'text-brand-blue'}
                size={18}
              />
              <span className="flex-1">{toast.message}</span>
              <button
                aria-label="Dismiss notification"
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => dismiss(toast.id)}
                type="button"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
