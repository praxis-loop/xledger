import { useEffect, type PropsWithChildren, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogShellProps extends PropsWithChildren {
  title: string
  description?: string
  footer?: ReactNode
  className?: string
  onClose?: () => void
}

export function DialogShell({ title, description, footer, className, children, onClose }: DialogShellProps) {
  useEffect(() => {
    if (!onClose) {
      return
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/24 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div className={cn('relative max-h-[calc(100dvh-32px)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white p-5 shadow-ambient md:p-6', className)}>
        {onClose ? (
          <button
            type="button"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-ground text-ink-secondary transition hover:bg-segment-track focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none md:right-4 md:top-4"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
        <div>
          <h2 className="pr-12 font-headline text-2xl font-bold leading-tight text-ink md:text-[28px]">{title}</h2>
          {description ? <p className="mt-2 pr-12 text-sm leading-6 text-ink-secondary">{description}</p> : null}
        </div>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  )
}
