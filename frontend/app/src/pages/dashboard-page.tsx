import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOverviewStats, useTrendStatsRange } from '@/features/reporting/reporting-hooks'
import type { TransactionRecord } from '@/features/transactions/transactions-api'
import { useTransactionsWithOptions } from '@/features/transactions/transactions-hooks'
import { buildReviewSummary } from '@/features/transactions/review-rules'
import { formatCurrency } from '@/lib/format'
import { localDateFromBucket } from '@/lib/dates'
import { DashboardMetricCard } from '@/components/ui/dashboard-metric-card'
import { SegmentedControl } from '@/components/ui/segmented-control'

const periods = ['today', 'week', 'month', 'year'] as const

type Period = (typeof periods)[number]

type TrendBar = {
  key: string
  label: string
  income: number
  expense: number
  total: number
}

type DateRange = {
  from: string
  to: string
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfWeek(date: Date) {
  const d = startOfDay(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function getRangeForMonthKey(key: string): DateRange | null {
  const [rawYear, rawMonth] = key.split('-')
  const year = Number(rawYear)
  const month = Number(rawMonth)
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null
  return {
    from: startOfDay(new Date(year, month, 1)).toISOString(),
    to: endOfDay(new Date(year, month + 1, 0)).toISOString(),
  }
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, new Date(year, month + 1, 0).getDate())
}

function getCurrentPeriodRange(period: Period, anchor = new Date()): DateRange {
  if (period === 'today') {
    return { from: startOfDay(anchor).toISOString(), to: endOfDay(anchor).toISOString() }
  }
  if (period === 'week') {
    return { from: startOfWeek(anchor).toISOString(), to: endOfDay(anchor).toISOString() }
  }
  if (period === 'month') {
    return {
      from: startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1)).toISOString(),
      to: endOfDay(anchor).toISOString(),
    }
  }
  return {
    from: startOfDay(new Date(anchor.getFullYear(), 0, 1)).toISOString(),
    to: endOfDay(anchor).toISOString(),
  }
}

function getPreviousPeriodRange(period: Period, anchor = new Date()): DateRange {
  if (period === 'today') {
    const previous = new Date(anchor)
    previous.setDate(previous.getDate() - 1)
    return { from: startOfDay(previous).toISOString(), to: endOfDay(previous).toISOString() }
  }

  if (period === 'week') {
    const start = startOfWeek(anchor)
    const previousStart = new Date(start)
    previousStart.setDate(previousStart.getDate() - 7)
    const previousEnd = new Date(anchor)
    previousEnd.setDate(previousEnd.getDate() - 7)
    return { from: previousStart.toISOString(), to: endOfDay(previousEnd).toISOString() }
  }

  if (period === 'month') {
    const year = anchor.getFullYear()
    const month = anchor.getMonth() - 1
    const day = clampDay(year, month, anchor.getDate())
    return {
      from: startOfDay(new Date(year, month, 1)).toISOString(),
      to: endOfDay(new Date(year, month, day)).toISOString(),
    }
  }

  const previousYear = anchor.getFullYear() - 1
  const month = anchor.getMonth()
  const day = clampDay(previousYear, month, anchor.getDate())
  return {
    from: startOfDay(new Date(previousYear, 0, 1)).toISOString(),
    to: endOfDay(new Date(previousYear, month, day)).toISOString(),
  }
}

function pctLabel(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return '0.0%'
  const percent = ((current - previous) / Math.abs(previous)) * 100
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

function buildActionCenter(transactions: TransactionRecord[]) {
  const reviewSummary = buildReviewSummary(transactions)
  const topExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0]

  return {
    reviewCount: reviewSummary.review,
    duplicateCount: reviewSummary.duplicates,
    uncategorizedCount: reviewSummary.uncategorized,
    topExpense,
  }
}

