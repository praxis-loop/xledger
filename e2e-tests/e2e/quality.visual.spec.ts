import { devices } from '@playwright/test'
import type { Page } from '@playwright/test'
import { expect, test } from './fixture'
import { appRoutes, installVisualStabilizers } from './helpers/quality'
import { bootstrapAuthedSession } from './helpers/ui-flows'

const { defaultBrowserType: _ignored, ...iphone13 } = devices['iPhone 13']
const { defaultBrowserType: _ignoredLandscape, ...iphone13Landscape } = devices['iPhone 13 landscape']

async function prepareVisualSession(page: Page, testInfo: Parameters<typeof bootstrapAuthedSession>[1]) {
  await installVisualStabilizers(page)
  await bootstrapAuthedSession(page, testInfo)
}

async function captureDashboard(page: Page, snapshotName: string, navigate = true) {
  if (navigate) {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
  }
  await expect(page.getByRole('heading', { name: /Financial Overview|财务概览/ })).toBeVisible()
  await expect(page).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    fullPage: false,
    maxDiffPixelRatio: 0.02,
  })
}

async function captureVisualBaselines(page: Page, viewportTag: string) {
  for (const route of appRoutes) {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
    await expect(page).toHaveScreenshot(`visual-${viewportTag}-${route.snapshotKey}.png`, {
      animations: 'disabled',
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    })
  }
}

test.describe('visual regression @visual', () => {
  test.describe('desktop', () => {
    test.use({
      viewport: { width: 1440, height: 900 },
    })

    test('core pages visual baseline', async ({ page }, testInfo) => {
      await installVisualStabilizers(page)
      await bootstrapAuthedSession(page, testInfo)
      await captureVisualBaselines(page, 'desktop')
    })
  })

  test.describe('mobile', () => {
    test.use({
      ...iphone13,
    })

    test('core pages visual baseline', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.setProperty('--safe-area-top', '47px')
          document.documentElement.style.setProperty('--safe-area-bottom', '34px')
        }, { once: true })
      })
      await installVisualStabilizers(page)
      await bootstrapAuthedSession(page, testInfo)
      await captureVisualBaselines(page, 'mobile')
    })
  })

  test.describe('compact mobile', () => {
    test.use({ viewport: { width: 320, height: 740 } })

    test('dashboard fits a 320px viewport', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-mobile-320-dashboard.png')
    })
  })

  test.describe('responsive boundary below md', () => {
    test.use({ viewport: { width: 767, height: 900 } })

    test('dashboard stays in the mobile shell at 767px', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-mobile-767-dashboard.png')
    })
  })

  test.describe('tablet boundary', () => {
    test.use({ viewport: { width: 768, height: 900 } })

    test('dashboard keeps the compact shell at 768px', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-mobile-768-dashboard.png')
    })
  })

  test.describe('desktop shell boundary', () => {
    test.use({ viewport: { width: 1024, height: 900 } })

    test('dashboard enters the desktop shell at 1024px', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-desktop-1024-dashboard.png')
      await expect(page.getByPlaceholder('Search transactions...')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible()
    })
  })

  test.describe('mobile landscape', () => {
    test.use({ ...iphone13Landscape })

    test('dashboard fits iPhone landscape', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.setProperty('--safe-area-left', '47px')
          document.documentElement.style.setProperty('--safe-area-right', '47px')
        }, { once: true })
      })
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-mobile-landscape-dashboard.png')
    })
  })

  test.describe('browser zoom', () => {
    test.use({ viewport: { width: 640, height: 900 } })

    test('dashboard remains usable at 200 percent zoom', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.zoom = '2'
        }, { once: true })
      })
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-mobile-zoom-200-dashboard.png')
    })
  })

  test.describe('Chinese mobile', () => {
    test.use({ ...iphone13 })

    test('dashboard fits translated Chinese labels', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await page.getByLabel('Select language').selectOption('zh')
      await expect(page.getByRole('heading', { name: '财务概览' })).toBeVisible()
      await captureDashboard(page, 'visual-mobile-zh-dashboard.png', false)
    })
  })
})
