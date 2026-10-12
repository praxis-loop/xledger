import { Download, KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { GroupedSection } from '@/components/ui/grouped-section'
import { CategoriesSection } from '@/features/management/categories-section'
import { LedgersSection } from '@/features/management/ledgers-section'
import { useCreatePAT, useExportCsv, usePATs, useRevokePAT } from '@/features/management/management-hooks'
import type { PATItem } from '@/features/management/management-api'
import { ListLoadError, ListRowsSkeleton } from '@/features/management/section-states'
import { TagsSection } from '@/features/management/tags-section'
import { getFriendlyApiErrorMessage } from '@/lib/api'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-headline text-[34px] font-bold leading-tight tracking-normal text-ink md:text-[44px] md:font-extrabold">
          {t('settingsPage.title')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-ink-secondary md:text-sm">{t('settingsPage.description')}</p>
      </header>

      <LedgersSection />
      <CategoriesSection />
      <TagsSection />
      <DataSection />
    </div>
  )
}

function DataSection() {
  const { t } = useTranslation()
  const [latestSecret, setLatestSecret] = useState<string | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<PATItem | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const patsQuery = usePATs()
  const createPATMutation = useCreatePAT()
  const revokePATMutation = useRevokePAT()
  const exportCsvMutation = useExportCsv()
  const pats = patsQuery.data?.items ?? []

  async function handleCreatePAT() {
    setActionError(null)
    try {
      const result = await createPATMutation.mutateAsync()
      setLatestSecret(result.token)
    } catch (error) {
      setActionError(t('settingsPage.loadFailed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  async function handleRevoke() {
    if (!pendingRevoke) return
    setRevokeError(null)
    try {
      await revokePATMutation.mutateAsync(pendingRevoke.id)
      setPendingRevoke(null)
    } catch (error) {
      setRevokeError(t('settingsPage.loadFailed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  async function handleExportCsv() {
    setActionError(null)
    try {
      const content = await exportCsvMutation.mutateAsync()
      const blob = new Blob([content], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'xledger-export.csv'
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      try {
        anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      } finally {
        anchor.remove()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      setActionError(t('settingsPage.exportFailed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  return (
    <GroupedSection id="settings-data" title={t('settingsPage.dataSection')}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[15px] font-medium text-ink">{t('settingsPage.exportCsv')}</p>
          <p className="text-xs leading-5 text-ink-tertiary">{t('settingsPage.exportCsvDescription')}</p>
        </div>
        <Button
          variant="secondary"
          className="min-h-11 px-3 text-[13px] md:min-h-9"
          onClick={() => void handleExportCsv()}
          disabled={exportCsvMutation.isPending}
          aria-busy={exportCsvMutation.isPending}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          {exportCsvMutation.isPending ? t('common.working') : t('settingsPage.exportCsv')}
        </Button>
      </div>

      <div className="border-t border-black/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-[15px] font-medium text-ink">{t('settingsPage.personalAccessTokens')}</p>
            <p className="text-xs leading-5 text-ink-tertiary">{t('settingsPage.patWarning')}</p>
          </div>
          <Button
            variant="secondary"
            className="min-h-11 px-3 text-[13px] md:min-h-9"
            onClick={() => void handleCreatePAT()}
            disabled={createPATMutation.isPending}
            aria-busy={createPATMutation.isPending}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t('settingsPage.createPat')}
          </Button>
        </div>

        {actionError ? (
          <p role="alert" className="mt-3 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
            {actionError}
          </p>
        ) : null}

        {latestSecret ? (
          <div role="status" className="mt-3 rounded-lg border border-action/20 bg-action-tint p-3">
            <p className="text-[13px] font-semibold text-ink">{t('settingsPage.latestSecret')}</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-secondary">{t('settingsPage.secretHint')}</p>
            <p className="mt-2 select-all break-all rounded-md bg-white px-3 py-2 font-mono text-sm text-ink">{latestSecret}</p>
          </div>
        ) : null}
      </div>

      {patsQuery.isPending ? <ListRowsSkeleton rows={1} /> : null}
      {patsQuery.isError && !patsQuery.data ? (
        <ListLoadError error={patsQuery.error} onRetry={() => void patsQuery.refetch()} retrying={patsQuery.isFetching} />
      ) : null}
      {patsQuery.isSuccess && pats.length === 0 ? (
        <div className="border-t border-black/10 px-4 py-3">
          <p className="text-sm text-ink-secondary">{t('settingsPage.noPat')}</p>
          <p className="text-xs leading-5 text-ink-tertiary">{t('settingsPage.noPatHint')}</p>
        </div>
      ) : null}
      {pats.length > 0 ? (
        <ul className="divide-y divide-black/10 border-t border-black/10">
          {pats.map((pat) => (
            <li key={pat.id} className="flex min-h-14 items-center gap-3 py-1.5 pl-4 pr-2">
              <KeyRound aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-ink">{pat.id}</p>
                {pat.name ? <p className="truncate text-xs text-ink-tertiary">{pat.name}</p> : null}
              </div>
              <Button
                variant="destructive-ghost"
                className="min-h-11 shrink-0 px-3 text-[13px]"
                onClick={() => {
                  setRevokeError(null)
                  setPendingRevoke(pat)
                }}
              >
                {t('settingsPage.revoke', { id: pat.id })}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {pendingRevoke ? (
        <ConfirmDialog
          title={t('settingsPage.revokeConfirmTitle')}
          description={t('settingsPage.revokeConfirmBody')}
          confirmLabel={t('settingsPage.revokeConfirm')}
          pending={revokePATMutation.isPending}
          error={revokeError}
          onConfirm={() => void handleRevoke()}
          onCancel={() => setPendingRevoke(null)}
        />
      ) : null}
    </GroupedSection>
  )
}
