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

async function expectNoPageHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth)
}

async function expectMobileQuickFiltersScrollable(page: Page) {
  const quickFilters = page.locator('[data-ui="transaction-quick-filters"]')
  await expect(quickFilters).toBeVisible()
  const scrollState = await quickFilters.evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
  }))

  expect(scrollState.overflowX).toBe('auto')
  expect(scrollState.scrollWidth).toBeGreaterThan(scrollState.clientWidth)
}

async function captureDashboard(page: Page, snapshotName: string, navigate = true) {
  if (navigate) {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
  }
  await expect(page.getByRole('heading', { name: /Financial Overview|财务概览/ })).toBeVisible()
  await expectNoPageHorizontalOverflow(page)
  await expect(page).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    fullPage: false,
    maxDiffPixelRatio: 0.02,
  })
}

async function captureVisualBaselines(
  page: Page,
  viewportTag: string,
  routes = appRoutes,
) {
  for (const route of routes) {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible()
    await expectNoPageHorizontalOverflow(page)
    if (route.path === '/transactions' && (page.viewportSize()?.width ?? 1000) < 1000) {
      await expectMobileQuickFiltersScrollable(page)
    }
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

    test('core mobile destinations fit a 320px viewport', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await captureDashboard(page, 'visual-mobile-320-dashboard.png')
      await captureVisualBaselines(
        page,
        'mobile-320',
        appRoutes.filter((route) => ['/me', '/transactions', '/import'].includes(route.path)),
      )
    })
  })

  test.describe('mobile shell boundary', () => {
    test.use({ viewport: { width: 999, height: 900 } })

    test('keeps the mobile shell through 999px', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await page.goto('/dashboard', { waitUntil: 'networkidle' })
      await expect(page.locator('[data-ui="desktop-top-bar"]')).toBeHidden()
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
      await captureDashboard(page, 'visual-mobile-999-dashboard.png', false)
    })
  })

  test.describe('desktop shell threshold', () => {
    test.use({ viewport: { width: 1000, height: 900 } })

    test('enters the desktop shell at 1000px', async ({ page }, testInfo) => {
      await prepareVisualSession(page, testInfo)
      await page.goto('/dashboard', { waitUntil: 'networkidle' })
      await expect(page.locator('[data-ui="desktop-top-bar"]')).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden()
      await captureDashboard(page, 'visual-desktop-1000-dashboard.png', false)
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
      await captureVisualBaselines(
        page,
        'mobile-landscape',
        appRoutes.filter((route) => ['/me', '/transactions', '/import'].includes(route.path)),
      )
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
      await page.goto('/me', { waitUntil: 'networkidle' })
      await page.getByRole('radio', { name: '中文' }).check()
      await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
      await page.getByRole('link', { name: '首页' }).click()
      await expect(page.getByRole('heading', { name: '财务概览' })).toBeVisible()
      await captureDashboard(page, 'visual-mobile-zh-dashboard.png', false)
    })
  })
})
