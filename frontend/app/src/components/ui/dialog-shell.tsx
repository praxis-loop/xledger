import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogShellProps extends PropsWithChildren {
  title: string
  description?: string
  footer?: ReactNode
  className?: string
  onClose?: () => void
}

// Native modal <dialog>: the browser supplies the dialog role, inert background, focus containment and Esc.
// We only add initial focus on the first field, focus restore on close, and backdrop-click dismissal.
export function DialogShell({ title, description, footer, className, children, onClose }: DialogShellProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      // jsdom and very old browsers: fall back to a non-modal open dialog.
      dialog.setAttribute('open', '')
    }

    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
      opener?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'm-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white p-5 text-ink shadow-ambient backdrop:bg-[#0f172a]/25 backdrop:backdrop-blur-sm md:p-6',
        className,
      )}
      onCancel={(event) => {
        // Esc: let React own the open state instead of the browser closing the element underneath it.
        event.preventDefault()
        onCloseRef.current?.()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || !onCloseRef.current) return
        const rect = event.currentTarget.getBoundingClientRect()
        const inside =
          event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
        if (!inside) onCloseRef.current()
      }}
    >
      <div>
        <h2 id={titleId} className="pr-12 font-headline text-2xl font-bold leading-tight text-ink md:text-[28px]">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 pr-12 text-sm leading-6 text-ink-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
      {footer ? <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{footer}</div> : null}
      {onClose ? (
        // Last in DOM order so the browser's initial focus lands on the first field, not on "close".
        <button
          type="button"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-ground text-ink-secondary transition hover:bg-segment-track focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none md:right-4 md:top-4"
          onClick={onClose}
          aria-label={t('common.closeDialog')}
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
    </dialog>
  )
}
