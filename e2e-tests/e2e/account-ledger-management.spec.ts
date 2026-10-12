import { expect, test } from './fixture'
import {
  bootstrapAuthedSession,
  createAccountOnAccountsPage,
  createLedgerInSettings,
  openAccounts,
  uniqueName,
} from './helpers/ui-flows'

test('account management flow: edit and archive account, rename/delete ledger', async ({ page, recordToReport }, testInfo) => {
  await bootstrapAuthedSession(page, testInfo)
  await openAccounts(page)

  const accountName = uniqueName('E2E Editable Account')
  await createAccountOnAccountsPage(page, {
    name: accountName,
    initialBalance: '1500',
  })

  await page.getByRole('button', { name: `Edit account ${accountName}` }).click()

  const updatedAccountName = uniqueName('E2E Edited Account')
  await page.getByLabel('Account name').fill(updatedAccountName)
  await page.getByLabel('Account type').selectOption('debit')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  const accountLink = page.getByRole('link', { name: new RegExp(updatedAccountName) })
  await expect(accountLink).toBeVisible()
  await expect(accountLink).toContainText('Debit card')

  await page.getByRole('button', { name: `Edit account ${updatedAccountName}` }).click()
  await page.getByRole('button', { name: 'Archive account' }).click()
  await expect(page.getByRole('dialog', { name: `Archive "${updatedAccountName}"?` })).toBeVisible()
  await page.getByRole('button', { name: 'Archive account' }).click()
  await expect(accountLink).toHaveCount(0)
  await page.getByText(/^Archived \(\d+\)$/).click()
  await expect(page.getByRole('button', { name: `Restore account ${updatedAccountName}` })).toBeVisible()

  const ledgerName = uniqueName('E2E Editable Ledger')
  await createLedgerInSettings(page, ledgerName)
  const updatedLedgerName = uniqueName('E2E Renamed Ledger')

  await page.getByRole('button', { name: `Rename ledger ${ledgerName}` }).click()
  await page.getByLabel('Ledger name').fill(updatedLedgerName)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByText(updatedLedgerName, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: `Delete ledger ${updatedLedgerName}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText(updatedLedgerName, { exact: true })).toHaveCount(0)

  await recordToReport('Account and ledger management verified', {
    content: `Account updated and archived: ${updatedAccountName}; ledger deleted: ${updatedLedgerName}`,
  })
})