function buildLast12MonthBars(points: Array<{ bucket_start: string; income: number; expense: number }>, locale: string): TrendBar[] {
  const now = new Date()
  const monthKeys: Array<{ key: string; label: string }> = []
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString(locale, { month: 'short' }).toUpperCase(),
    })
  }

  const map = new Map<string, TrendBar>()
  monthKeys.forEach((item) => {
    map.set(item.key, { key: item.key, label: item.label, income: 0, expense: 0, total: 0 })
  })

  points.forEach((point) => {
    const dt = localDateFromBucket(point.bucket_start)
    const key = getMonthKey(dt)
    const bucket = map.get(key)
    if (!bucket) return
    bucket.income += point.income
    bucket.expense += point.expense
    bucket.total = bucket.income + bucket.expense
  })

  return monthKeys.map((item) => map.get(item.key) as TrendBar)
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const [period, setPeriod] = useState<Period>('month')
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const navigate = useNavigate()

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
    const hasDismissed = localStorage.getItem('pwa-onboarding-dismissed')
    if (isIOS && !isStandalone && !hasDismissed) {
      navigate('/install')
    }
  }, [navigate])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const rangeAnchor = useMemo(() => new Date(nowTick), [nowTick])
  const currentMonthKey = useMemo(() => getMonthKey(rangeAnchor), [rangeAnchor])
  const currentRange = useMemo(() => getCurrentPeriodRange(period, rangeAnchor), [period, rangeAnchor])
  const previousRange = useMemo(() => getPreviousPeriodRange(period, rangeAnchor), [period, rangeAnchor])

  const currentOverviewQuery = useOverviewStats({ from: currentRange.from, to: currentRange.to })
  const previousOverviewQuery = useOverviewStats({ from: previousRange.from, to: previousRange.to })
  const totalOverviewQuery = useOverviewStats()
  const trend12MonthsQuery = useTrendStatsRange({ days: 365, granularity: 'month' })
  const reviewTransactionsQuery = useTransactionsWithOptions({
    page: 1,
    pageSize: 12,
    dateFrom: currentRange.from,
    dateTo: currentRange.to,
  })

  const currentOverview = currentOverviewQuery.data
  const previousOverview = previousOverviewQuery.data
  const reviewTransactions = reviewTransactionsQuery.data?.items ?? []
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const bars = useMemo(() => buildLast12MonthBars(trend12MonthsQuery.data?.points ?? [], locale), [locale, trend12MonthsQuery.data?.points])
  const actionCenter = useMemo(() => buildActionCenter(reviewTransactions), [reviewTransactions])

  const derived = useMemo(() => {
    const currentIncome = currentOverview?.income ?? totalOverviewQuery.data?.income ?? 0
    const currentExpense = currentOverview?.expense ?? totalOverviewQuery.data?.expense ?? 0
    const previousIncome = previousOverview?.income ?? 0
    const previousExpense = previousOverview?.expense ?? 0
    return {
      income: currentIncome,
      expense: currentExpense,
      net: currentIncome - currentExpense,
      incomeDelta: pctLabel(currentIncome, previousIncome),
      expenseDelta: pctLabel(currentExpense, previousExpense),
    }
  }, [currentOverview, previousOverview, totalOverviewQuery.data?.expense, totalOverviewQuery.data?.income])

  useEffect(() => {
    if (bars.length === 0) {
      setActiveBarKey(null)
      return
    }
    const currentMonthBar = bars.find((bar) => bar.key === currentMonthKey)
    const selectedBar = activeBarKey ? bars.find((bar) => bar.key === activeBarKey) : null
    const latestActiveBar = [...bars].reverse().find((bar) => bar.total > 0)
    const preferredBar = currentMonthBar && currentMonthBar.total > 0
      ? currentMonthBar
      : latestActiveBar ?? currentMonthBar ?? bars[bars.length - 1]
    if (!selectedBar || (selectedBar.total === 0 && preferredBar.total > 0)) {
      setActiveBarKey(preferredBar.key)
    }
  }, [activeBarKey, bars, currentMonthKey])

  const maxTotal = Math.max(1, ...bars.map((bar) => bar.total))
  const activeBar = bars.find((bar) => bar.key === activeBarKey) ?? bars[bars.length - 1] ?? null
  const activeBarRange = activeBar ? getRangeForMonthKey(activeBar.key) : null
  const activeBarTransactionsQuery = useTransactionsWithOptions({
    page: 1,
    pageSize: 6,
    dateFrom: activeBarRange?.from,
    dateTo: activeBarRange?.to,
    enabled: Boolean(activeBarRange),
    preservePreviousData: true,
  })
  const activeBarTransactions = activeBarTransactionsQuery.data?.items ?? []
  const syncedMinutesAgo = totalOverviewQuery.dataUpdatedAt
    ? Math.max(0, Math.floor((nowTick - totalOverviewQuery.dataUpdatedAt) / 60_000))
    : null
  const syncedLabel =
    syncedMinutesAgo === null
      ? t('common.loading')
      : syncedMinutesAgo === 0
        ? t('dashboard.justNow')
      : `${syncedMinutesAgo} ${t('dashboard.minutesAgo')}`

  function handleOpenActiveMonthTransactions() {
    if (!activeBarRange) return
    const params = new URLSearchParams({
      from: activeBarRange.from,
      to: activeBarRange.to,
    })
    navigate(`/transactions?${params.toString()}`)
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
          <div>
            <h2 className="font-headline text-[34px] font-bold leading-tight tracking-normal text-on-surface md:text-[44px] md:font-extrabold">
              {t('dashboard.title')}
            </h2>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-on-surface-variant md:mt-2 md:text-sm">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <SegmentedControl
            ariaLabel={t('analytics.selectPeriod')}
            value={period}
            options={periods.map((item) => ({ value: item, label: t(`dashboard.periods.${item}`) }))}
            onChange={setPeriod}
            className="md:min-w-[360px]"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 xl:grid-cols-[1fr_1fr_0.95fr]">
          <DashboardMetricCard
            label={`${t(`dashboard.periods.${period}`)} ${t('dashboard.income')}`}
            value={formatCurrency(derived.income)}
            delta={derived.incomeDelta}
            tone="positive"
          />
          <DashboardMetricCard
            label={`${t(`dashboard.periods.${period}`)} ${t('dashboard.expense')}`}
            value={formatCurrency(derived.expense)}
            delta={derived.expenseDelta}
            tone="negative"
          />
          <DashboardMetricCard
            label={t('dashboard.totalAssets')}
            value={formatCurrency(totalOverviewQuery.data?.total_assets ?? 0)}
            tone="balance"
            className="col-span-2 xl:col-span-1"
            details={
              <>
                <p>{t('dashboard.net')} <span className="font-semibold">{formatCurrency(derived.net)}</span></p>
                <p>{t('dashboard.totalAssetsHint')}</p>
                <p className="mt-2">{t('dashboard.lastSynced')} {syncedLabel}</p>
              </>
            }
          />
        </div>

        <article className="mt-5 rounded-lg border border-black/10 bg-white p-4 md:mt-6 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-headline text-xl font-bold leading-tight tracking-normal text-on-surface md:text-2xl">{t('dashboard.actionCenter.title')}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{t('dashboard.actionCenter.description')}</p>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-[#eaf3ff] px-4 py-2 text-sm font-semibold text-[#0066cc] transition hover:bg-[#dbeaff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none"
              onClick={() => navigate('/transactions?smart=review')}
            >
              {t('dashboard.actionCenter.reviewButton')}
            </button>
          </div>

          <div className="mt-3 grid divide-y divide-black/10 border-t border-black/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="py-3 md:px-4 md:first:pl-0">
              <p className="text-[11px] font-semibold text-on-surface-variant">
                {t('dashboard.actionCenter.reviewLabel')}
              </p>
              <p className="mt-1.5 text-lg font-bold text-on-surface">
                {t('dashboard.actionCenter.reviewCount', { count: actionCenter.reviewCount })}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {t('dashboard.actionCenter.reviewHint', {
                  uncategorized: actionCenter.uncategorizedCount,
                  duplicates: actionCenter.duplicateCount,
                })}
              </p>
            </div>
            <div className="py-3 md:px-4">
              <p className="text-[11px] font-semibold text-on-surface-variant">
                {t('dashboard.actionCenter.topExpense')}
              </p>
              <p className="mt-1.5 truncate text-lg font-bold text-on-surface">
                {actionCenter.topExpense?.category_name ?? actionCenter.topExpense?.memo ?? t('transactionsPage.quickFilters.uncategorized')}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#b4233c]">
                {formatCurrency(Math.abs(actionCenter.topExpense?.amount ?? 0))}
              </p>
            </div>
            <div className="py-3 md:px-4 md:last:pr-0">
              <p className="text-[11px] font-semibold text-on-surface-variant">
                {t('dashboard.actionCenter.nextStep')}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-[#0066cc]">
                {actionCenter.reviewCount > 0
                  ? t('dashboard.actionCenter.nextStepReview')
                  : t('dashboard.actionCenter.nextStepClear')}
              </p>
            </div>
          </div>
        </article>

        <article className="mt-5 rounded-lg border border-black/10 bg-white p-4 md:mt-6 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-headline text-2xl font-bold leading-tight tracking-normal text-on-surface md:text-3xl">{t('analytics.trend')}</h3>
              <p className="mt-2 text-sm text-on-surface-variant">{t('dashboard.trendHint')}</p>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {t('dashboard.income')}
              </span>
              <span className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {t('dashboard.expense')}
              </span>
            </div>
          </div>

          <div data-testid="dashboard-trend-scroll" className="mt-6 max-w-full overflow-x-auto overscroll-x-contain pb-2 md:mt-8">
            <div data-testid="dashboard-trend-grid" className="grid h-[280px] min-w-max grid-cols-12 items-end gap-2 pr-1 [grid-template-columns:repeat(12,minmax(44px,1fr))] md:h-[360px] md:gap-3 md:[grid-template-columns:repeat(12,minmax(64px,1fr))]">
              {bars.map((bar) => {
              const incomeHeight = bar.total > 0 ? Math.round((bar.income / maxTotal) * 100) : 0
              const expenseHeight = bar.total > 0 ? Math.round((bar.expense / maxTotal) * 100) : 0
              const hasActivity = bar.total > 0
              return (
                <div key={bar.key} className="flex h-full flex-col justify-end gap-2">
                  <button
                    type="button"
                    aria-label={`${bar.label} ${hasActivity ? 'activity' : 'no activity'} ${t('dashboard.income')} ${formatCurrency(bar.income)} ${t('dashboard.expense')} ${formatCurrency(bar.expense)}`}
                    className={`relative h-full rounded-lg border p-1 text-left transition motion-reduce:transition-none ${
                      activeBar?.key === bar.key
                        ? 'border-primary/50 bg-surface-container'
                        : hasActivity
                          ? 'border-outline/10 bg-surface-container-low'
                          : 'border-outline/10 bg-surface-container-low opacity-45'
                    }`}
                    onMouseEnter={() => setActiveBarKey(bar.key)}
                    onFocus={() => setActiveBarKey(bar.key)}
                    onClick={() => setActiveBarKey(bar.key)}
                    title={`${bar.label} • ${t('dashboard.income')} ${formatCurrency(bar.income)} • ${t('dashboard.expense')} ${formatCurrency(bar.expense)}`}
                  >
                    <div
                      className="absolute inset-x-1 bottom-1 rounded-b-md bg-rose-500/90"
                      style={{ height: `${Math.max(0, expenseHeight)}%` }}
                    />
                    <div
                      className="absolute inset-x-1 rounded-t-md bg-primary"
                      style={{
                        height: `${Math.max(0, incomeHeight)}%`,
                        bottom: `${Math.max(0, expenseHeight)}%`,
                      }}
                    />
                    {hasActivity ? (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-sm" />
                    ) : null}
                  </button>
                  <p className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    {bar.label}
                  </p>
                </div>
              )
              })}
            </div>
          </div>

          {activeBar ? (
            <div className="mt-4 min-h-[154px] rounded-xl bg-[#f2f2f7] p-4 text-sm text-on-surface">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{activeBar.label}</p>
                  <p className="mt-1">
                    <span className="text-primary">{t('dashboard.income')}: {formatCurrency(activeBar.income)}</span>
                    <span className="ml-4 text-[#b4233c]">{t('dashboard.expense')}: {formatCurrency(activeBar.expense)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('dashboard.openSelectedMonthAria')}
                  className="min-h-11 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0066cc] transition hover:bg-[#eaf3ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none"
                  onClick={handleOpenActiveMonthTransactions}
                >
                  {t('dashboard.openSelectedMonth')}
                </button>
              </div>
              <div className="mt-3 divide-y divide-black/10 border-t border-black/10 md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
                {activeBarTransactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="min-w-0 px-3 py-2 first:pl-0 last:pr-0">
                    <p className="truncate text-xs font-bold text-on-surface">
                      {tx.category_name ?? tx.memo ?? t('transactionsPage.quickFilters.uncategorized')}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-on-surface-variant">
                      {tx.memo?.trim() || new Date(tx.occurred_at).toLocaleDateString(locale)}
                    </p>
                    <p className={`mt-1 text-xs font-extrabold ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
              {activeBarTransactions.length === 0 ? (
                <p className="mt-3 border-t border-black/10 pt-3 text-xs text-on-surface-variant">
                  {t('dashboard.noSelectedMonthTransactions')}
                </p>
              ) : null}
            </div>
          ) : null}

          {trend12MonthsQuery.isError || currentOverviewQuery.isError || previousOverviewQuery.isError ? (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-[#9f1239]">
              {t('errors.serverError')}
            </div>
          ) : null}
        </article>
      </section>
    </div>
  )
}
