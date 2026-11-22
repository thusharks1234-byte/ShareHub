import { useEffect, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  busy?: boolean
  children: ReactNode
  confirmLabel: string
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
}

export function ConfirmDialog({ busy = false, children, confirmLabel, destructive = false, onCancel, onConfirm, open, title }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel, open])

  if (!open) return null
  return (
    <div className="confirm-dialog__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
      <section aria-describedby="confirm-dialog-description" aria-labelledby="confirm-dialog-title" aria-modal="true" className="confirm-dialog" role="alertdialog">
        <h2 id="confirm-dialog-title">{title}</h2>
        <div id="confirm-dialog-description">{children}</div>
        <div className="confirm-dialog__actions">
          <button className="button button--secondary" disabled={busy} onClick={onCancel} ref={cancelRef} type="button">Cancel</button>
          <button className={`button ${destructive ? 'confirm-dialog__delete' : ''}`} disabled={busy} onClick={onConfirm} type="button">{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
