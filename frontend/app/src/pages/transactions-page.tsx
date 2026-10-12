import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, Ellipsis, FileDown, Plus, Search, SlidersHorizontal, Trash2, Undo2, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'
import { SelectField } from '@/components/ui/select-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { TextField } from '@/components/ui/text-field'
import type { ImportConfirmRequest, ImportConfirmResponse, ImportRowInput, TransactionRecord } from '@/features/transactions/transactions-api'
import {
  invalidateImportAffectedQueries,
  useCreateTransaction,
  useDeleteTransaction,
  useExportTransactions,
  useImportConfirm,
  useImportJobStatus,
  useImportPreview,
  useTransactionFormOptions,
  useTransactionReviewItems,
  useTransactionReviewSummary,
  useTransactionsWithOptions,
  useUpdateTransaction,
} from '@/features/transactions/transactions-hooks'
import {
  buildDuplicateIds,
  buildReviewSummary,
  getReviewReasonKeys,
  transactionNeedsReview,
  type ReviewReasonKey,
} from '@/features/transactions/review-rules'
import { formatCurrency } from '@/lib/format'
import { getFriendlyApiErrorMessage } from '@/lib/api'

const IMPORT_DEFAULTS_STORAGE_KEY = 'xledger.import.defaults'
const FIELD_CLASS =
  'h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-action focus:ring-1 focus:ring-action motion-reduce:transition-none'
const FIELD_LABEL_CLASS = 'text-[13px] font-semibold leading-5 text-ink-secondary'
const FOCUS_RING_CLASS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action'
const ICON_BUTTON_CLASS = `grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-ink-secondary transition hover:bg-action-tint hover:text-action disabled:opacity-50 motion-reduce:transition-none ${FOCUS_RING_CLASS}`

type TransactionKind = TransactionRecord['type']

// Money direction is carried by sign + color together; transfers stay neutral (no transfer hue is defined yet).
const AMOUNT_TONE_CLASS: Record<TransactionKind, string> = {
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-ink',
}

const TYPE_CHIP_CLASS: Record<TransactionKind, string> = {
  income: 'bg-income-tint text-income',
  expense: 'bg-expense-tint text-expense',
  transfer: 'bg-ground text-ink-control',
}

