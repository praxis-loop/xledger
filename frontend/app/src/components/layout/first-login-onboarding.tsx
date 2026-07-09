import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useManagementOverview } from '@/features/management/management-hooks'
import { useTransactionsWithOptions } from '@/features/transactions/transactions-hooks'

function getDismissKey(email: string) {
  return `xledger.first-login-onboarding.dismissed:${email.toLowerCase()}`
}

function getItemCount(data?: { items?: unknown }) {
  return Array.isArray(data?.items) ? data.items.length : 0
}

function getFirstAccountName(data?: { items?: unknown }) {
  if (!Array.isArray(data?.items)) return null
  const account = data.items[0]
  if (typeof account !== 'object' || account === null || !('name' in account)) return null
  const name = account.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export function FirstLoginOnboarding() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [dismissed, setDismissed] = useState(true)
  const shouldEvaluate = !['/login', '/auth/google/callback'].includes(location.pathname)
  const isSetupRoute = ['/accounts', '/transactions'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  )
  const shouldLoadSetupState = Boolean(session?.email) && shouldEvaluate && !isSetupRoute && !dismissed

  useEffect(() => {
    if (!session?.email) {
      setDismissed(true)
      return
    }
    const key = getDismissKey(session.email)
    setDismissed(window.localStorage.getItem(key) === '1')
  }, [session?.email])

  const { accountsQuery, ledgersQuery } = useManagementOverview({
    enabled: shouldLoadSetupState,
    includeCategories: false,
    includeTags: false,
  })
  const transactionsQuery = useTransactionsWithOptions({ page: 1, pageSize: 1, enabled: shouldLoadSetupState })
  const accountsCount = getItemCount(accountsQuery.data)
  const ledgersCount = getItemCount(ledgersQuery.data)
  const transactionsCount = getItemCount(transactionsQuery.data)
  const firstAccountName = getFirstAccountName(accountsQuery.data)
  const completedSteps = (accountsCount > 0 ? 1 : 0) + (transactionsCount > 0 ? 1 : 0)

  const isReady =
    shouldEvaluate &&
    !accountsQuery.isLoading &&
    !ledgersQuery.isLoading &&
    !transactionsQuery.isLoading &&
    !accountsQuery.isError &&
    !ledgersQuery.isError &&
    !transactionsQuery.isError

  const shouldShow = useMemo(() => {
    if (!session?.email || dismissed || !isReady || isSetupRoute) {
      return false
    }
    return transactionsCount === 0 && ledgersCount <= 1
  }, [dismissed, isReady, isSetupRoute, ledgersCount, session?.email, transactionsCount])

  function dismiss() {
    if (session?.email) {
      window.localStorage.setItem(getDismissKey(session.email), '1')
    }
    setDismissed(true)
  }

  if (!shouldShow) {
    return null
  }

  return (
    <section
      aria-labelledby="first-login-onboarding-title"
      className="mb-4 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm md:mb-5 md:p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {t('layout.firstLogin.eyebrow')}
          </p>
          <h2 id="first-login-onboarding-title" className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface md:text-3xl">
            {t('layout.firstLogin.title')}
          </h2>
          <p className="mt-2 max-w-[62ch] text-sm text-on-surface-variant">
            {t('layout.firstLogin.description')}
          </p>
        </div>

        <div className="min-w-0 flex-1 rounded-xl border border-outline/10 bg-surface-container-low p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {t('layout.firstLogin.checklistTitle')}
            </p>
            <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">
              {t('layout.firstLogin.progress', { completed: completedSteps })}
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-3">
              <p className="text-sm font-bold text-on-surface">
                {accountsCount > 0 ? t('layout.firstLogin.completedPrefix') : null}
                {t('layout.firstLogin.accountStepTitle')}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {firstAccountName
                  ? t('layout.firstLogin.accountReady', { account: firstAccountName })
                  : t('layout.firstLogin.accountStepDescription')}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-2 ring-primary/20">
              <p className="text-sm font-bold text-on-surface">
                {accountsCount > 0 ? t('layout.firstLogin.nextUpPrefix') : null}
                {t('layout.firstLogin.transactionStepTitle')}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">{t('layout.firstLogin.transactionStepDescription')}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-on-surface-variant">{t('layout.firstLogin.tip')}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          className="px-3 py-2 text-sm"
          onClick={() => {
            void navigate('/accounts')
          }}
        >
          {t('layout.firstLogin.setUpAccounts')}
        </Button>
        <Button
          className="px-3 py-2 text-sm"
          variant="secondary"
          onClick={() => {
            void navigate('/transactions')
          }}
        >
          {t('layout.firstLogin.addTransaction')}
        </Button>
        <Button className="px-3 py-2 text-sm sm:ml-auto" variant="ghost" onClick={dismiss}>
          {t('layout.firstLogin.skip')}
        </Button>
      </div>
    </section>
  )
}
