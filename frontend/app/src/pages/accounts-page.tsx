import { Banknote, ChevronRight, CircleAlert, CircleDollarSign, CreditCard, Landmark, Pencil, Plus, Wallet, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DialogShell } from '@/components/ui/dialog-shell'
import { SelectField } from '@/components/ui/select-field'
import { TextField } from '@/components/ui/text-field'
import { ACCOUNT_TYPES, getAccountTypeLabelKey, isKnownAccountType, type AccountType } from '@/features/management/account-types'
import type { AccountItem } from '@/features/management/management-api'
import { useCreateAccount, useManagementOverview, useUpdateAccount } from '@/features/management/management-hooks'
import { getFriendlyApiErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  debit: Landmark,
  credit: CreditCard,
  cash: Banknote,
  ewallet: Wallet,
}

const FOCUS_RING_CLASS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action'

function getCurrentBalance(account: AccountItem) {
  return typeof account.current_balance === 'number' && Number.isFinite(account.current_balance)
    ? account.current_balance
    : account.initial_balance
}

// Accepts "1,280.50", "¥1280.5", "-20" and blank (= 0). Returns null for anything else.
function parseAmountInput(value: string) {
  const normalized = value.replace(/[,\s¥]/g, '')
  if (normalized === '') return 0
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Number(normalized)
}

type AccountDialogState = { mode: 'create' } | { mode: 'edit'; account: AccountItem }