function formatSignedAmount(type: TransactionKind, amount: number) {
  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(amount))}`
}
const TRANSACTION_DEFAULTS_STORAGE_KEY = 'xledger.transaction.defaults'

type ImportMapping = {
  date: string
  amount: string
  description: string
  type: string
  category: string
  account: string
  ledger: string
}

type MappedImportPreviewRow = {
  date: string
  amount: string
  description: string
  type: string
  category: string
}

type CategoryOption = {
  id: string
  name: string
  parent_id?: string
  archived_at?: string
}

const INCOME_CATEGORY_KEYWORDS = ['income', 'salary', 'bonus', 'investment income', 'other income', '收入', '工资', '薪资', '奖金', '投资收益']

const COMMON_CATEGORY_KEYWORDS = [
  'breakfast',
  'lunch',
  'dinner',
  'food',
  'groceries',
  'transport',
  'transit',
  'taxi',
  'salary',
  'income',
  'rent',
  'utilities',
  'shopping',
]

function normalizeCategoryOptionName(name: string) {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isIncomeCategoryOption(category: CategoryOption, categoryByID: ReadonlyMap<string, CategoryOption>) {
  const names: string[] = []
  let current: CategoryOption | undefined = category
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    names.push(normalizeCategoryOptionName(current.name))
    current = current.parent_id ? categoryByID.get(current.parent_id) : undefined
  }
  return names.some((name) => INCOME_CATEGORY_KEYWORDS.some((keyword) => name === keyword || name.endsWith(` ${keyword}`)))
}

function getCategoryPriority(name: string) {
  const normalized = name.toLowerCase()
  const index = COMMON_CATEGORY_KEYWORDS.findIndex((keyword) => normalized.includes(keyword))
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function buildCategoryOptionGroups(categories: CategoryOption[]) {
  const common = [...categories]
    .filter((category) => getCategoryPriority(category.name) !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => getCategoryPriority(a.name) - getCategoryPriority(b.name) || a.name.localeCompare(b.name))
  const commonIds = new Set(common.map((category) => category.id))
  const other = categories.filter((category) => !commonIds.has(category.id))

  return { common, other }
}

function toLocalDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

// Date keys are local calendar days; `new Date('YYYY-MM-DD')` would parse them as UTC midnight and shift the day west of UTC.
function fromLocalDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toLocalDateTimeInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const seconds = String(value.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

function toDaySearchParams(value: string) {
  const dateKey = toLocalDateKey(new Date(value))
  const from = new Date(`${dateKey}T00:00:00`)
  const to = new Date(`${dateKey}T23:59:59.999`)
  return new URLSearchParams({
    date: dateKey,
    from: from.toISOString(),
    to: to.toISOString(),
  }).toString()
}

function toSafeISOString(value: string | null, fallback: Date) {
  if (!value) return fallback.toISOString()
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : fallback.toISOString()
}

function getMonthGrid(baseDate: Date) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstWeekDay = firstDay.getDay()
  const gridStart = new Date(year, month, 1 - firstWeekDay)
  const cells: Date[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }
  return cells
}

type QuickFilter = 'all' | 'review' | 'income' | 'expense' | 'uncategorized' | 'week' | 'large' | 'duplicates'
type ReviewReasonFilter = 'all' | ReviewReasonKey

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  const readableFile = file as File & {
    arrayBuffer?: () => Promise<ArrayBuffer>
    text?: () => Promise<string>
  }

  if (typeof readableFile.arrayBuffer === 'function') {
    const buffer = await readableFile.arrayBuffer()
    return buffer.slice(0)
  }
  if (typeof readableFile.text === 'function') {
    const bytes = new TextEncoder().encode(await readableFile.text())
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
        return
      }
      reject(new Error('Unsupported file reader result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read import file'))
    reader.readAsArrayBuffer(file)
  })
}

async function readFileText(file: File): Promise<string> {
  const readableFile = file as File & {
    text?: () => Promise<string>
  }
  if (typeof readableFile.text === 'function') {
    return readableFile.text()
  }
  return new TextDecoder().decode(await readFileBuffer(file))
}

export async function buildImportIdempotencyKey(file: File) {
  const buffer = await readFileBuffer(file)
  const bytes = new Uint8Array(buffer)
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    return `ui-file-${bytesToHex(new Uint8Array(digest))}`
  }

  let hash = 0
  bytes.forEach((byte) => {
    hash = (hash * 31 + byte) % 4294967295
  })
  return `ui-file-${file.size}-${hash.toString(16).padStart(8, '0')}`
}

function escapeCsvCell(value: string) {
  const escaped = value.replace(/"/g, '""')
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
}

function buildProblemRowsCsv(result: ImportConfirmResponse, sampleRows: string[][]) {
  const header = ['row_number', 'status', 'reason', 'preview_values']
  const rows = result.rows
    .filter((row) => row.status !== 'success')
    .map((row) => [
      String(row.row_index + 1),
      row.status,
      row.reason ?? '',
      (sampleRows[row.row_index] ?? []).join(' | '),
    ])
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

function readImportDefaults() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(IMPORT_DEFAULTS_STORAGE_KEY) ?? '{}') as {
      accountId?: string
      ledgerId?: string
    }
    return {
      accountId: parsed.accountId ?? '',
      ledgerId: parsed.ledgerId ?? '',
    }
  } catch {
    return { accountId: '', ledgerId: '' }
  }
}

function writeImportDefaults(accountId: string, ledgerId: string) {
  window.localStorage.setItem(IMPORT_DEFAULTS_STORAGE_KEY, JSON.stringify({ accountId, ledgerId }))
}

function readTransactionDefaults() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRANSACTION_DEFAULTS_STORAGE_KEY) ?? '{}') as {
      type?: 'income' | 'expense'
      accountId?: string
      categoryId?: string
    }
    return {
      type: parsed.type === 'income' || parsed.type === 'expense' ? parsed.type : 'expense',
      accountId: parsed.accountId ?? '',
      categoryId: parsed.categoryId ?? '',
    }
  } catch {
    return { type: 'expense' as const, accountId: '', categoryId: '' }
  }
}

function writeTransactionDefaults(type: 'income' | 'expense', accountId: string, categoryId: string) {
  window.localStorage.setItem(TRANSACTION_DEFAULTS_STORAGE_KEY, JSON.stringify({ type, accountId, categoryId }))
}

function parseCsvText(text: string) {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current)
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }
  row.push(current)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

function guessColumn(columns: string[], candidates: string[]) {
  const normalized = columns.map((column) => normalizeImportColumnName(column).toLowerCase())
  const matchIndex = normalized.findIndex((column) => candidates.some((candidate) => column.includes(candidate)))
  return matchIndex >= 0 ? columns[matchIndex] : ''
}

function normalizeImportColumnName(column: string) {
  return column.replace(/^\uFEFF/, '').trim()
}

function buildImportHeaderIndex(headers: string[]) {
  return new Map(headers.map((header, index) => [normalizeImportColumnName(header), index]))
}

function readImportCell(row: string[], headerIndex: ReadonlyMap<string, number>, column: string) {
  const index = headerIndex.get(normalizeImportColumnName(column))
  return index === undefined ? '' : (row[index] ?? '').trim()
}

function parseImportAmountValue(value: string) {
  const normalized = value
    .trim()
    .replace(/[¥￥,\s\u00A0]/g, '')
    .replace(/^\((.*)\)$/, '-$1')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0
}

function normalizeImportRowType(type: string, amountSource: string): 'income' | 'expense' {
  const normalizedType = type.trim().toLowerCase()
  if (normalizedType.includes('income') || normalizedType.includes('收入') || normalizedType.includes('入账')) {
    return 'income'
  }
  if (normalizedType.includes('expense') || normalizedType.includes('支出') || normalizedType.includes('出账')) {
    return 'expense'
  }
  return amountSource.trim().startsWith('+') ? 'income' : 'expense'
}

function buildDefaultImportMapping(columns: string[]): ImportMapping {
  return {
    date: guessColumn(columns, ['date', 'time', 'posted', 'occurred', '时间', '创建']),
    amount: guessColumn(columns, ['amount', 'value', 'money', '金额']),
    description: guessColumn(columns, ['description', 'memo', 'note', 'detail', 'details', '备注', '说明']),
    type: guessColumn(columns, ['type', 'direction', '收/支', '类型']),
    category: guessColumn(columns, ['category', '用途', '分类']),
    account: guessColumn(columns, ['account', '账户']),
    ledger: guessColumn(columns, ['ledger', '账本']),
  }
}

function isImportMappingReady(mapping: ImportMapping) {
  return Boolean(mapping.date && mapping.amount && mapping.description)
}

function buildMappedImportPreviewRows(
  columns: string[],
  rows: string[][],
  mapping: ImportMapping,
): MappedImportPreviewRow[] {
  const headerIndex = buildImportHeaderIndex(columns)

  return rows.map((row) => ({
    date: readImportCell(row, headerIndex, mapping.date),
    amount: readImportCell(row, headerIndex, mapping.amount),
    description: readImportCell(row, headerIndex, mapping.description),
    type: readImportCell(row, headerIndex, mapping.type),
    category: readImportCell(row, headerIndex, mapping.category),
  }))
}

async function buildImportConfirmPayload(
  file: File,
  mapping: ImportMapping,
  defaultAccountId: string,
  defaultLedgerId: string,
): Promise<ImportConfirmRequest> {
  const records = parseCsvText(await readFileText(file))
  const headers = records[0] ?? []
  const headerIndex = buildImportHeaderIndex(headers)
  const rows: ImportRowInput[] = records.slice(1).map((row) => {
    const amountSource = readImportCell(row, headerIndex, mapping.amount)
    const category = readImportCell(row, headerIndex, mapping.category)
    const description = readImportCell(row, headerIndex, mapping.description) || category
    return {
      date: readImportCell(row, headerIndex, mapping.date),
      amount: parseImportAmountValue(amountSource),
      description,
      type: normalizeImportRowType(readImportCell(row, headerIndex, mapping.type), amountSource),
      category,
      account: readImportCell(row, headerIndex, mapping.account),
      ledger: readImportCell(row, headerIndex, mapping.ledger),
    }
  })
  return {
    rows,
    default_account_id: defaultAccountId || undefined,
    default_ledger_id: defaultLedgerId || undefined,
  }
}

export function getTransactionAccountLabel(
  tx: TransactionRecord,
  accountNameById: ReadonlyMap<string, string>,
  fallback: string,
) {
  const accountID = tx.account_id ?? tx.from_account_id ?? tx.to_account_id
  if (!accountID) return fallback
  return accountNameById.get(accountID) ?? accountID
}

export function getTransactionLedgerLabel(
  tx: TransactionRecord,
  ledgerNameById: ReadonlyMap<string, string>,
  fallback: string,
) {
  if (!tx.ledger_id) return fallback
  return ledgerNameById.get(tx.ledger_id) ?? tx.ledger_id
}

export function TransactionsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const searchParamQ = (searchParams.get('q') ?? '').trim()
  const dateParam = searchParams.get('date')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [activeMonth, setActiveMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(() => readTransactionDefaults().type)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(() => readTransactionDefaults().categoryId)
  const [accountId, setAccountId] = useState(() => readTransactionDefaults().accountId)
  const [memo, setMemo] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [date, setDate] = useState(() => toLocalDateTimeInputValue(new Date()))
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportConfirmResponse | null>(null)
  const [importMapping, setImportMapping] = useState<ImportMapping>(() => buildDefaultImportMapping([]))
  const [importDefaultAccountId, setImportDefaultAccountId] = useState(() => readImportDefaults().accountId)
  const [importDefaultLedgerId, setImportDefaultLedgerId] = useState(() => readImportDefaults().ledgerId)
  const [dateRangePreset, setDateRangePreset] = useState<'' | '7' | '30' | '120' | '365'>('')
  const [listSearchQuery, setListSearchQuery] = useState(searchParamQ)
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('')
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('')
  const [amountMinFilter, setAmountMinFilter] = useState('')
  const [amountMaxFilter, setAmountMaxFilter] = useState('')
  const smartParam = searchParams.get('smart')
  const initialQuickFilter: QuickFilter = smartParam === 'review' ? 'review' : 'all'
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(initialQuickFilter)
  const [reviewReasonFilter, setReviewReasonFilter] = useState<ReviewReasonFilter>('all')
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const mobileActionsButtonRef = useRef<HTMLButtonElement>(null)
  const mobileActionsMenuRef = useRef<HTMLDivElement>(null)
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<Set<string>>(() => new Set())
  const [dismissedReviewIds, setDismissedReviewIds] = useState<Set<string>>(() => new Set())
  const [pendingUndo, setPendingUndo] = useState<TransactionRecord | null>(null)
  const [isMobileListLayout, setIsMobileListLayout] = useState(false)
  const [listRangeClock, setListRangeClock] = useState(() => Date.now())
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(() => new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [transactionMessage, setTransactionMessage] = useState('')
  const [importPendingRowCount, setImportPendingRowCount] = useState(0)
  const [importProgressPercent, setImportProgressPercent] = useState(0)
  const [activeImportJobId, setActiveImportJobId] = useState<string | null>(null)

  useEffect(() => {
    setListSearchQuery(searchParamQ)
  }, [searchParamQ])

  useEffect(() => {
    if (smartParam === 'review') {
      setQuickFilter('review')
    }
  }, [smartParam])

  useEffect(() => {
    if (!mobileActionsOpen) return undefined

    mobileActionsMenuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus()
    return undefined
  }, [mobileActionsOpen])

  useEffect(() => {
    if (!globalThis.matchMedia) return undefined
    const query = globalThis.matchMedia('(max-width: 999px)')
    const updateLayout = () => setIsMobileListLayout(query.matches)
    updateLayout()
    query.addEventListener('change', updateLayout)
    return () => query.removeEventListener('change', updateLayout)
  }, [])

  const monthCells = useMemo(() => getMonthGrid(activeMonth), [activeMonth])
  const monthRange = useMemo(() => {
    const start = monthCells[0]
    const end = monthCells[monthCells.length - 1]
    const startUtc = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0))
    const endUtc = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59))
    return { from: startUtc.toISOString(), to: endUtc.toISOString() }
  }, [monthCells])

  const listRange = useMemo(() => {
    if (dateParam) {
      const selectedDate = new Date(`${dateParam}T00:00:00`)
      if (Number.isFinite(selectedDate.getTime())) {
        const end = new Date(selectedDate)
        end.setHours(23, 59, 59, 999)
        return {
          from: selectedDate.toISOString(),
          to: end.toISOString(),
        }
      }
    }
    if (fromParam || toParam) {
      const now = new Date()
      return {
        from: toSafeISOString(fromParam, new Date(0)),
        to: toSafeISOString(toParam, now),
      }
    }
    if (dateRangePreset === '') {
      return {}
    }
    const now = new Date()
    const start = new Date(now)
    const days = Number(dateRangePreset)
    start.setDate(now.getDate() - days)
    return {
      from: start.toISOString(),
      to: now.toISOString(),
    }
  }, [dateParam, dateRangePreset, fromParam, listRangeClock, toParam])
  const normalizedListSearchQuery = listSearchQuery.trim().toLowerCase()

  const calendarTransactionsQuery = useTransactionsWithOptions({
    page: 1,
    pageSize: 1000,
    dateFrom: monthRange.from,
    dateTo: monthRange.to,
  })
  const listTransactionsQuery = useTransactionsWithOptions({
    page: 1,
    pageSize: 200,
    q: listSearchQuery.trim() || undefined,
    dateFrom: listRange.from,
    dateTo: listRange.to,
    accountId: selectedAccountFilter || undefined,
    ledgerId: selectedLedgerFilter || undefined,
    amountMin: amountMinFilter.trim() || undefined,
    amountMax: amountMaxFilter.trim() || undefined,
  })
  const reviewSummaryQuery = useTransactionReviewSummary({
    q: listSearchQuery.trim() || undefined,
    dateFrom: listRange.from,
    dateTo: listRange.to,
    accountId: selectedAccountFilter || undefined,
    ledgerId: selectedLedgerFilter || undefined,
    amountMin: amountMinFilter.trim() || undefined,
    amountMax: amountMaxFilter.trim() || undefined,
  })
  const reviewItemsQuery = useTransactionReviewItems({
    page: 1,
    pageSize: 200,
    reason: reviewReasonFilter,
    q: listSearchQuery.trim() || undefined,
    dateFrom: listRange.from,
    dateTo: listRange.to,
    accountId: selectedAccountFilter || undefined,
    ledgerId: selectedLedgerFilter || undefined,
    amountMin: amountMinFilter.trim() || undefined,
    amountMax: amountMaxFilter.trim() || undefined,
    enabled: quickFilter === 'review' || reviewReasonFilter !== 'all',
  })
  const options = useTransactionFormOptions()
  const createTransactionMutation = useCreateTransaction()
  const importPreviewMutation = useImportPreview()
  const importConfirmMutation = useImportConfirm()
  const importJobStatusQuery = useImportJobStatus(activeImportJobId)
  const exportTransactionsMutation = useExportTransactions()
  const deleteTransactionMutation = useDeleteTransaction()
  const updateTransactionMutation = useUpdateTransaction()
  const activeImportJob = importJobStatusQuery.data
  const isImportWorking = importConfirmMutation.isPending || activeImportJob?.status === 'running'
  const importStatusError = importConfirmMutation.isError
    ? importConfirmMutation.error
    : importJobStatusQuery.isError
      ? importJobStatusQuery.error
      : null
  const displayedImportProgressPercent = activeImportJob?.total_rows
    ? Math.max(importProgressPercent, Math.round((activeImportJob.processed_rows / activeImportJob.total_rows) * 100))
    : importProgressPercent
  const showImportStatusPanel = isImportWorking || Boolean(importResult) || Boolean(importStatusError)
  const importStatusTitle = importStatusError
    ? t('transactionsPage.importDialog.statusFailedTitle')
    : isImportWorking
      ? t('transactionsPage.importDialog.statusRunningTitle')
      : importResult?.fail_count
        ? t('transactionsPage.importDialog.statusFinishedWithIssuesTitle')
        : t('transactionsPage.importDialog.statusFinishedTitle')
  const importStatusDescription = importStatusError
    ? t('transactionsPage.importDialog.importFailed', { message: getFriendlyApiErrorMessage(importStatusError, t) })
    : isImportWorking
      ? t('transactionsPage.importDialog.statusRunningDescription')
      : t('transactionsPage.importDialog.statusFinishedDescription')
  const importStatusSummary = importResult
    ? t('transactionsPage.importDialog.statusResultSummary', {
        imported: importResult.success_count,
        skipped: importResult.skip_count,
        failed: importResult.fail_count,
      })
    : activeImportJob?.total_rows
      ? t('transactionsPage.importDialog.statusProgressRows', {
          processed: activeImportJob.processed_rows,
          total: activeImportJob.total_rows,
        })
      : t('transactionsPage.importDialog.progressRows', { count: importPendingRowCount })

  useEffect(() => {
    if (!isImportWorking) {
      setImportProgressPercent(0)
      return undefined
    }

    setImportProgressPercent(18)
    const interval = window.setInterval(() => {
      setImportProgressPercent((current) => Math.min(92, current + 7))
    }, 900)
    return () => window.clearInterval(interval)
  }, [isImportWorking])

  useEffect(() => {
    if (!activeImportJobId || !activeImportJob || activeImportJob.status === 'running') return
    setImportResult({
      success_count: activeImportJob.success_count,
      skip_count: activeImportJob.skip_count,
      fail_count: activeImportJob.fail_count,
      rows: activeImportJob.rows ?? [],
    })
    setActiveImportJobId(null)
    setListRangeClock(Date.now())
    void invalidateImportAffectedQueries(queryClient)
  }, [activeImportJob, activeImportJobId, queryClient])

  const calendarTransactions = calendarTransactionsQuery.data?.items ?? []
  const listTransactions = listTransactionsQuery.data?.items ?? []
  const reviewItems = reviewItemsQuery.data?.items ?? []
  const categories = useMemo(
    () => (options.categoriesQuery.data?.items ?? []).filter((category) => !category.archived_at),
    [options.categoriesQuery.data?.items],
  )
  const accounts = options.accountsQuery.data?.items ?? []
  const ledgers = options.ledgersQuery.data?.items ?? []
  const tags = options.tagsQuery.data?.items ?? []
  const getTransactionTypeLabel = (type: TransactionKind) =>
    type === 'income' ? t('transaction.typeIncome') : type === 'expense' ? t('transaction.typeExpense') : t('transaction.typeTransfer')

  const accountNameById = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts])
  const ledgerNameById = useMemo(() => new Map(ledgers.map((ledger) => [ledger.id, ledger.name])), [ledgers])
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const transactionTypeCategories = useMemo(() => {
    const filtered = categories.filter((category) => (
      transactionType === 'income'
        ? isIncomeCategoryOption(category, categoryById)
        : !isIncomeCategoryOption(category, categoryById)
    ))
    return filtered.length > 0 ? filtered : categories
  }, [categories, categoryById, transactionType])
  const categoryOptionGroups = useMemo(() => buildCategoryOptionGroups(transactionTypeCategories), [transactionTypeCategories])
  const duplicateTransactionIds = useMemo(() => buildDuplicateIds(listTransactions), [listTransactions])
  const backendReviewReasonById = useMemo(
    () => new Map(reviewItems.map((item) => [item.transaction.id, item.reasons as ReviewReasonKey[]])),
    [reviewItems],
  )
  const backendReviewTransactions = useMemo(() => reviewItems.map((item) => item.transaction), [reviewItems])
  const smartViewCounts = reviewSummaryQuery.data ?? buildReviewSummary(listTransactions)
  const usingBackendReviewItems =
    reviewItemsQuery.isSuccess && (quickFilter === 'review' || reviewReasonFilter !== 'all')
  const importMappingReady = isImportMappingReady(importMapping)
  const canSubmitTransaction = Number(amount) > 0 && Boolean(ledgers[0]?.id)
  const importMappedPreviewRows = useMemo(() => {
    const preview = importPreviewMutation.data
    if (!preview) return []
    return buildMappedImportPreviewRows(preview.columns, preview.sample_rows, importMapping).slice(0, 5)
  }, [importMapping, importPreviewMutation.data])

  useEffect(() => {
    const columns = importPreviewMutation.data?.columns
    if (!columns) return
    setImportMapping(buildDefaultImportMapping(columns))
  }, [importPreviewMutation.data?.columns])

  useEffect(() => {
    if (!options.accountsQuery.isSuccess) return
    const accountExists = importDefaultAccountId && accounts.some((account) => account.id === importDefaultAccountId)
    if (!accountExists) {
      setImportDefaultAccountId(accounts[0]?.id ?? '')
    }
  }, [accounts, importDefaultAccountId, options.accountsQuery.isSuccess])

  useEffect(() => {
    if (!options.ledgersQuery.isSuccess) return
    const defaultLedger = ledgers.find((ledger) => ledger.is_default) ?? ledgers[0]
    const ledgerExists = importDefaultLedgerId && ledgers.some((ledger) => ledger.id === importDefaultLedgerId)
    if (!ledgerExists) {
      setImportDefaultLedgerId(defaultLedger?.id ?? '')
    }
  }, [importDefaultLedgerId, ledgers, options.ledgersQuery.isSuccess])

  useEffect(() => {
    if (!accountId && accounts.length === 1) {
      setAccountId(accounts[0].id)
    } else if (accountId && accounts.length > 0 && !accounts.some((account) => account.id === accountId)) {
      setAccountId('')
    }
    if (categoryId && transactionTypeCategories.length > 0 && !transactionTypeCategories.some((category) => category.id === categoryId)) {
      setCategoryId('')
    }
  }, [accountId, accounts, categoryId, transactionTypeCategories])

  const filteredListTransactions = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const sourceTransactions = usingBackendReviewItems ? backendReviewTransactions : listTransactions
    return sourceTransactions.filter((tx) => {
      if (deletedTransactionIds.has(tx.id)) {
        return false
      }
      if (dismissedReviewIds.has(tx.id) && (quickFilter === 'review' || reviewReasonFilter !== 'all')) {
        return false
      }
      if (normalizedListSearchQuery) {
        const candidates = [tx.id, tx.category_name ?? '', tx.memo ?? '', tx.type, tx.occurred_at]
        if (!candidates.join(' ').toLowerCase().includes(normalizedListSearchQuery)) {
          return false
        }
      }
      const reviewReasonKeys = backendReviewReasonById.get(tx.id) ?? getReviewReasonKeys(tx, duplicateTransactionIds)
      if (!usingBackendReviewItems && reviewReasonFilter !== 'all' && !reviewReasonKeys.includes(reviewReasonFilter)) {
        return false
      }
      if (usingBackendReviewItems) {
        return reviewReasonFilter === 'all' || reviewReasonKeys.includes(reviewReasonFilter)
      }
      if (quickFilter === 'income') return tx.type === 'income'
      if (quickFilter === 'expense') return tx.type === 'expense'
      if (quickFilter === 'uncategorized') return !tx.category_name?.trim()
      if (quickFilter === 'week') return new Date(tx.occurred_at) >= weekStart
      if (quickFilter === 'large') return Math.abs(tx.amount) >= 1000
      if (quickFilter === 'duplicates') return duplicateTransactionIds.has(tx.id)
      if (quickFilter === 'review') return transactionNeedsReview(tx, duplicateTransactionIds)
      return true
    })
  }, [
    backendReviewReasonById,
    backendReviewTransactions,
    deletedTransactionIds,
    dismissedReviewIds,
    duplicateTransactionIds,
    listTransactions,
    normalizedListSearchQuery,
    quickFilter,
    reviewReasonFilter,
    usingBackendReviewItems,
  ])
  useEffect(() => {
    setSelectedTransactionIds((current) => {
      const visibleIds = new Set(filteredListTransactions.map((tx) => tx.id))
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [filteredListTransactions])

  const selectedTransactions = filteredListTransactions.filter((tx) => selectedTransactionIds.has(tx.id))
  const allVisibleTransactionsSelected = filteredListTransactions.length > 0
    && filteredListTransactions.every((tx) => selectedTransactionIds.has(tx.id))
  const hasActiveListFilters = Boolean(
    normalizedListSearchQuery ||
      selectedAccountFilter ||
      selectedLedgerFilter ||
      amountMinFilter.trim() ||
      amountMaxFilter.trim() ||
      dateRangePreset !== '' ||
      quickFilter !== 'all' ||
      dateParam ||
      fromParam ||
      toParam,
  )
  const isInitialEmptyState = filteredListTransactions.length === 0 && !hasActiveListFilters

  const txByDay = useMemo(() => {
    const map = new Map<string, TransactionRecord[]>()
    calendarTransactions.forEach((tx) => {
      const dt = new Date(tx.occurred_at)
      const key = toLocalDateKey(dt)
      const list = map.get(key) ?? []
      map.set(key, [...list, tx])
    })
    return map
  }, [calendarTransactions])

  const monthTotals = useMemo(() => {
    const currentMonth = activeMonth.getMonth()
    const currentYear = activeMonth.getFullYear()
    return calendarTransactions
      .filter((tx) => {
        const dt = new Date(tx.occurred_at)
        return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear
      })
      .reduce(
        (acc, tx) => {
          if (tx.type === 'income') acc.in += tx.amount
          if (tx.type === 'expense') acc.out += tx.amount
          return acc
        },
        { in: 0, out: 0 },
      )
  }, [calendarTransactions, activeMonth])

  const fallbackSelectedDay = useMemo(() => {
    const first = calendarTransactions[0]
    if (!first) return toLocalDateKey(new Date())
    return toLocalDateKey(new Date(first.occurred_at))
  }, [calendarTransactions])

  const effectiveSelectedDay = selectedDay ?? fallbackSelectedDay
  const selectedDayTx = txByDay.get(effectiveSelectedDay) ?? []
  const selectedTotals = selectedDayTx.reduce(
    (acc, tx) => {
      if (tx.type === 'income') acc.in += tx.amount
      if (tx.type === 'expense') acc.out += tx.amount
      return acc
    },
    { in: 0, out: 0 },
  )

  async function handleCreateTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ledger = ledgers[0]
    if (!ledger?.id) return

    const parsedDate = date ? new Date(date) : null
    const occurredAt =
      parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString() : undefined

    await createTransactionMutation.mutateAsync({
      ledger_id: ledger.id,
      account_id: accountId || undefined,
      category_id: categoryId || undefined,
      type: transactionType,
      amount: Number(amount),
      memo: memo || undefined,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      occurred_at: occurredAt,
    })
    writeTransactionDefaults(transactionType, accountId, categoryId)
    setListRangeClock(Date.now())
    setShowAddDialog(false)
    setAmount('')
    setMemo('')
    setSelectedTagIds([])
    setDate(toLocalDateTimeInputValue(new Date()))
    setTransactionMessage(t('transactionsPage.addDialog.saved'))
  }

  async function handlePreviewImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!importFile) return
    setImportResult(null)
    await importPreviewMutation.mutateAsync(importFile)
  }

  async function handleConfirmImport() {
    if (!importFile || !importMappingReady) return
    const idempotencyKey = await buildImportIdempotencyKey(importFile)
    const payload = await buildImportConfirmPayload(importFile, importMapping, importDefaultAccountId, importDefaultLedgerId)
    setImportPendingRowCount(payload.rows.length)
    writeImportDefaults(importDefaultAccountId, importDefaultLedgerId)
    try {
      const job = await importConfirmMutation.mutateAsync({ payload, idempotencyKey })
      setActiveImportJobId(job.job_id)
      setImportPendingRowCount(job.total_rows || payload.rows.length)
    } catch {
      // Mutation state renders the localized error message next to the import action.
    }
  }

  function handleImportFileChange(file: File | null) {
    setImportFile(file)
    setImportResult(null)
    setActiveImportJobId(null)
    importPreviewMutation.reset()
    importConfirmMutation.reset()
  }

  function setImportMappingColumn(slot: keyof ImportMapping, column: string) {
    setImportMapping((current) => ({ ...current, [slot]: column }))
  }

  function handleDownloadImportProblems() {
    if (!importResult) return
    const content = buildProblemRowsCsv(importResult, importPreviewMutation.data?.sample_rows ?? [])
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `xledger-import-problems-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function handleCloseImportDialog() {
    setShowImportDialog(false)
    setImportFile(null)
    setImportResult(null)
    importPreviewMutation.reset()
    importConfirmMutation.reset()
  }

  function handleOpenTransactionDay(tx: TransactionRecord) {
    navigate(`/transactions?${toDaySearchParams(tx.occurred_at)}`)
    setQuickFilter('all')
    setReviewReasonFilter('all')
    setListRangeClock(Date.now())
  }

  function getImportReasonLabel(reason?: string) {
    if (!reason) return t('transactionsPage.importDialog.reasonUnknown')
    return t(`transactionsPage.importDialog.reasons.${reason}`, { defaultValue: reason.replace(/_/g, ' ') })
  }

  async function handleExportTransactions() {
    const exportRange = view === 'calendar' ? monthRange : listRange
    const content = await exportTransactionsMutation.mutateAsync({
      format: 'csv',
      q: listSearchQuery.trim() || undefined,
      dateFrom: exportRange.from,
      dateTo: exportRange.to,
      accountId: selectedAccountFilter || undefined,
      ledgerId: selectedLedgerFilter || undefined,
      amountMin: amountMinFilter.trim() || undefined,
      amountMax: amountMaxFilter.trim() || undefined,
    })
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const rangeLabel = exportRange.from && exportRange.to
      ? `${exportRange.from.slice(0, 10)}-to-${exportRange.to.slice(0, 10)}`
      : 'all-time'
    anchor.href = url
    anchor.download = `xledger-transactions-${rangeLabel}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function handleMobileExportTransactions() {
    try {
      await handleExportTransactions()
    } catch {
      // The mutation retains the error for the page-level export status.
      return
    } finally {
      setMobileActionsOpen(false)
      mobileActionsButtonRef.current?.focus()
    }
  }

  function handleMobileImport() {
    setMobileActionsOpen(false)
    navigate('/import', { state: { from: '/transactions' } })
  }

  function handleMobileActionsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      window.setTimeout(() => setMobileActionsOpen(false), 0)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setMobileActionsOpen(false)
      mobileActionsButtonRef.current?.focus()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const menuItems = Array.from(
      mobileActionsMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    ).filter((item) => !item.disabled)
    if (menuItems.length === 0) return

    event.preventDefault()
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Home') {
      menuItems[0].focus()
      return
    }
    if (event.key === 'End') {
      menuItems[menuItems.length - 1].focus()
      return
    }

    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = currentIndex === -1
      ? direction === 1 ? 0 : menuItems.length - 1
      : (currentIndex + direction + menuItems.length) % menuItems.length
    menuItems[nextIndex].focus()
  }

  async function handleDeleteTransaction(tx: TransactionRecord) {
    await deleteTransactionMutation.mutateAsync(tx.id)
    setDeletedTransactionIds((current) => new Set(current).add(tx.id))
    setPendingUndo(tx)
  }

  function toggleSelectedTransaction(id: string, checked: boolean) {
    setSelectedTransactionIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
    setBulkMessage('')
  }

  function handleSelectAllVisibleTransactions() {
    setSelectedTransactionIds(new Set(filteredListTransactions.map((tx) => tx.id)))
    setBulkMessage('')
  }

  function handleClearTransactionSelection() {
    setSelectedTransactionIds(new Set())
    setBulkCategoryId('')
    setBulkMessage('')
  }

  async function handleBulkApplyCategory() {
    if (!bulkCategoryId || selectedTransactions.length === 0) return
    const results = await Promise.allSettled(selectedTransactions.map(async (tx) => {
      await updateTransactionMutation.mutateAsync({
        id: tx.id,
        input: {
          amount: Math.abs(tx.amount),
          category_id: bulkCategoryId,
          memo: tx.memo ?? null,
          version: tx.version,
        },
      })
      return tx.id
    }))
    const updatedIds = new Set(results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])))
    const failedCount = results.length - updatedIds.size
    setSelectedTransactionIds((current) => new Set([...current].filter((id) => !updatedIds.has(id))))
    if (failedCount === 0) {
      setBulkCategoryId('')
      setBulkMessage(t('transactionsPage.bulk.updated', { count: updatedIds.size }))
      return
    }
    setBulkMessage(t('transactionsPage.bulk.partialUpdated', { updated: updatedIds.size, failed: failedCount }))
  }

  async function handleBulkDelete() {
    if (selectedTransactions.length === 0) return
    const results = await Promise.allSettled(selectedTransactions.map(async (tx) => {
      await deleteTransactionMutation.mutateAsync(tx.id)
      return tx.id
    }))
    const deletedIds = new Set(results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])))
    const failedCount = results.length - deletedIds.size
    setDeletedTransactionIds((current) => {
      const next = new Set(current)
      deletedIds.forEach((id) => next.add(id))
      return next
    })
    setSelectedTransactionIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))))
    setBulkMessage(
      failedCount === 0
        ? t('transactionsPage.bulk.deleted', { count: deletedIds.size })
        : t('transactionsPage.bulk.partialDeleted', { deleted: deletedIds.size, failed: failedCount }),
    )
  }

  function handleBulkMarkReviewed() {
    if (selectedTransactions.length === 0) return
    setDismissedReviewIds((current) => {
      const next = new Set(current)
      selectedTransactions.forEach((tx) => next.add(tx.id))
      return next
    })
    setSelectedTransactionIds(new Set())
    setBulkMessage(t('transactionsPage.bulk.reviewed', { count: selectedTransactions.length }))
  }

  function handleDismissReview(tx: TransactionRecord) {
    setDismissedReviewIds((current) => new Set(current).add(tx.id))
  }

  function handleClearListFilters() {
    setListSearchQuery('')
    setSelectedAccountFilter('')
    setSelectedLedgerFilter('')
    setAmountMinFilter('')
    setAmountMaxFilter('')
    setDateRangePreset('')
    setQuickFilter('all')
    setReviewReasonFilter('all')
    setListRangeClock(Date.now())
    navigate('/transactions', { replace: true })
  }

  async function handleUndoDelete() {
    if (!pendingUndo || pendingUndo.type === 'transfer') return
    const ledger = ledgers[0]
    if (!ledger?.id) return

    await createTransactionMutation.mutateAsync({
      ledger_id: ledger.id,
      type: pendingUndo.type,
      amount: Math.abs(pendingUndo.amount),
      memo: pendingUndo.memo || undefined,
      occurred_at: pendingUndo.occurred_at,
    })
    setDeletedTransactionIds((current) => {
      const next = new Set(current)
      next.delete(pendingUndo.id)
      return next
    })
    setPendingUndo(null)
  }

  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const quickFilters: Array<{ id: QuickFilter; label: string }> = [
    { id: 'all', label: t('transactionsPage.quickFilters.all') },
    { id: 'review', label: t('transactionsPage.quickFilters.review') },
    { id: 'income', label: t('transactionsPage.quickFilters.income') },
    { id: 'expense', label: t('transactionsPage.quickFilters.expense') },
    { id: 'uncategorized', label: t('transactionsPage.quickFilters.uncategorized') },
    { id: 'week', label: t('transactionsPage.quickFilters.week') },
    { id: 'large', label: t('transactionsPage.quickFilters.large') },
    { id: 'duplicates', label: t('transactionsPage.quickFilters.duplicates') },
  ]
  const reviewReasonFilters: Array<{ id: ReviewReasonFilter; label: string; count: number }> = [
    { id: 'all', label: t('transactionsPage.reviewFocus.all'), count: smartViewCounts.review },
    { id: 'uncategorized', label: t('transactionsPage.reviewReasons.uncategorized'), count: smartViewCounts.uncategorized },
    { id: 'duplicate', label: t('transactionsPage.reviewReasons.duplicate'), count: smartViewCounts.duplicates },
    { id: 'large', label: t('transactionsPage.reviewReasons.large'), count: smartViewCounts.large },
  ]
  const weekdayLabels = [
    t('transactionsPage.calendar.weekdays.sun'),
    t('transactionsPage.calendar.weekdays.mon'),
    t('transactionsPage.calendar.weekdays.tue'),
    t('transactionsPage.calendar.weekdays.wed'),
    t('transactionsPage.calendar.weekdays.thu'),
    t('transactionsPage.calendar.weekdays.fri'),
    t('transactionsPage.calendar.weekdays.sat'),
  ]
  const importProblemRows = importResult?.rows.filter((row) => row.status !== 'success') ?? []
  const exportTotal = listTransactionsQuery.data?.pagination.total ?? filteredListTransactions.length

  return (
    <div className="-mx-4 w-[calc(100%+2rem)] space-y-5 px-4 min-[1000px]:mx-0 min-[1000px]:w-auto min-[1000px]:px-0">
      <section data-testid="mobile-transaction-page" data-ui="ios-transactions-page">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-headline text-[34px] font-bold leading-tight tracking-normal text-ink md:text-[44px] md:font-extrabold">
            {t('transactionsPage.title')}
          </h2>
          <SegmentedControl
            ariaLabel={t('transactionsPage.viewLabel')}
            value={view}
            options={[
              { value: 'list', label: t('transactionsPage.listView') },
              { value: 'calendar', label: t('transactionsPage.calendarView') },
            ]}
            onChange={setView}
            className="order-3 md:w-full min-[1000px]:order-none min-[1000px]:w-auto"
          />
          <div className="flex items-center gap-2 min-[1000px]:gap-3">
            <div data-testid="desktop-transaction-actions" className="hidden items-center gap-3 min-[1000px]:flex">
              <span className="hidden text-[13px] text-ink-tertiary xl:inline">
                {t('transactionsPage.exportSummary', { count: exportTotal })}
              </span>
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={() => void handleExportTransactions()}
                disabled={exportTransactionsMutation.isPending}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                {exportTransactionsMutation.isPending ? t('transactionsPage.exporting') : t('transactionsPage.export')}
              </Button>
              <Button variant="secondary" className="min-h-11" onClick={() => setShowImportDialog(true)}>
                <Upload aria-hidden="true" className="h-4 w-4" />
                {t('transactionsPage.import')}
              </Button>
            </div>
            <div className="relative min-[1000px]:hidden">
              <button
                ref={mobileActionsButtonRef}
                type="button"
                aria-label={t('transactionsPage.mobileActions.more')}
                aria-haspopup="menu"
                aria-expanded={mobileActionsOpen}
                aria-controls="mobile-transaction-actions"
                className={`grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-action transition hover:bg-action-tint motion-reduce:transition-none ${FOCUS_RING_CLASS}`}
                onClick={() => setMobileActionsOpen((current) => !current)}
              >
                <Ellipsis aria-hidden="true" className="h-5 w-5" />
              </button>
              {mobileActionsOpen ? (
                <div
                  ref={mobileActionsMenuRef}
                  id="mobile-transaction-actions"
                  role="menu"
                  aria-label={t('transactionsPage.mobileActions.menuLabel')}
                  className="absolute right-0 top-12 z-30 min-w-40 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-ambient"
                  onKeyDown={handleMobileActionsKeyDown}
                >
                  <button
                    role="menuitem"
                    type="button"
                    tabIndex={-1}
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-ink outline-none hover:bg-ground focus-visible:bg-action-tint focus-visible:text-action"
                    onClick={handleMobileImport}
                  >
                    {t('transactionsPage.import')}
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    tabIndex={-1}
                    disabled={exportTransactionsMutation.isPending}
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-ink outline-none hover:bg-ground focus-visible:bg-action-tint focus-visible:text-action disabled:opacity-60"
                    onClick={() => void handleMobileExportTransactions()}
                  >
                    {exportTransactionsMutation.isPending ? t('transactionsPage.exporting') : t('transactionsPage.export')}
                  </button>
                </div>
              ) : null}
            </div>
            <Button
              aria-label={t('transactionsPage.addTransaction')}
              className="h-11 min-w-11 px-3 min-[1000px]:px-4"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus aria-hidden="true" className="h-5 w-5 min-[1000px]:hidden" />
              <span className="hidden min-[1000px]:inline">{t('transactionsPage.addTransaction')}</span>
            </Button>
          </div>
        </div>
        {exportTransactionsMutation.isError ? (
          <p className="mt-3 text-sm text-error">
            {t('transactionsPage.exportFailed', {
              message: getFriendlyApiErrorMessage(exportTransactionsMutation.error, t),
            })}
          </p>
        ) : null}

        {view === 'list' ? (
          <div className="mt-5 space-y-4">
            <article
              role="region"
              aria-labelledby="transaction-smart-views-title"
              data-ui="ios-grouped-list"
              className="bg-transparent p-0 min-[1000px]:rounded-lg min-[1000px]:border min-[1000px]:border-black/10 min-[1000px]:bg-white min-[1000px]:p-5"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="transaction-smart-views-title" className="font-headline text-xl font-bold leading-tight text-ink md:text-2xl">
                    {t('transactionsPage.smartViews.title')}
                  </h3>
                  <p className="mt-1 text-sm text-ink-secondary">{t('transactionsPage.smartViews.description')}</p>
                </div>
              </div>
              <div
                data-testid="mobile-smart-view-list"
                className="mb-4 overflow-hidden rounded-lg border border-black/10 bg-white min-[1000px]:grid min-[1000px]:grid-cols-4 min-[1000px]:gap-2 min-[1000px]:overflow-visible min-[1000px]:rounded-none min-[1000px]:border-0 min-[1000px]:bg-transparent"
              >
                {reviewReasonFilters.map((filter, index) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-label={t(`transactionsPage.reviewFocus.ariaLabels.${filter.id}`)}
                    aria-pressed={quickFilter === 'review' && reviewReasonFilter === filter.id}
                    className={`flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium transition motion-reduce:transition-none focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action min-[1000px]:rounded-full min-[1000px]:border min-[1000px]:px-3 min-[1000px]:py-2 min-[1000px]:text-[13px] min-[1000px]:font-semibold ${
                      index < reviewReasonFilters.length - 1 ? 'border-b border-black/10 min-[1000px]:border-b' : ''
                    } ${
                      quickFilter === 'review' && reviewReasonFilter === filter.id
                        ? 'bg-action text-white min-[1000px]:border-action'
                        : 'text-ink hover:bg-ground min-[1000px]:border-black/10 min-[1000px]:bg-white min-[1000px]:text-ink-control'
                    }`}
                    onClick={() => {
                      setQuickFilter('review')
                      setReviewReasonFilter(filter.id)
                    }}
                  >
                    <span className="flex-1">{filter.label}</span>
                    <span className="tabular-nums">{filter.count}</span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 opacity-60 min-[1000px]:hidden" />
                  </button>
                ))}
              </div>
              <div
                data-ui="transaction-quick-filters"
                className="mb-4 flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[1000px]:flex-wrap min-[1000px]:overflow-visible"
              >
                {quickFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={quickFilter === filter.id}
                    className={`min-h-11 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition motion-reduce:transition-none min-[1000px]:min-h-9 ${FOCUS_RING_CLASS} ${
                      quickFilter === filter.id
                        ? 'bg-action text-white'
                        : 'bg-ground text-ink-control hover:bg-segment-track'
                    }`}
                    onClick={() => {
                      setQuickFilter(filter.id)
                      if (filter.id !== 'review') {
                        setReviewReasonFilter('all')
                      }
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-[13px] font-semibold text-action transition hover:bg-action-tint motion-reduce:transition-none min-[1000px]:hidden ${FOCUS_RING_CLASS}`}
                aria-controls="transaction-advanced-filters"
                aria-expanded={mobileFiltersExpanded}
                onClick={() => setMobileFiltersExpanded((current) => !current)}
              >
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                {mobileFiltersExpanded ? t('transactionsPage.filters.hideAdvanced') : t('transactionsPage.filters.showAdvanced')}
              </button>
              <div id="transaction-advanced-filters" className={`${mobileFiltersExpanded ? 'block' : 'hidden'} min-[1000px]:block`}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <label className="space-y-1.5">
                  <span className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.filters.searchLedger')}
                  </span>
                  <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
                    <input
                      className={`${FIELD_CLASS} pl-9`}
                      placeholder={t('transactionsPage.filters.searchPlaceholder')}
                      value={listSearchQuery}
                      onChange={(event) => setListSearchQuery(event.target.value)}
                    />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.filters.source')}
                  </span>
                  <select
                    className={FIELD_CLASS}
                    value={selectedAccountFilter}
                    onChange={(event) => setSelectedAccountFilter(event.target.value)}
                  >
                    <option value="">{t('transactionsPage.filters.allAccounts')}</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.filters.ledger')}
                  </span>
                  <select
                    className={FIELD_CLASS}
                    value={selectedLedgerFilter}
                    onChange={(event) => setSelectedLedgerFilter(event.target.value)}
                  >
                    <option value="">{t('transactionsPage.filters.allLedgers')}</option>
                    {ledgers.map((ledger) => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.filters.dateRange')}
                  </span>
                  <select
                    className={FIELD_CLASS}
                    value={dateRangePreset}
                    onChange={(event) => setDateRangePreset(event.target.value as '' | '7' | '30' | '120' | '365')}
                  >
                    <option value="">{t('transactionsPage.filters.allTime')}</option>
                    <option value="7">{t('transactionsPage.filters.last7Days')}</option>
                    <option value="30">{t('transactionsPage.filters.last30Days')}</option>
                    <option value="120">{t('transactionsPage.filters.last120Days')}</option>
                    <option value="365">{t('transactionsPage.filters.last365Days')}</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.filters.amountMin')}
                  </span>
                  <input
                    aria-label={t('transactionsPage.filters.amountMin')}
                    className={FIELD_CLASS}
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    type="number"
                    value={amountMinFilter}
                    onChange={(event) => setAmountMinFilter(event.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.filters.amountMax')}
                  </span>
                  <input
                    aria-label={t('transactionsPage.filters.amountMax')}
                    className={FIELD_CLASS}
                    inputMode="decimal"
                    min="0"
                    placeholder="9999"
                    type="number"
                    value={amountMaxFilter}
                    onChange={(event) => setAmountMaxFilter(event.target.value)}
                  />
                </label>
                </div>
              </div>
            </article>

            {filteredListTransactions.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-sm font-semibold tabular-nums text-ink">
                    {t('transactionsPage.bulk.visibleCount', { count: filteredListTransactions.length })}
                  </p>
                  <p className="text-xs text-ink-secondary">{t('transactionsPage.bulk.selectHint')}</p>
                </div>
                <Button
                  className="min-h-11 px-3 py-2 text-[13px] md:min-h-9"
                  variant="secondary"
                  onClick={allVisibleTransactionsSelected ? handleClearTransactionSelection : handleSelectAllVisibleTransactions}
                >
                  {allVisibleTransactionsSelected
                    ? t('transactionsPage.bulk.clearSelection')
                    : t('transactionsPage.bulk.selectAllVisible')}
                </Button>
              </div>
            ) : null}

            {transactionMessage ? (
              <div role="status" className="rounded-lg border border-income-edge bg-income-tint px-4 py-3 text-sm font-semibold text-income">
                {transactionMessage}
              </div>
            ) : null}

            {selectedTransactions.length > 0 || bulkMessage ? (
              <article className="rounded-lg border border-action/20 bg-action-tint p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-action">
                      {selectedTransactions.length > 0
                        ? t('transactionsPage.bulk.selected', { count: selectedTransactions.length })
                        : bulkMessage}
                    </p>
                    {selectedTransactions.length > 0 && bulkMessage ? (
                      <p className="mt-1 text-xs font-semibold text-action">{bulkMessage}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-ink-secondary">{t('transactionsPage.bulk.description')}</p>
                  </div>
                  {selectedTransactions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={t('transactionsPage.bulk.category')}
                        className={`${FIELD_CLASS} w-auto md:h-9`}
                        value={bulkCategoryId}
                        onChange={(event) => setBulkCategoryId(event.target.value)}
                      >
                        <option value="">{t('transactionsPage.addDialog.selectCategory')}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <Button className="min-h-11 px-3 py-2 text-[13px] md:min-h-9" onClick={() => void handleBulkApplyCategory()} disabled={!bulkCategoryId || updateTransactionMutation.isPending}>
                        {t('transactionsPage.bulk.applyCategory')}
                      </Button>
                      <Button className="min-h-11 px-3 py-2 text-[13px] md:min-h-9" variant="secondary" onClick={handleBulkMarkReviewed}>
                        {t('transactionsPage.bulk.markReviewed')}
                      </Button>
                      <Button className="min-h-11 px-3 py-2 text-[13px] md:min-h-9" variant="secondary" onClick={() => void handleBulkDelete()} disabled={deleteTransactionMutation.isPending}>
                        {t('transactionsPage.bulk.delete')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            ) : null}

            {filteredListTransactions.length > 0 ? (
              <article
                data-testid="desktop-transaction-table"
                className="hidden overflow-x-auto rounded-lg border border-black/10 bg-white min-[1000px]:block"
              >
                <div className="grid min-w-[920px] grid-cols-[28px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_84px_minmax(0,1fr)_124px] gap-4 bg-ground/60 px-5 py-2.5 text-xs font-semibold text-ink-tertiary">
                  <p className="sr-only">{t('transactionsPage.table.select')}</p>
                  <p className="col-start-2">{t('transactionsPage.table.transactionCategory')}</p>
                  <p>{t('transactionsPage.table.accountLedger')}</p>
                  <p>{t('transactionsPage.table.dateTime')}</p>
                  <p>{t('transaction.type')}</p>
                  <p className="text-right">{t('transactionsPage.table.amount')}</p>
                  <p className="text-right">{t('transactionsPage.table.action')}</p>
                </div>
                {filteredListTransactions.map((tx) => {
                  const reviewReasonKeys = backendReviewReasonById.get(tx.id) ?? getReviewReasonKeys(tx, duplicateTransactionIds)
                  return (
                    <div key={tx.id} className="grid min-w-[920px] grid-cols-[28px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_84px_minmax(0,1fr)_124px] gap-4 items-center border-t border-black/10 px-5 py-3.5 transition-colors hover:bg-ground/50 motion-reduce:transition-none">
                      <div>
                        <input
                          type="checkbox"
                          aria-label={t('transactionsPage.table.selectLabel', { name: tx.category_name || tx.memo?.trim() || tx.id })}
                          className="h-[18px] w-[18px] cursor-pointer accent-action"
                          checked={selectedTransactionIds.has(tx.id)}
                          onChange={(event) => toggleSelectedTransaction(tx.id, event.target.checked)}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{tx.category_name ?? t('transactionsPage.quickFilters.uncategorized')}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-secondary">
                          <span className="text-ink-tertiary">{t('transactionsPage.table.memoLabel')}</span>
                          <span>{tx.memo?.trim() || t('transactionsPage.table.noMemo')}</span>
                        </p>
                        {reviewReasonKeys.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {reviewReasonKeys.map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full bg-action-tint px-2 py-0.5 text-[11px] font-semibold leading-4 text-action"
                              >
                                {t(`transactionsPage.reviewReasons.${reason}`)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <p className="truncate text-sm text-ink">
                          {getTransactionAccountLabel(tx, accountNameById, t('transactionsPage.table.noAccount'))}
                        </p>
                        <p className="truncate text-xs text-ink-tertiary">
                          {getTransactionLedgerLabel(tx, ledgerNameById, t('transactionsPage.table.noLedger'))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm tabular-nums text-ink">{new Date(tx.occurred_at).toLocaleDateString(locale)}</p>
                        <p className="text-xs tabular-nums text-ink-tertiary">{new Date(tx.occurred_at).toLocaleTimeString(locale)}</p>
                      </div>
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold leading-4 ${TYPE_CHIP_CLASS[tx.type]}`}>
                          {getTransactionTypeLabel(tx.type)}
                        </span>
                      </div>
                      <p className={`text-right font-headline text-xl font-bold tabular-nums ${AMOUNT_TONE_CLASS[tx.type]}`}>
                        {formatSignedAmount(tx.type, tx.amount)}
                      </p>
                      <div className="flex justify-end gap-2">
                        {reviewReasonKeys.length > 0 ? (
                          <>
                            <button
                              type="button"
                              aria-label={t('transactionsPage.table.openDayLabel', { name: tx.memo?.trim() || tx.category_name || tx.id })}
                              className={ICON_BUTTON_CLASS}
                              onClick={() => handleOpenTransactionDay(tx)}
                            >
                              <CalendarDays aria-hidden="true" className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={t('transactionsPage.table.markReviewedLabel', { name: tx.memo?.trim() || tx.category_name || tx.id })}
                              className={`${ICON_BUTTON_CLASS} hover:!bg-income-tint hover:!text-income`}
                              onClick={() => handleDismissReview(tx)}
                            >
                              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          aria-label={t('transactionsPage.table.deleteLabel', { name: tx.memo?.trim() || tx.category_name || tx.id })}
                          className={`${ICON_BUTTON_CLASS} hover:!bg-expense-tint hover:!text-expense`}
                          onClick={() => void handleDeleteTransaction(tx)}
                          disabled={deleteTransactionMutation.isPending}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </article>
            ) : (
              <article className="rounded-lg border border-black/10 bg-white px-5 py-10 text-center text-sm text-ink-secondary">
                <p className="font-semibold text-ink">{t('transactionsPage.empty.noMatching')}</p>
                {isInitialEmptyState ? (
                  <>
                    <p className="mt-2">{t('transactionsPage.empty.initial')}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button className="min-h-11 px-4" onClick={() => setShowAddDialog(true)}>
                        {t('transactionsPage.empty.createFirst')}
                      </Button>
                      <Button className="min-h-11 px-4" variant="secondary" onClick={() => navigate('/shortcut')}>
                        {t('transactionsPage.empty.openQuickEntry')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex justify-center">
                    <Button className="min-h-11 px-4" variant="secondary" onClick={handleClearListFilters}>
                      {t('transactionsPage.empty.clearFilters')}
                    </Button>
                  </div>
                )}
              </article>
            )}
            {isMobileListLayout && filteredListTransactions.length > 0 ? (
              <ul data-testid="mobile-transaction-cards" className="divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-white min-[1000px]:hidden">
                {filteredListTransactions.map((tx) => {
                  const reviewReasonKeys = backendReviewReasonById.get(tx.id) ?? getReviewReasonKeys(tx, duplicateTransactionIds)
                  return (
                    <li key={tx.id} className="flex gap-1 py-3 pl-1 pr-4">
                      <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center">
                        <input
                          type="checkbox"
                          aria-label={t('transactionsPage.table.selectLabel', { name: tx.category_name || tx.memo?.trim() || tx.id })}
                          className="h-[18px] w-[18px] cursor-pointer accent-action"
                          checked={selectedTransactionIds.has(tx.id)}
                          onChange={(event) => toggleSelectedTransaction(tx.id, event.target.checked)}
                        />
                      </label>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-5 text-ink">
                              {tx.category_name ?? t('transactionsPage.quickFilters.uncategorized')}
                            </p>
                            <p className="mt-0.5 truncate text-[13px] leading-5 text-ink-secondary">
                              {tx.memo?.trim() || t('transactionsPage.table.noMemo')}
                            </p>
                          </div>
                          <p className={`shrink-0 text-[17px] font-bold leading-5 tabular-nums ${AMOUNT_TONE_CLASS[tx.type]}`}>
                            {formatSignedAmount(tx.type, tx.amount)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-ink-tertiary">
                          {getTransactionTypeLabel(tx.type)} · {getTransactionAccountLabel(tx, accountNameById, t('transactionsPage.table.noAccount'))} ·{' '}
                          <span className="tabular-nums">{new Date(tx.occurred_at).toLocaleString(locale)}</span>
                        </p>
                        {reviewReasonKeys.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {reviewReasonKeys.map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full bg-action-tint px-2 py-0.5 text-[11px] font-semibold leading-4 text-action"
                              >
                                {t(`transactionsPage.reviewReasons.${reason}`)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                          {reviewReasonKeys.length > 0 ? (
                            <>
                              <Button className="min-h-11 gap-1.5 px-2.5 py-1.5 text-[13px]" variant="secondary" onClick={() => handleOpenTransactionDay(tx)}>
                                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                                {t('transactionsPage.table.openDay')}
                              </Button>
                              <Button className="min-h-11 gap-1.5 px-2.5 py-1.5 text-[13px]" variant="secondary" onClick={() => handleDismissReview(tx)}>
                                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                                {t('transactionsPage.table.markReviewed')}
                              </Button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            aria-label={t('transactionsPage.table.deleteLabel', { name: tx.memo?.trim() || tx.category_name || tx.id })}
                            className={`${ICON_BUTTON_CLASS} h-11 w-11 hover:!bg-expense-tint hover:!text-expense`}
                            onClick={() => void handleDeleteTransaction(tx)}
                            disabled={deleteTransactionMutation.isPending}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {pendingUndo ? (
              <div className="fixed bottom-[calc(5rem+var(--safe-area-bottom))] left-1/2 z-30 flex w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-ink px-5 py-3.5 text-white shadow-ambient min-[1000px]:bottom-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t('transactionsPage.undo.deleted')}</p>
                  <p className="truncate text-xs text-white/75">{pendingUndo.category_name ?? pendingUndo.id}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-ink transition hover:bg-ground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 motion-reduce:transition-none"
                  onClick={() => void handleUndoDelete()}
                  disabled={createTransactionMutation.isPending}
                >
                  <Undo2 aria-hidden="true" className="h-4 w-4" />
                  {t('transactionsPage.undo.undo')}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
            <article className="rounded-lg border border-black/10 bg-white p-3 md:p-5">
              <div className="mb-3 flex items-center gap-1 md:mb-4">
                <button
                  type="button"
                  aria-label={t('transactionsPage.calendar.previousMonth')}
                  className={`grid h-11 w-11 place-items-center rounded-full text-action transition hover:bg-action-tint motion-reduce:transition-none ${FOCUS_RING_CLASS}`}
                  onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <h3 aria-live="polite" className="px-1 font-headline text-xl font-bold tabular-nums text-ink md:text-2xl">
                  {activeMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  aria-label={t('transactionsPage.calendar.nextMonth')}
                  className={`grid h-11 w-11 place-items-center rounded-full text-action transition hover:bg-action-tint motion-reduce:transition-none ${FOCUS_RING_CLASS}`}
                  onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={`ml-auto min-h-11 rounded-lg px-3 text-[13px] font-semibold text-action transition hover:bg-action-tint motion-reduce:transition-none ${FOCUS_RING_CLASS}`}
                  onClick={() => setActiveMonth(new Date())}
                >
                  {t('transactionsPage.calendar.today')}
                </button>
              </div>
              <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-black/10">
                {weekdayLabels.map((d) => (
                  <div key={d} className="border-b border-black/10 bg-ground py-2 text-center text-xs font-semibold text-ink-tertiary">
                    {d}
                  </div>
                ))}
                {monthCells.map((cell) => {
                  const key = toLocalDateKey(cell)
                  const items = txByDay.get(key) ?? []
                  const totals = items.reduce(
                    (acc, tx) => {
                      if (tx.type === 'income') acc.in += tx.amount
                      if (tx.type === 'expense') acc.out += tx.amount
                      return acc
                    },
                    { in: 0, out: 0 },
                  )
                  const inMonth = cell.getMonth() === activeMonth.getMonth()
                  const selected = effectiveSelectedDay === key
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      className={`min-h-[68px] min-w-0 border-b border-r border-black/5 p-1 text-left transition motion-reduce:transition-none focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action md:min-h-[112px] md:p-2 ${
                        selected ? 'bg-action-tint ring-1 ring-inset ring-action' : inMonth ? 'bg-white hover:bg-ground' : 'bg-ground/60'
                      }`}
                      onClick={() => setSelectedDay(key)}
                    >
                      <p className={`text-xs font-semibold tabular-nums ${selected ? 'text-action' : inMonth ? 'text-ink' : 'text-ink-tertiary'}`}>{cell.getDate()}</p>
                      <div className="mt-1 hidden space-y-0.5 md:block">
                        {totals.out > 0 ? <p className="truncate rounded-sm bg-expense-tint px-1 py-0.5 text-[10px] font-semibold tabular-nums text-expense">-{formatCurrency(totals.out)}</p> : null}
                        {totals.in > 0 ? <p className="truncate rounded-sm bg-income-tint px-1 py-0.5 text-[10px] font-semibold tabular-nums text-income">+{formatCurrency(totals.in)}</p> : null}
                      </div>
                      {totals.out > 0 || totals.in > 0 ? (
                        <div className="mt-1.5 flex gap-1 md:hidden">
                          {totals.out > 0 ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-expense" /> : null}
                          {totals.in > 0 ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-income" /> : null}
                          <span className="sr-only">
                            {totals.out > 0 ? `-${formatCurrency(totals.out)} ` : ''}
                            {totals.in > 0 ? `+${formatCurrency(totals.in)}` : ''}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </article>

            <div className="space-y-4">
              <article className="rounded-lg border border-black/10 bg-white p-4 md:p-5">
                <p className={FIELD_LABEL_CLASS}>
                  {t('transactionsPage.calendar.dailySummary')}
                </p>
                <h4 className="mt-1 font-headline text-2xl font-bold tabular-nums text-ink">
                  {fromLocalDateKey(effectiveSelectedDay).toLocaleDateString(locale)}
                </h4>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-ground p-3">
                    <p className={FIELD_LABEL_CLASS}>
                      {t('transactionsPage.calendar.totalOut')}
                    </p>
                    <p className="mt-1.5 font-headline text-2xl font-bold tabular-nums text-expense">-{formatCurrency(selectedTotals.out)}</p>
                  </div>
                  <div className="rounded-lg bg-ground p-3">
                    <p className={FIELD_LABEL_CLASS}>
                      {t('transactionsPage.calendar.totalIn')}
                    </p>
                    <p className="mt-1.5 font-headline text-2xl font-bold tabular-nums text-income">+{formatCurrency(selectedTotals.in)}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {selectedDayTx.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="rounded-lg bg-ground p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate font-semibold text-ink">{tx.category_name ?? t('transactionsPage.quickFilters.uncategorized')}</p>
                        <p className={`shrink-0 font-bold tabular-nums ${AMOUNT_TONE_CLASS[tx.type]}`}>
                          {formatSignedAmount(tx.type, tx.amount)}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-ink-secondary">
                        {tx.memo?.trim() || (tx.type === 'income' ? t('transaction.typeIncome') : tx.type === 'expense' ? t('transaction.typeExpense') : t('transaction.typeTransfer'))}
                      </p>
                    </div>
                  ))}
                  {selectedDayTx.length === 0 ? <p className="text-sm text-ink-secondary">{t('transactionsPage.calendar.noTransactions')}</p> : null}
                </div>
              </article>
              <article className="rounded-lg bg-action p-4 text-white md:p-5">
                <p className="text-[13px] font-semibold">{t('transactionsPage.calendar.monthSummary')}</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-white">{t('transactionsPage.calendar.income')}</p>
                    <p className="mt-0.5 font-headline whitespace-nowrap text-xl font-bold tabular-nums sm:text-2xl">+{formatCurrency(monthTotals.in)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{t('transactionsPage.calendar.expense')}</p>
                    <p className="mt-0.5 font-headline whitespace-nowrap text-xl font-bold tabular-nums sm:text-2xl">-{formatCurrency(monthTotals.out)}</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-white/25 pt-4">
                  <p className="text-xs font-medium text-white">{t('transactionsPage.calendar.net')}</p>
                  <p className="mt-0.5 whitespace-nowrap font-headline text-[28px] font-bold leading-tight tabular-nums">{formatCurrency(monthTotals.in - monthTotals.out)}</p>
                </div>
              </article>
            </div>
          </div>
        )}
      </section>

      {showImportDialog ? (
        <DialogShell
          title={t('transactionsPage.importDialog.title')}
          description={t('transactionsPage.importDialog.description')}
          onClose={handleCloseImportDialog}
          footer={
            <>
              <Button variant="ghost" onClick={handleCloseImportDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" form="import-preview-form">
                {t('transactionsPage.importDialog.preview')}
              </Button>
            </>
          }
        >
          <form id="import-preview-form" className="space-y-5" onSubmit={(event) => void handlePreviewImport(event)}>
            {showImportStatusPanel ? (
              <div
                role="status"
                aria-live="polite"
                data-testid="import-status-panel"
                className={`sticky top-0 z-20 rounded-lg border p-3 shadow-sm backdrop-blur ${
                  importStatusError
                    ? 'border-error/30 bg-error-container/95 text-on-error-container'
                    : importResult?.fail_count
                      ? 'border-amber-200 bg-amber-50/95 text-amber-900'
                      : importResult
                        ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                        : 'border-action/20 bg-action-tint/95 text-action'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{importStatusTitle}</p>
                    <p className="mt-1 text-xs font-medium text-ink-secondary">{importStatusDescription}</p>
                  </div>
                  {importResult ? (
                    <p className="text-sm font-bold">
                      {importStatusSummary}
                    </p>
                  ) : null}
                </div>
                {isImportWorking ? (
                  <>
                    <div
                      role="progressbar"
                      aria-label={t('transactionsPage.importDialog.progressLabel')}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={displayedImportProgressPercent}
                      className="mt-3 h-2 overflow-hidden rounded-full bg-white"
                    >
                      <div className="h-full rounded-full bg-action transition-all duration-500 motion-reduce:transition-none" style={{ width: `${displayedImportProgressPercent}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold tabular-nums text-ink">
                      <span>{importStatusSummary}</span>
                      <span>{displayedImportProgressPercent}%</span>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <label
              htmlFor="csv-file"
              className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/15 bg-ground p-8 text-center transition hover:border-action/50 focus-within:border-action focus-within:ring-2 focus-within:ring-action/30 motion-reduce:transition-none"
            >
              <Upload aria-hidden="true" className="h-9 w-9 text-action" />
              <p className="mt-4 text-xl font-semibold text-ink">{t('transactionsPage.importDialog.dropTitle')}</p>
              <p className="mt-2 text-sm text-ink-secondary">{t('transactionsPage.importDialog.supportedFormats')}</p>
              <span className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-black/10 bg-white px-5 text-sm font-semibold text-action">{t('transactionsPage.importDialog.selectFiles')}</span>
              <input id="csv-file" type="file" accept=".csv,text/csv" aria-label={t('transactionsPage.importDialog.csvFileLabel')} className="sr-only" onChange={(event) => handleImportFileChange(event.target.files?.[0] ?? null)} />
            </label>
            {importFile && !importPreviewMutation.data ? (
              <p className="text-sm text-ink">{t('transactionsPage.importDialog.selected', { name: importFile.name })}</p>
            ) : null}
            {importPreviewMutation.isError ? (
              <div className="rounded-lg border border-error/40 bg-error-container p-4">
                <p className="text-sm text-on-error-container">
                  {t('transactionsPage.importDialog.previewFailed', {
                    message: getFriendlyApiErrorMessage(importPreviewMutation.error, t),
                  })}
                </p>
              </div>
            ) : null}
            {importPreviewMutation.data ? (
              <div className="space-y-4 rounded-lg border border-black/10 bg-ground p-4">
                <div>
                  <p className={FIELD_LABEL_CLASS}>
                    {t('transactionsPage.importDialog.summaryTitle')}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-3">
                      <p className={FIELD_LABEL_CLASS}>
                        {t('transactionsPage.importDialog.file')}
                      </p>
                      <p className="mt-1 truncate text-sm font-bold tabular-nums text-ink">{importFile?.name ?? '-'}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className={FIELD_LABEL_CLASS}>
                        {t('transactionsPage.importDialog.columns')}
                      </p>
                      <p className="mt-1 text-sm font-bold tabular-nums text-ink">{importPreviewMutation.data.columns.length}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className={FIELD_LABEL_CLASS}>
                        {t('transactionsPage.importDialog.previewRows')}
                      </p>
                      <p className="mt-1 text-sm font-bold tabular-nums text-ink">{importPreviewMutation.data.sample_rows.length}</p>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium leading-5 text-ink-secondary">
                    {t('transactionsPage.importDialog.dedupeHint')}
                  </p>
                </div>
                <p className={FIELD_LABEL_CLASS}>
                  {t('transactionsPage.importDialog.detectedColumns')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {importPreviewMutation.data.columns.map((column) => (
                    <span key={column} className="rounded-full bg-white px-3 py-1 text-sm text-ink">
                      {column}
                    </span>
                  ))}
                </div>
                <section className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-headline text-xl font-bold leading-tight text-ink">
                        {t('transactionsPage.importDialog.mappingTitle')}
                      </h3>
                      <p className="mt-1 text-sm text-ink-secondary">
                        {t('transactionsPage.importDialog.mappingDescription')}
                      </p>
                    </div>
                    <p className={`rounded-full px-3 py-1 text-xs font-bold ${importMappingReady ? 'bg-action-tint text-action' : 'bg-amber-50 text-amber-800'}`}>
                      {importMappingReady ? t('transactionsPage.importDialog.mappingReady') : t('transactionsPage.importDialog.mappingNeedsFields')}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {([
                      ['date', t('transactionsPage.importDialog.dateColumn')],
                      ['amount', t('transactionsPage.importDialog.amountColumn')],
                      ['description', t('transactionsPage.importDialog.memoColumn')],
                      ['type', t('transactionsPage.importDialog.typeColumn')],
                      ['category', t('transactionsPage.importDialog.categoryColumn')],
                      ['account', t('transactionsPage.importDialog.accountColumn')],
                      ['ledger', t('transactionsPage.importDialog.ledgerColumn')],
                    ] as Array<[keyof ImportMapping, string]>).map(([slot, label]) => (
                      <label key={slot} className="space-y-2">
                        <span className={FIELD_LABEL_CLASS}>{label}</span>
                        <select
                          aria-label={label}
                          className={FIELD_CLASS}
                          value={importMapping[slot]}
                          onChange={(event) => setImportMappingColumn(slot, event.target.value)}
                        >
                          <option value="">{t('transactionsPage.importDialog.ignoreColumn')}</option>
                          {importPreviewMutation.data.columns.map((column) => (
                            <option key={`${slot}-${column}`} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <label className="space-y-1.5">
                      <span className={FIELD_LABEL_CLASS}>
                        {t('transactionsPage.importDialog.defaultAccount')}
                      </span>
                      <select
                        aria-label={t('transactionsPage.importDialog.defaultAccount')}
                        className={FIELD_CLASS}
                        value={importDefaultAccountId}
                        onChange={(event) => setImportDefaultAccountId(event.target.value)}
                      >
                        <option value="">{t('transactionsPage.addDialog.selectAccount')}</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className={FIELD_LABEL_CLASS}>
                        {t('transactionsPage.importDialog.defaultLedger')}
                      </span>
                      <select
                        aria-label={t('transactionsPage.importDialog.defaultLedger')}
                        className={FIELD_CLASS}
                        value={importDefaultLedgerId}
                        onChange={(event) => setImportDefaultLedgerId(event.target.value)}
                      >
                        <option value="">{t('transactionsPage.filters.allLedgers')}</option>
                        {ledgers.map((ledger) => (
                          <option key={ledger.id} value={ledger.id}>
                            {ledger.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
                <section className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-headline text-xl font-bold leading-tight text-ink">
                        {t('transactionsPage.importDialog.mappedPreviewTitle')}
                      </h3>
                      <p className="mt-1 text-sm text-ink-secondary">
                        {t('transactionsPage.importDialog.mappedPreviewDescription')}
                      </p>
                    </div>
                    <p className={`rounded-full px-3 py-1 text-xs font-bold ${importMappingReady ? 'bg-income-tint text-income' : 'bg-amber-50 text-amber-800'}`}>
                      {importMappingReady ? t('transactionsPage.importDialog.mappedPreviewReady') : t('transactionsPage.importDialog.mappedPreviewNeedsMapping')}
                    </p>
                  </div>
                  {importMappingReady ? (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-black/10">
                      <div className="grid min-w-[640px] grid-cols-[1.1fr_0.8fr_1.5fr_0.8fr_1fr] gap-3 bg-ground px-3 py-2 text-xs font-semibold text-ink-tertiary">
                        <span>{t('transactionsPage.importDialog.previewDate')}</span>
                        <span>{t('transactionsPage.importDialog.previewAmount')}</span>
                        <span>{t('transactionsPage.importDialog.previewMemo')}</span>
                        <span>{t('transactionsPage.importDialog.previewType')}</span>
                        <span>{t('transactionsPage.importDialog.previewCategory')}</span>
                      </div>
                      {importMappedPreviewRows.map((row, index) => (
                        <div key={`${row.date}-${row.amount}-${index}`} className="grid min-w-[640px] grid-cols-[1.1fr_0.8fr_1.5fr_0.8fr_1fr] gap-3 border-t border-black/10 px-3 py-2 text-sm text-ink">
                          <span className="truncate">{row.date || '-'}</span>
                          <span className="truncate font-semibold tabular-nums">{row.amount || '-'}</span>
                          <span className="truncate">{row.description || '-'}</span>
                          <span className="truncate">{row.type || '-'}</span>
                          <span className="truncate">{row.category || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      {t('transactionsPage.importDialog.missingRequiredMapping')}
                    </p>
                  )}
                </section>
                <div className="mt-4 flex items-center gap-3">
                  <Button onClick={() => void handleConfirmImport()} disabled={isImportWorking || !importMappingReady}>
                    {isImportWorking ? t('transactionsPage.importDialog.importing') : t('transactionsPage.importDialog.confirm')}
                  </Button>
                  {importStatusError ? (
                    <span className="text-sm text-error">
                      {t('transactionsPage.importDialog.importFailed', {
                        message: getFriendlyApiErrorMessage(importStatusError, t),
                      })}
                    </span>
                  ) : null}
                  {activeImportJob?.status === 'running' ? (
                    <span className="text-sm text-action">{t('transactionsPage.importDialog.backgroundRunning')}</span>
                  ) : null}
                  {importResult ? (
                    <span className="text-sm font-semibold text-income">{t('transactionsPage.importDialog.importSuccessful')}</span>
                  ) : null}
                </div>
                {importResult ? (
                  <section className="rounded-lg border border-black/10 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-headline text-xl font-bold leading-tight text-ink">
                          {t('transactionsPage.importDialog.resultsTitle')}
                        </h3>
                        <p className="mt-1 text-sm text-ink-secondary">
                          {t('transactionsPage.importDialog.resultsDescription')}
                        </p>
                      </div>
                      {importProblemRows.length > 0 ? (
                        <Button className="min-h-11 px-3 py-2 text-[13px] md:min-h-9" variant="secondary" onClick={handleDownloadImportProblems}>
                          <FileDown aria-hidden="true" className="h-4 w-4" />
                          {t('transactionsPage.importDialog.downloadProblems')}
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg bg-income-tint p-3">
                        <p className="text-[13px] font-semibold text-income">
                          {t('transactionsPage.importDialog.importedLabel')}
                        </p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-income">
                          {t('transactionsPage.importDialog.importedCount', { count: importResult.success_count })}
                        </p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-[13px] font-semibold text-amber-800">
                          {t('transactionsPage.importDialog.skippedLabel')}
                        </p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-amber-900">
                          {t('transactionsPage.importDialog.skippedCount', { count: importResult.skip_count })}
                        </p>
                      </div>
                      <div className="rounded-lg bg-expense-tint p-3">
                        <p className="text-[13px] font-semibold text-expense">
                          {t('transactionsPage.importDialog.failedLabel')}
                        </p>
                        <p className="mt-1 text-sm font-bold tabular-nums text-expense">
                          {t('transactionsPage.importDialog.failedCount', { count: importResult.fail_count })}
                        </p>
                      </div>
                    </div>
                    {importProblemRows.length > 0 ? (
                      <div className="mt-4 max-h-56 overflow-auto overscroll-contain rounded-lg border border-black/10">
                        {importProblemRows.slice(0, 8).map((row) => (
                          <div key={`${row.row_index}-${row.status}`} className="grid grid-cols-[72px_1fr_1.3fr] gap-3 border-t border-black/10 px-3 py-2 first:border-t-0">
                            <p className="text-xs font-bold tabular-nums text-ink">{t('transactionsPage.importDialog.rowNumber', { row: row.row_index + 1 })}</p>
                            <p className="text-xs font-semibold capitalize text-ink-secondary">{row.status}</p>
                            <p className="text-xs text-ink">{getImportReasonLabel(row.reason)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg bg-income-tint px-3 py-2 text-sm font-semibold text-income">
                        {t('transactionsPage.importDialog.noProblems')}
                      </p>
                    )}
                  </section>
                ) : null}
              </div>
            ) : null}
          </form>
        </DialogShell>
      ) : null}

      {showAddDialog ? (
        <DialogShell
          title={t('transactionsPage.addDialog.title')}
          description={t('transactionsPage.addDialog.description')}
          onClose={() => setShowAddDialog(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" form="add-transaction-form" disabled={!canSubmitTransaction || createTransactionMutation.isPending}>
                {t('transactionsPage.addDialog.save')}
              </Button>
            </>
          }
        >
          <form id="add-transaction-form" className="grid gap-4 md:grid-cols-2 md:gap-5" onSubmit={(event) => void handleCreateTransaction(event)}>
            <TextField aria-label={t('transaction.amount')} label={t('transaction.amount')} type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" helperText={t('transactionsPage.addDialog.amountHelper')} />
            <SelectField label={t('transaction.type')} value={transactionType} onChange={(event) => setTransactionType(event.target.value as 'income' | 'expense')}>
              <option value="expense">{t('transaction.typeExpense')}</option>
              <option value="income">{t('transaction.typeIncome')}</option>
            </SelectField>
            <SelectField aria-label={t('transaction.category')} label={t('transaction.category')} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} helperText={t('transactionsPage.addDialog.categoryHelper')}>
              <option value="">{t('transactionsPage.addDialog.selectCategory')}</option>
              {categoryOptionGroups.common.length > 0 ? (
                <optgroup label={t('transactionsPage.addDialog.commonCategories')}>
                  {categoryOptionGroups.common.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {categoryOptionGroups.other.length > 0 ? (
                <optgroup label={t('transactionsPage.addDialog.allCategories')}>
                  {categoryOptionGroups.other.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </SelectField>
            <SelectField
              label={t('transaction.account')}
              aria-label={t('transaction.account')}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              helperText={accounts.length === 1 ? t('transactionsPage.addDialog.singleAccountHelper') : undefined}
            >
              <option value="">{t('transactionsPage.addDialog.selectAccount')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
            <TextField label={t('transaction.dateTime')} type="datetime-local" step="1" value={date} onChange={(event) => setDate(event.target.value)} />
            <SelectField label={t('transactionsPage.filters.ledger')} defaultValue={ledgers[0]?.id ?? ''} disabled>
              {ledgers.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.name}
                </option>
              ))}
            </SelectField>
            <div className="md:col-span-2">
              <TextField label={t('transaction.memo')} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder={t('transactionsPage.addDialog.memoPlaceholder')} />
            </div>
            {tags.length > 0 ? (
              <fieldset className="md:col-span-2">
                <legend className={`mb-2 ${FIELD_LABEL_CLASS}`}>{t('transactionsPage.table.tags')}</legend>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={selected}
                        className={`min-h-11 rounded-full px-3.5 text-[13px] font-semibold transition motion-reduce:transition-none md:min-h-9 ${FOCUS_RING_CLASS} ${
                          selected ? 'bg-action text-white' : 'bg-ground text-ink-control hover:bg-segment-track'
                        }`}
                        onClick={() =>
                          setSelectedTagIds((current) =>
                            current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id],
                          )
                        }
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}
          </form>
        </DialogShell>
      ) : null}
    </div>
  )
}
