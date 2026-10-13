import { expect, type Page, type TestInfo } from '@playwright/test'
import { XledgerApiClient } from './api-client'
import { injectSession, prepareSession, type PreparedSession } from './session'

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080/api'

export interface E2ESessionContext {
  apiClient: XledgerApiClient
  session: PreparedSession
}

export function uniqueName(prefix: string): string {
  const now = Date.now()
  const salt = Math.floor(Math.random() * 10_000)
  return `${prefix} ${now}-${salt}`
}

export async function bootstrapAuthedSession(page: Page, testInfo: TestInfo): Promise<E2ESessionContext> {
  const apiClient = new XledgerApiClient(API_BASE_URL)
  const runTag = `${testInfo.title}-${testInfo.retry}`
  const session = await prepareSession(apiClient, runTag)

  await injectSession(page, session.authSession)
  await page.goto('/dashboard?lang=en', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Financial Overview' })).toBeVisible()

  return { apiClient, session }
}

// Page content can contain links whose accessible names include nav labels (e.g. an account row's
// "View transactions"), so navigation helpers only look inside the primary navigation.
function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' })
}

export async function openAccounts(page: Page) {
  await primaryNav(page).getByRole('link', { name: 'Accounts', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible()
}

export async function openTransactions(page: Page) {
  await primaryNav(page).getByRole('link', { name: 'Transactions', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible()
}

export async function openDashboard(page: Page) {
  await primaryNav(page).getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Financial Overview' })).toBeVisible()
}

export async function openAnalytics(page: Page) {
  await primaryNav(page).getByRole('link', { name: 'Analytics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
}

export async function openSettings(page: Page) {
  await primaryNav(page).getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
}

export async function createAccountOnAccountsPage(page: Page, input: { name: string; initialBalance: string }) {
  await openAccounts(page)
  // A user with no accounts only sees the empty-state call to action.
  await page.getByRole('button', { name: /^(New account|Create your first account)$/ }).click()
  await page.getByLabel('Account name').fill(input.name)
  await page.getByLabel('Initial balance').fill(input.initialBalance)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(input.name)).toBeVisible()
}

// Ledgers are managed in Settings (moved off the Accounts page).
export async function createLedgerInSettings(page: Page, ledgerName: string) {
  await openSettings(page)
  await page.getByRole('button', { name: 'New ledger' }).click()
  await page.getByLabel('Ledger name').fill(ledgerName)
  await page.getByRole('button', { name: 'Create ledger' }).click()
  await expect(page.getByText(ledgerName)).toBeVisible()
}

export async function createTransactionOnTransactionsPage(
  page: Page,
  input: { amount: string; memo: string; type: 'income' | 'expense' },
) {
  await page.getByRole('button', { name: '+ Add Transaction' }).click()
  const form = page.locator('#add-transaction-form')
  await expect(form).toBeVisible()
  await form.getByLabel('Amount').fill(input.amount)
  await form.getByLabel('Date & Time').evaluate((node, value) => {
    const inputElement = node as HTMLInputElement
    inputElement.value = value
    inputElement.dispatchEvent(new Event('input', { bubbles: true }))
    inputElement.dispatchEvent(new Event('change', { bubbles: true }))
  }, stableTransactionDateTime())
  await form.getByLabel('Memo').fill(input.memo)
  await form.getByLabel('Type').selectOption(input.type)
  const accountSelect = form.getByLabel('Account')
  await expect.poll(async () => accountSelect.locator('option').count(), { timeout: 10_000 }).toBeGreaterThan(1)
  const accountOptions = await accountSelect.locator('option').allTextContents()
  const firstAccount = accountOptions.find((option) => option !== 'Select account')
  if (firstAccount) {
    await accountSelect.selectOption({ label: firstAccount })
  }

  const createRequest = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().includes('/api/transactions')
  })

  await page.getByRole('button', { name: 'Save Transaction' }).click()
  const createResponse = await createRequest
  if (!createResponse.ok()) {
    throw new Error(`Create transaction failed: ${createResponse.status()} ${await createResponse.text()}`)
  }

  await expect(form).toBeHidden()
  const memoLocator = page.getByText(input.memo, { exact: true })
  try {
    await expect(memoLocator).toBeVisible({ timeout: 5_000 })
  } catch {
    await page.reload({ waitUntil: 'networkidle' })
    await expect(memoLocator).toBeVisible({ timeout: 15_000 })
  }
}

function stableTransactionDateTime() {
  const value = new Date(Date.now() - 60_000)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const seconds = String(value.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}
