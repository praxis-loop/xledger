import { CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { getFriendlyApiErrorMessage } from '@/lib/api'

export const ROW_ICON_BUTTON_CLASS =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-secondary transition hover:bg-action-tint hover:text-action disabled:opacity-50 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action'

export function ListRowsSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden="true" className="divide-y divide-black/10">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex min-h-14 items-center px-4">
            <div className="h-3.5 w-1/3 rounded bg-ground motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListLoadError({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-3">
      <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-error" />
      <p className="min-w-0 flex-1 text-sm text-ink-secondary">
        {t('settingsPage.loadFailed', { message: getFriendlyApiErrorMessage(error, t) })}
      </p>
      <Button variant="secondary" className="min-h-11 px-3 text-[13px] md:min-h-9" onClick={onRetry} disabled={retrying}>
        {t('common.retry')}
      </Button>
    </div>
  )
}