export function AccountsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<AccountDialogState | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const { accountsQuery } = useManagementOverview({ includeCategories: false, includeTags: false })
  const updateAccountMutation = useUpdateAccount()

  const { activeAccounts, archivedAccounts, assets, liabilities } = useMemo(() => {
    const items = accountsQuery.data?.items ?? []
    const active = items.filter((account) => !account.archived_at)
    const archived = items.filter((account) => Boolean(account.archived_at))
    let positive = 0
    let negative = 0
    for (const account of active) {
      const balance = getCurrentBalance(account)
      if (balance >= 0) positive += balance
      else negative += balance
    }
    return { activeAccounts: active, archivedAccounts: archived, assets: positive, liabilities: Math.abs(negative) }
  }, [accountsQuery.data?.items])

  const hasData = accountsQuery.isSuccess
  const isEmpty = hasData && activeAccounts.length === 0 && archivedAccounts.length === 0

  async function handleRestore(account: AccountItem) {
    setRestoreError(null)
    try {
      await updateAccountMutation.mutateAsync({ id: account.id, archived: false })
    } catch (error) {
      setRestoreError(t('accountsPage.restoreFailed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-[34px] font-bold leading-tight tracking-normal text-ink md:text-[44px] md:font-extrabold">
            {t('accountsPage.title')}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-ink-secondary md:text-sm">{t('accountsPage.description')}</p>
        </div>
        {!isEmpty ? (
          <Button className="min-h-11 w-full sm:w-auto" onClick={() => setDialog({ mode: 'create' })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t('accountsPage.newAccount')}
          </Button>
        ) : null}
      </header>

      {accountsQuery.isPending ? <AccountsSkeleton label={t('accountsPage.loading')} /> : null}

      {accountsQuery.isError && !hasData ? (
        <section role="alert" className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-start gap-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{t('accountsPage.loadFailed')}</h2>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">
                {t('accountsPage.loadFailedHint', { message: getFriendlyApiErrorMessage(accountsQuery.error, t) })}
              </p>
              <Button variant="secondary" className="mt-3 min-h-11" onClick={() => void accountsQuery.refetch()} disabled={accountsQuery.isFetching}>
                {t('common.retry')}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {isEmpty ? (
        <section className="rounded-lg border border-black/10 bg-white px-5 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-action-tint text-action">
            <Wallet aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">{t('accountsPage.empty.title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-secondary">{t('accountsPage.empty.body')}</p>
          <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <Button className="min-h-11" onClick={() => setDialog({ mode: 'create' })}>
              {t('accountsPage.empty.createFirstAccount')}
            </Button>
            <Button variant="secondary" className="min-h-11" onClick={() => navigate('/transactions')}>
              {t('accountsPage.empty.goToTransactions')}
            </Button>
          </div>
        </section>
      ) : null}

      {hasData && !isEmpty ? (
        <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section aria-labelledby="total-assets-label" className="rounded-lg bg-action p-4 text-white md:p-5 lg:sticky lg:top-24">
            <p id="total-assets-label" className="text-[13px] font-semibold">
              {t('accountsPage.totalAssets')}
            </p>
            <p className="mt-2 break-words font-headline text-[34px] font-bold leading-none tabular-nums md:text-[40px]">
              {formatCurrency(assets - liabilities)}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/25 pt-3">
              <div className="min-w-0">
                <dt className="text-xs font-medium">{t('accountsPage.assets')}</dt>
                <dd className="mt-0.5 truncate text-base font-semibold tabular-nums">{formatCurrency(assets)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium">{t('accountsPage.liabilities')}</dt>
                <dd className="mt-0.5 truncate text-base font-semibold tabular-nums">{formatCurrency(liabilities)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5">{t('accountsPage.totalHint')}</p>
          </section>

          <div className="min-w-0 space-y-5">
            <section aria-labelledby="active-accounts-heading">
              <h2 id="active-accounts-heading" className="mb-2 px-1 text-[13px] font-semibold text-ink-secondary">
                {t('accountsPage.activeAccounts', { count: activeAccounts.length })}
              </h2>
              {activeAccounts.length > 0 ? (
                <ul className="divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-white">
                  {activeAccounts.map((account) => (
                    <AccountRow key={account.id} account={account} onEdit={() => setDialog({ mode: 'edit', account })} />
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-black/10 bg-white px-4 py-4 text-sm text-ink-secondary">
                  {t('accountsPage.noActiveAccounts')}
                </p>
              )}
            </section>

            {archivedAccounts.length > 0 ? (
              <details className="group rounded-lg border border-black/10 bg-white">
                <summary
                  className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-ink-secondary hover:bg-ground [&::-webkit-details-marker]:hidden ${FOCUS_RING_CLASS}`}
                >
                  {t('accountsPage.archivedAccounts', { count: archivedAccounts.length })}
                  <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
                </summary>
                <p className="border-t border-black/10 px-4 py-2 text-xs leading-5 text-ink-tertiary">{t('accountsPage.archivedHint')}</p>
                {restoreError ? (
                  <p role="alert" className="mx-4 mb-2 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
                    {restoreError}
                  </p>
                ) : null}
                <ul className="divide-y divide-black/10 border-t border-black/10">
                  {archivedAccounts.map((account) => (
                    <li key={account.id} className="flex items-center gap-3 py-2 pl-4 pr-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-ink-secondary">{account.name}</p>
                        <p className="truncate text-xs text-ink-tertiary">{t(getAccountTypeLabelKey(account.type))}</p>
                      </div>
                      <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink-tertiary">
                        {formatCurrency(getCurrentBalance(account))}
                      </p>
                      <Button
                        variant="ghost"
                        className="min-h-11 shrink-0 px-3"
                        aria-label={t('accountsPage.restoreAccountLabel', { name: account.name })}
                        disabled={updateAccountMutation.isPending}
                        onClick={() => void handleRestore(account)}
                      >
                        {t('accountsPage.restoreAccount')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      {dialog ? (
        <AccountDialog
          key={dialog.mode === 'edit' ? dialog.account.id : 'create'}
          state={dialog}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  )
}

function AccountsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="h-[188px] rounded-lg bg-segment-track motion-safe:animate-pulse" />
      <div aria-hidden="true" className="space-y-px overflow-hidden rounded-lg border border-black/10 bg-white">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 px-4 py-4">
            <div className="h-9 w-9 rounded-full bg-ground motion-safe:animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-ground motion-safe:animate-pulse" />
              <div className="h-3 w-1/5 rounded bg-ground motion-safe:animate-pulse" />
            </div>
            <div className="h-4 w-20 rounded bg-ground motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AccountRow({ account, onEdit }: { account: AccountItem; onEdit: () => void }) {
  const { t } = useTranslation()
  const balance = getCurrentBalance(account)
  const Icon = isKnownAccountType(account.type) ? ACCOUNT_TYPE_ICONS[account.type] : CircleDollarSign
  const meta = [t(getAccountTypeLabelKey(account.type))]
  if (balance < 0) meta.push(t('accountsPage.owed'))
  if (account.initial_balance !== balance) {
    meta.push(t('accountsPage.openingBalance', { amount: formatCurrency(account.initial_balance) }))
  }

  return (
    <li className="flex items-center gap-1 pr-2">
      <Link
        to={`/transactions?account=${encodeURIComponent(account.id)}`}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 transition-colors hover:bg-ground focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-ground text-ink-secondary sm:grid">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-5 text-ink">{account.name}</span>
          <span className="mt-0.5 block truncate text-xs leading-5 text-ink-tertiary">{meta.join(' · ')}</span>
        </span>
        <span className="shrink-0 text-right text-[15px] font-bold tabular-nums text-ink sm:text-[17px]">{formatCurrency(balance)}</span>
        <span className="sr-only">{t('accountsPage.viewTransactions')}</span>
        <ChevronRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-ink-tertiary sm:block" />
      </Link>
      <button
        type="button"
        aria-label={t('accountsPage.editAccountLabel', { name: account.name })}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-secondary transition hover:bg-action-tint hover:text-action motion-reduce:transition-none ${FOCUS_RING_CLASS}`}
        onClick={onEdit}
      >
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </button>
    </li>
  )
}

function AccountDialog({ state, onClose }: { state: AccountDialogState; onClose: () => void }) {
  const { t } = useTranslation()
  const createAccountMutation = useCreateAccount()
  const updateAccountMutation = useUpdateAccount()
  const editing = state.mode === 'edit' ? state.account : null

  const [name, setName] = useState(editing?.name ?? '')
  const [type, setType] = useState<string>(editing?.type ?? 'debit')
  const [balanceInput, setBalanceInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const trimmedName = name.trim()
  const parsedBalance = parseAmountInput(balanceInput)
  const nameError = submitted && !trimmedName ? t('accountsPage.dialogs.accountNameRequired') : undefined
  const balanceError = submitted && parsedBalance === null ? t('accountsPage.dialogs.initialBalanceInvalid') : undefined
  const isCredit = type === 'credit'
  const pending = createAccountMutation.isPending || updateAccountMutation.isPending
  const formId = editing ? 'edit-account-form' : 'create-account-form'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (!trimmedName || (!editing && parsedBalance === null)) return

    try {
      if (editing) {
        await updateAccountMutation.mutateAsync({
          id: editing.id,
          name: trimmedName !== editing.name ? trimmedName : undefined,
          type: type !== editing.type ? type : undefined,
        })
      } else {
        // Credit cards ask for the amount owed as a positive number; store it as a liability.
        const amount = parsedBalance ?? 0
        await createAccountMutation.mutateAsync({
          name: trimmedName,
          type,
          initial_balance: isCredit ? -Math.abs(amount) : amount,
        })
      }
      onClose()
    } catch (error) {
      setFormError(t('accountsPage.dialogs.saveFailed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  async function handleArchive() {
    if (!editing) return
    setArchiveError(null)
    try {
      await updateAccountMutation.mutateAsync({ id: editing.id, archived: true })
      onClose()
    } catch (error) {
      setArchiveError(t('accountsPage.dialogs.saveFailed', { message: getFriendlyApiErrorMessage(error, t) }))
    }
  }

  if (confirmArchive && editing) {
    return (
      <ConfirmDialog
        title={t('accountsPage.dialogs.archiveConfirmTitle', { name: editing.name })}
        description={t('accountsPage.dialogs.archiveConfirmBody', { amount: formatCurrency(getCurrentBalance(editing)) })}
        confirmLabel={t('accountsPage.dialogs.archiveAccount')}
        pending={updateAccountMutation.isPending}
        error={archiveError}
        onConfirm={() => void handleArchive()}
        onCancel={() => setConfirmArchive(false)}
      />
    )
  }

  return (
    <DialogShell
      title={editing ? t('accountsPage.dialogs.editAccountTitle') : t('accountsPage.dialogs.createAccountTitle')}
      description={editing ? t('accountsPage.dialogs.editAccountDescription') : t('accountsPage.dialogs.createAccountDescription')}
      onClose={pending ? undefined : onClose}
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} className="min-h-11" disabled={pending} aria-busy={pending}>
            {pending
              ? editing
                ? t('accountsPage.dialogs.saving')
                : t('accountsPage.dialogs.creating')
              : editing
                ? t('common.saveChanges')
                : t('accountsPage.dialogs.create')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate className="grid gap-4 md:grid-cols-2 md:gap-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="md:col-span-2">
          <TextField
            label={t('accountsPage.dialogs.accountName')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('accountsPage.dialogs.accountNamePlaceholder')}
            maxLength={60}
            required
            aria-invalid={nameError ? true : undefined}
            error={nameError}
            autoComplete="off"
          />
        </div>
        <SelectField label={t('accountsPage.dialogs.accountType')} value={type} onChange={(event) => setType(event.target.value)}>
          {ACCOUNT_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`accountTypes.${value}`)}
            </option>
          ))}
          {editing && !isKnownAccountType(editing.type) ? (
            <option value={editing.type}>{t('accountsPage.dialogs.otherType', { value: editing.type })}</option>
          ) : null}
        </SelectField>
        {!editing ? (
          <TextField
            label={isCredit ? t('accountsPage.dialogs.initialDebt') : t('accountsPage.dialogs.initialBalance')}
            value={balanceInput}
            onChange={(event) => setBalanceInput(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            aria-invalid={balanceError ? true : undefined}
            error={balanceError}
            helperText={isCredit ? t('accountsPage.dialogs.initialDebtHelper') : t('accountsPage.dialogs.initialBalanceHelper')}
            autoComplete="off"
          />
        ) : null}
        {formError ? (
          <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm font-medium text-on-error-container md:col-span-2">
            {formError}
          </p>
        ) : null}
        {editing ? (
          <div className="border-t border-black/10 pt-4 md:col-span-2">
            <p className="text-sm font-semibold text-ink">{t('accountsPage.dialogs.archiveSectionTitle')}</p>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">{t('accountsPage.dialogs.archiveSectionBody')}</p>
            <Button
              variant="destructive-ghost"
              className="-ml-3 mt-1 min-h-11 px-3"
              onClick={() => setConfirmArchive(true)}
              disabled={pending}
            >
              {t('accountsPage.dialogs.archiveAccount')}
            </Button>
          </div>
        ) : null}
      </form>
    </DialogShell>
  )
}
