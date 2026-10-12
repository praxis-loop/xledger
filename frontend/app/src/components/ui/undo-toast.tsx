import { useEffect, useRef } from 'react'
import { Undo2 } from 'lucide-react'

interface UndoToastProps {
  message: string
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
  pending?: boolean
  durationMs?: number
}

// Bottom toast offering undo for a reversible action. Sits above the mobile tab bar; announced politely.
export function UndoToast({ message, actionLabel, onAction, onDismiss, pending = false, durationMs = 6000 }: UndoToastProps) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (pending) return
    const timer = window.setTimeout(() => onDismissRef.current(), durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, message, pending])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(5rem+var(--safe-area-bottom))] left-1/2 z-30 flex w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-ink px-5 py-3 text-white shadow-ambient min-[1000px]:bottom-6"
    >
      <p className="min-w-0 text-sm font-medium">{message}</p>
      <button
        type="button"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-ink transition hover:bg-ground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 motion-reduce:transition-none"
        onClick={onAction}
        disabled={pending}
      >
        <Undo2 aria-hidden="true" className="h-4 w-4" />
        {actionLabel}
      </button>
    </div>
  )
}
