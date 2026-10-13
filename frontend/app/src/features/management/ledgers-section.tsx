import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DialogShell } from '@/components/ui/dialog-shell'
import { GroupedSection } from '@/components/ui/grouped-section'
import { TextField } from '@/components/ui/text-field'
import type { LedgerItem } from '@/features/management/management-api'
import { useCreateLedger, useDeleteLedger, useManagementOverview, useUpdateLedger } from '@/features/management/management-hooks'
import { getFriendlyApiErrorMessage } from '@/lib/api'
import { ListRowsSkeleton, ListLoadError, ROW_ICON_BUTTON_CLASS } from './section-states'

type LedgerDialogState = { mode: 'create' } | { mode: 'rename'; ledger: LedgerItem } | { mode: 'delete'; ledger: LedgerItem }

export function LedgersSection() {
  const { t } = useTranslation()
  const { ledgersQuery } = useManagementOverview({ includeCategories: false, includeTags: false })
  const [dialog, setDialog] = useState<LedgerDialogState | null>(null)
  const ledgers = ledgersQuery.data?.items ?? []

  return (
    <GroupedSection
      id="settings-ledgers"
      title={t('settingsPage.ledgers.title')}
      description={t('settingsPage.ledgers.description')}
      action={
        <Button variant="secondary" className="min-h-11 px-3 text-[13px] md:min-h-9" onClick={() => setDialog({ mode: 'create' })}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t('settingsPage.ledgers.new')}
        </Button>
      }
    >
      {ledgersQuery.isPending ? <ListRowsSkeleton rows={2} /> : null}
      {ledgersQuery.isError && !ledgersQuery.data ? (
        <ListLoadError error={ledgersQuery.error} onRetry={() => void ledgersQuery.refetch()} retrying={ledgersQuery.isFetching} />
      ) : null}
      {ledgersQuery.isSuccess && ledgers.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink-secondary">{t('settingsPage.ledgers.empty')}</p>
      ) : null}
      {ledgers.length > 0 ? (
        <ul className="divide-y divide-black/10">
          {ledgers.map((ledger) => (
            <li key={ledger.id} className="flex min-h-14 items-center gap-1 py-1.5 pl-4 pr-2">
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[15px] font-medium text-ink">{ledger.name}</span>
                  {ledger.is_default ? (
                    <span className="shrink-0 rounded-full bg-action-tint px-2 py-0.5 text-[11px] font-semibold text-action">
                      {t('settingsPage.ledgers.defaultBadge')}
                    </span>
                  ) : null}
                </p>
                {ledger.is_default ? <p className="text-xs text-ink-tertiary">{t('settingsPage.ledgers.defaultHint')}</p> : null}
              </div>
              <button
                type="button"
                aria-label={t('settingsPage.ledgers.renameLabel', { name: ledger.name })}
                className={ROW_ICON_BUTTON_CLASS}
                onClick={() => setDialog({ mode: 'rename', ledger })}
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
              </button>
              {!ledger.is_default ? (
                <button
                  type="button"
                  aria-label={t('settingsPage.ledgers.deleteLabel', { name: ledger.name })}
                  className={`${ROW_ICON_BUTTON_CLASS} hover:!bg-error-container hover:!text-error`}
                  onClick={() => setDialog({ mode: 'delete', ledger })}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              ) : (
                // Keeps the rename button in the same column as on deletable rows.
                <span aria-hidden="true" className="h-11 w-11 shrink-0" />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {dialog?.mode === 'delete' ? (
        <DeleteLedgerDialog ledger={dialog.ledger} onClose={() => setDialog(null)} />
      ) : dialog ? (
        <LedgerNameDialog key={dialog.mode === 'rename' ? dialog.ledger.id : 'create'} state={dialog} onClose={() => setDialog(null)} />
      ) : null}
    </GroupedSection>
  )
}

function LedgerNameDialog({ state, onClose }: { state: Exclude<LedgerDialogState, { mode: 'delete' }>; onClose: () => void }) {
  const { t } = useTranslation()
  const createLedgerMutation = useCreateLedger()
  const updateLedgerMutation = useUpdateLedger()
  const renaming = state.mode === 'rename' ? state.ledger : null
  const [name, setName] = useState(renaming?.name ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const pending = createLedgerMutation.isPending || updateLedgerMutation.isPending
  const trimmed = name.trim()
  const formId = renaming ? 'rename-ledger-form' : 'create-ledger-form'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (!trimmed) return
    try {
      if (renaming) {
        await updateLedgerMutation.mutateAsync({ id: renaming.id, name: trimmed })
      } else {
        await createLedgerMutation.mutateAsync({ name: trimmed, is_default: false })
      }
      onClose()
    } catch (error) {
      setFormError(t('settingsPage.ledgers.failed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  return (
    <DialogShell
      title={renaming ? t('settingsPage.ledgers.renameTitle') : t('settingsPage.ledgers.createTitle')}
      description={renaming ? undefined : t('settingsPage.ledgers.createDescription')}
      onClose={pending ? undefined : onClose}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} className="min-h-11" disabled={pending} aria-busy={pending}>
            {pending ? t('common.working') : renaming ? t('common.saveChanges') : t('settingsPage.ledgers.create')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <TextField
          label={t('settingsPage.ledgers.name')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          required
          autoComplete="off"
          error={submitted && !trimmed ? t('settingsPage.ledgers.nameRequired') : undefined}
        />
        {formError ? (
          <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm font-medium text-on-error-container">
            {formError}
          </p>
        ) : null}
      </form>
    </DialogShell>
  )
}

function DeleteLedgerDialog({ ledger, onClose }: { ledger: LedgerItem; onClose: () => void }) {
  const { t } = useTranslation()
  const deleteLedgerMutation = useDeleteLedger()
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    try {
      await deleteLedgerMutation.mutateAsync(ledger.id)
      onClose()
    } catch (deleteError) {
      setError(t('settingsPage.ledgers.failed', { message: getFriendlyApiErrorMessage(deleteError, t) }))
    }
  }

  return (
    <ConfirmDialog
      title={t('settingsPage.ledgers.deleteConfirmTitle', { name: ledger.name })}
      description={t('settingsPage.ledgers.deleteConfirmBody')}
      confirmLabel={t('settingsPage.ledgers.delete')}
      pending={deleteLedgerMutation.isPending}
      error={error}
      onConfirm={() => void handleConfirm()}
      onCancel={onClose}
    />
  )
}
