import { ApiHttpError } from './helpers/api-client'
import { bootstrapAuthedSession } from './helpers/ui-flows'
import { expect, test } from './fixture'

test('profile flow: save profile can also change password', async ({ page, recordToReport }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const { apiClient, session } = await bootstrapAuthedSession(page, testInfo)
  const newPassword = `E2E-new-pass-${Date.now()}`

  await page.getByRole('button', { name: /E2E/ }).click()
  await page.getByLabel('Current Password').fill(session.password)
  await page.getByLabel('New Password').fill(newPassword)

  const changePasswordResponse = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && response.url().includes('/api/auth/change-password')
  })

  await page.getByRole('button', { name: 'Save Profile' }).click()
  const response = await changePasswordResponse
  expect(response.ok()).toBeTruthy()
  await expect(page.getByText('Profile and password updated.')).toBeVisible()

  const nextTokens = await apiClient.login(session.email, newPassword)
  expect(nextTokens.access_token).toBeTruthy()

  await expect(async () => {
    await apiClient.login(session.email, session.password)
  }).rejects.toMatchObject({
    status: 401,
  } satisfies Partial<ApiHttpError>)

  await recordToReport('Profile password update verification passed', {
    content: `password changed for ${session.email}`,
  })
})

test('mobile Me page opens the shared profile dialog', async ({ page }, testInfo) => {
  await bootstrapAuthedSession(page, testInfo)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/me', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /profile/i }).click()

  await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible()
  await expect(page.getByLabel('Display Name')).toBeVisible()
})
