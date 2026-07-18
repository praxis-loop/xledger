# Xledger Mobile Navigation and Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved B navigation model with a five-tab mobile shell, an independent “Me” page, denser transaction hierarchy, and a compact three-step import page without changing backend or database contracts.

**Architecture:** Lift the account dialogs and account mutations currently owned by `TopBar` into an AppShell-level `AccountCenterProvider`; desktop `TopBar` and mobile `MePage` consume the same actions. Keep transaction and import domain hooks unchanged, and use responsive markup/classes plus stable accessibility semantics to change only the mobile presentation below 1000px.

**Tech Stack:** React 18, TypeScript 5.6, React Router 6, react-i18next, TanStack Query 5, Tailwind CSS 3, Vitest + Testing Library, Playwright Chromium/WebKit, axe.

---

## File map

**Create**

- `frontend/app/src/components/layout/account-center.tsx` — shared account state, language/logout actions, profile/notification/help/device dialogs, and public account action context.
- `frontend/app/src/pages/me-page.tsx` — independent mobile account hub using iOS grouped lists.
- `frontend/app/src/account-center.test.tsx` — focused shared-provider and dialog ownership coverage.
- `frontend/app/src/mobile-account-center.test.tsx` — focused route, navigation, language, profile, and logout coverage.
- `frontend/app/src/import-page-layout.test.tsx` — standalone import stepper and error-state coverage.

**Modify**

- `frontend/app/src/components/layout/top-bar.tsx` — keep search/PWA controls, consume shared account actions, and hide the visible header below 1000px.
- `frontend/app/src/components/layout/app-shell.tsx` — mount `AccountCenterProvider` once around TopBar, page content, and MobileNav.
- `frontend/app/src/components/layout/nav-items.ts` — replace fixed Import/Settings mobile tabs with Me.
- `frontend/app/src/components/layout/mobile-nav.tsx` — render five columns and keep current-route semantics.
- `frontend/app/src/App.tsx` — lazy-load and protect `/me`.
- `frontend/app/src/pages/transactions-page.tsx` — responsive header/actions, grouped smart views, one-line chips, and mobile import navigation.
- `frontend/app/src/pages/import-page.tsx` — local back behavior, three-step progress, compact upload surface, grouped guidance, and preserved mapping/results.
- `frontend/app/src/locales/en/translation.json` — Me page, mobile actions, import progress, and accessibility labels.
- `frontend/app/src/locales/zh/translation.json` — Chinese equivalents for every new key.
- `frontend/app/src/mobile-ios-design.test.tsx` — exact five-tab assertions.
- `frontend/app/src/transactions-domain.test.tsx` — mobile transaction hierarchy and action menu assertions.
- `frontend/app/src/App.test.tsx` — visible TopBar breakpoint contract and protected `/me` route smoke coverage.
- `e2e-tests/e2e/helpers/quality.ts` — add `/me` and `/import` quality routes.
- `e2e-tests/e2e/quality.visual.spec.ts` — 320px, 999/1000px, portrait, landscape, and Chinese mobile flows.
- `e2e-tests/e2e/quality.a11y.spec.ts` — audit the new mobile actions and account dialogs in open states.
- `e2e-tests/e2e/profile.spec.ts` — verify the shared profile dialog from the mobile Me page.
- `e2e-tests/e2e/quality.visual.spec.ts-snapshots/*.png` — refreshed Chromium and WebKit baselines.

## Task 1: Extract the shared account center without changing desktop behavior

**Files:**

- Create: `frontend/app/src/components/layout/account-center.tsx`
- Create: `frontend/app/src/account-center.test.tsx`
- Modify: `frontend/app/src/components/layout/app-shell.tsx`
- Modify: `frontend/app/src/components/layout/top-bar.tsx`
- Test: `frontend/app/src/App.test.tsx`

- [ ] **Step 1: Add a failing shared-provider test and a desktop characterization test**

Create `account-center.test.tsx`. The import is intentionally RED until `account-center.tsx` exists:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AccountCenterProvider, useAccountCenter } from '@/components/layout/account-center'
import { AuthProvider } from '@/features/auth/auth-context'
import '@/i18n'

function AccountProbe() {
  const account = useAccountCenter()
  return <button onClick={account.openProfile}>{account.displayName}</button>
}

it('owns one shared profile dialog outside the desktop TopBar', async () => {
  const user = userEvent.setup()
  window.localStorage.setItem(
    'xledger.auth',
    JSON.stringify({ accessToken: 'access.shared.token', refreshToken: 'refresh.shared.token', email: 'shared@example.com' }),
  )
  global.fetch = vi.fn(async () => new Response(
    JSON.stringify({ code: 'OK', message: 'Success', data: { email: 'shared@example.com' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )) as typeof fetch
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AccountCenterProvider><AccountProbe /></AccountCenterProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

  await user.click(await screen.findByRole('button', { name: /shared@example.com/i }))
  expect(screen.getByRole('heading', { name: /^profile$/i })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { name: /^profile$/i })).toHaveLength(1)
})
```

Also extend the existing QR-code test in `App.test.tsx` with a desktop shared-account characterization assertion after authentication:

```tsx
it('keeps desktop account actions available through the shared account center', async () => {
  const user = userEvent.setup()
  mockAuthenticatedShellFetch('shared-account@example.com')
  seedAuthenticatedSession('shared-account@example.com')

  renderApp(['/dashboard'])

  await user.click(await screen.findByRole('button', { name: /shared-account@example.com/i }))
  expect(screen.getByRole('heading', { name: /^profile$/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /cancel/i }))
  const mobileDeviceButtons = screen.getAllByRole('button', { name: /use on mobile device/i })
  await user.click(mobileDeviceButtons[0])
  expect(screen.getByLabelText(/mobile entry qr code/i)).toBeInTheDocument()
})
```

Add these concrete helpers beside `renderApp` so the test does not duplicate response setup:

```tsx
function seedAuthenticatedSession(email: string) {
  window.localStorage.setItem(
    'xledger.auth',
    JSON.stringify({ accessToken: 'access.shell.token', refreshToken: 'refresh.shell.token', email }),
  )
}

function mockAuthenticatedShellFetch(email: string) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/api/auth/me')) {
      return new Response(JSON.stringify({ code: 'OK', message: 'Success', data: { email } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/api/stats/overview')) {
      return new Response(JSON.stringify({ code: 'OK', message: 'Success', data: { total_assets: 0, income: 0, expense: 0, net: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/api/stats/trend?')) {
      return new Response(JSON.stringify({ code: 'OK', message: 'Success', data: { points: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error(`Unexpected URL: ${url}`)
  }) as typeof fetch
}
```

- [ ] **Step 2: Run the focused test and record RED**

Run:

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/account-center.test.tsx src/App.test.tsx --maxWorkers=1 --no-file-parallelism
```

Expected: `account-center.test.tsx` FAILS with a module-not-found error for `account-center`; `App.test.tsx` passes and records the desktop behavior that must survive the refactor.

- [ ] **Step 3: Create the account context contract and move the existing dialog logic**

Create `account-center.tsx` with this public contract:

```tsx
export interface AccountCenterValue {
  displayName: string
  email: string
  currentLanguage: SupportedLanguage
  languagePending: boolean
  actionError: string | null
  openProfile: () => void
  openNotifications: () => void
  openHelp: () => void
  openMobileDevice: () => void
  selectLanguage: (language: string) => Promise<void>
  signOut: () => Promise<void>
}

const AccountCenterContext = createContext<AccountCenterValue | null>(null)

export function useAccountCenter() {
  const value = useContext(AccountCenterContext)
  if (!value) throw new Error('useAccountCenter must be used within AccountCenterProvider')
  return value
}
```

Move these existing TopBar members into `AccountCenterProvider` without changing their implementation: `displayName`, profile/notification/help/device open state, profile form fields, `pending`, `error`, `notice`, password validation, `handleSaveProfile`, `handleChangePassword`, and `openProfileDialog`. Move the four existing Dialog JSX blocks below `{children}` in the provider. Keep the existing `ApiError` mapping and translated success/error messages byte-for-byte.

Implement the two new provider actions with explicit error state:

```tsx
const selectLanguage = useCallback(async (language: string) => {
  setLanguagePending(true)
  setActionError(null)
  try {
    await changeLanguage(language)
  } catch (caughtError) {
    console.error('Failed to change language:', caughtError)
    setActionError(t('layout.accountCenter.languageChangeFailed'))
  } finally {
    setLanguagePending(false)
  }
}, [t])

const signOut = useCallback(async () => {
  setActionError(null)
  try {
    await logout()
  } catch (caughtError) {
    console.error('Failed to sign out:', caughtError)
    setActionError(t('layout.accountCenter.logoutFailed'))
  }
}, [logout, t])
```

The provider value must be memoized and include the exact interface fields above. `TopBar` keeps search, PWA install/update, and desktop buttons, but replaces direct account state with:

```tsx
const {
  currentLanguage,
  displayName,
  openHelp,
  openMobileDevice,
  openNotifications,
  openProfile,
  selectLanguage,
  signOut,
} = useAccountCenter()
```

Mount the provider exactly once in `AppShell`:

```tsx
return (
  <AccountCenterProvider>
    <div className="min-h-screen bg-[#f2f2f7] text-on-surface min-[1000px]:flex">
      <OfflineBanner />
      <SideNav />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="pb-mobile-nav mx-auto w-full max-w-[1680px] flex-1 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-4 min-[1000px]:p-5 xl:p-6">
          <FirstLoginOnboarding />
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  </AccountCenterProvider>
)
```

- [ ] **Step 4: Add the account error translations**

Add under `layout.accountCenter` in both locale files:

```json
"accountCenter": {
  "languageChangeFailed": "Failed to change language.",
  "logoutFailed": "Failed to log out."
}
```

```json
"accountCenter": {
  "languageChangeFailed": "切换语言失败。",
  "logoutFailed": "退出登录失败。"
}
```

- [ ] **Step 5: Run regression tests and TypeScript**

Run:

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/account-center.test.tsx src/App.test.tsx src/i18n-language-switch.test.tsx --maxWorkers=1 --no-file-parallelism
sudo docker run --rm -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/tsc -b
```

Expected: both test files PASS and `tsc -b` exits 0.

- [ ] **Step 6: Commit the extraction**

```bash
git add frontend/app/src/components/layout/account-center.tsx \
  frontend/app/src/components/layout/app-shell.tsx \
  frontend/app/src/components/layout/top-bar.tsx \
  frontend/app/src/account-center.test.tsx \
  frontend/app/src/App.test.tsx \
  frontend/app/src/locales/en/translation.json \
  frontend/app/src/locales/zh/translation.json
git diff --cached --check
git commit -m "refactor: share account center actions"
```

## Task 2: Add the five-tab mobile shell and independent Me page

**Files:**

- Create: `frontend/app/src/pages/me-page.tsx`
- Create: `frontend/app/src/mobile-account-center.test.tsx`
- Modify: `frontend/app/src/App.tsx`
- Modify: `frontend/app/src/components/layout/nav-items.ts`
- Modify: `frontend/app/src/components/layout/mobile-nav.tsx`
- Modify: `frontend/app/src/components/layout/top-bar.tsx`
- Modify: `frontend/app/src/mobile-ios-design.test.tsx`
- Modify: `frontend/app/src/locales/en/translation.json`
- Modify: `frontend/app/src/locales/zh/translation.json`

- [ ] **Step 1: Write failing navigation and Me-page tests**

Extend `mobile-ios-design.test.tsx`:

```tsx
const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
expect(within(nav).getAllByRole('link')).toHaveLength(5)
expect(within(nav).getByRole('link', { name: /me/i })).toBeInTheDocument()
expect(within(nav).queryByRole('link', { name: /import/i })).not.toBeInTheDocument()
expect(within(nav).queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
```

Create `mobile-account-center.test.tsx` with authenticated App rendering and assert the approved structure:

```tsx
it('renders the independent Me page with grouped account actions', async () => {
  renderAuthenticatedApp(['/me'])

  expect(await screen.findByRole('heading', { name: /^me$/i })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /english/i })).toBeChecked()
  expect(screen.getByRole('radio', { name: /中文/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /import data/i })).toHaveAttribute('href', '/import')
  expect(screen.getByRole('button', { name: /mobile device/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^notifications$/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^help$/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /^settings$/i })).toHaveAttribute('href', '/settings')
  expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
})
```

The test helper must wrap `App` in `QueryClientProvider`, `AuthProvider`, and `MemoryRouter`, seed `xledger.auth`, and mock `/api/auth/me` plus empty `/api/accounts`, `/api/ledgers`, and `/api/transactions` responses used by onboarding.

- [ ] **Step 2: Run RED tests**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/mobile-ios-design.test.tsx src/mobile-account-center.test.tsx --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because the mobile nav still has six links and `/me`/`MePage` do not exist.

- [ ] **Step 3: Implement the route and five-tab navigation**

Add `MePage` lazy loading and the protected `/me` route in `App.tsx` using the same `ProtectedLayout > AppShell` shape as `/settings`.

Replace `mobileNavItems` with:

```tsx
export const mobileNavItems: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', compactLabelKey: 'layout.mobileTabs.home', icon: Home },
  { to: '/transactions', labelKey: 'nav.transactions', compactLabelKey: 'layout.mobileTabs.entries', icon: Receipt },
  { to: '/analytics', labelKey: 'nav.analytics', compactLabelKey: 'layout.mobileTabs.reports', icon: PieChart },
  { to: '/accounts', labelKey: 'nav.accounts', compactLabelKey: 'layout.mobileTabs.accounts', icon: Wallet },
  { to: '/me', labelKey: 'layout.me.title', compactLabelKey: 'layout.mobileTabs.me', icon: CircleUserRound },
]
```

Remove unused `Upload` and mobile-only `Settings` imports, and change the tab grid to `grid-cols-5`.

- [ ] **Step 4: Implement `MePage` using the shared account center**

Use `SegmentedControl<SupportedLanguage>` for language selection and `useNavigate` for the import source state:

```tsx
const navigate = useNavigate()
const account = useAccountCenter()

<SegmentedControl
  ariaLabel={t('layout.me.language')}
  value={account.currentLanguage}
  options={supportedLanguageOptions.map(({ code, label }) => ({ value: code, label }))}
  onChange={(language) => void account.selectLanguage(language)}
/>
```

The page root must be `<section aria-labelledby="me-page-title" data-ui="ios-me-page">`. Build four visual groups with semantic buttons/links:

- Profile summary button calls `account.openProfile`.
- Import button calls `navigate('/import', { state: { from: '/me' } })`.
- Mobile device, notifications, and help buttons call the matching context actions.
- Settings uses `<Link to="/settings">`.
- Logout calls `account.signOut` and is the only red/destructive row.
- `account.actionError` renders as `role="alert"` without leaving `/me`.

- [ ] **Step 5: Hide the visible TopBar below 1000px**

Add `data-ui="desktop-top-bar"` and `max-[999px]:hidden` to the TopBar `<header>`. Remove the mobile-only install/profile/logout icon buttons because their actions now live on `/me`; retain desktop controls with `min-[1000px]` or `xl` classes. Do not remove the search, PWA install/update, desktop profile, language select, notifications, help, device, or logout behavior.

- [ ] **Step 6: Add translations**

Replace the obsolete mobile `import`/`settings` keys with `me`, and add `layout.me` keys for: title, profile, language, importData, mobileDevice, notifications, help, settings, logout, accountActions, supportActions, and destructiveActions. Use natural English and these Chinese labels: 我的、个人资料、语言、导入数据、移动设备、通知、帮助、设置、退出登录、账户操作、支持、危险操作.

- [ ] **Step 7: Run tests and TypeScript**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/mobile-ios-design.test.tsx src/mobile-account-center.test.tsx src/App.test.tsx --maxWorkers=1 --no-file-parallelism
sudo docker run --rm -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/tsc -b
```

Expected: all focused tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit the mobile shell**

```bash
git add frontend/app/src/App.tsx \
  frontend/app/src/components/layout/nav-items.ts \
  frontend/app/src/components/layout/mobile-nav.tsx \
  frontend/app/src/components/layout/top-bar.tsx \
  frontend/app/src/pages/me-page.tsx \
  frontend/app/src/mobile-account-center.test.tsx \
  frontend/app/src/mobile-ios-design.test.tsx \
  frontend/app/src/locales/en/translation.json \
  frontend/app/src/locales/zh/translation.json
git diff --cached --check
git commit -m "feat: add mobile me navigation"
```

## Task 3: Refine the mobile transaction hierarchy

**Files:**

- Modify: `frontend/app/src/pages/transactions-page.tsx`
- Modify: `frontend/app/src/transactions-domain.test.tsx`
- Modify: `frontend/app/src/locales/en/translation.json`
- Modify: `frontend/app/src/locales/zh/translation.json`

- [ ] **Step 1: Add failing mobile hierarchy tests**

Add a test that renders `/transactions`, waits for data, and asserts stable mobile semantics:

```tsx
it('exposes the compact mobile transaction hierarchy and action menu', async () => {
  const user = userEvent.setup()
  renderTransactionsApp(['/transactions'])

  const page = await screen.findByTestId('mobile-transaction-page')
  expect(page).toHaveAttribute('data-ui', 'ios-transactions-page')
  expect(within(page).getByRole('radiogroup', { name: /transaction view/i })).toBeInTheDocument()

  const smartViews = within(page).getByRole('region', { name: /smart views/i })
  expect(within(within(smartViews).getByTestId('mobile-smart-view-list')).getAllByRole('button')).toHaveLength(4)

  await user.click(within(page).getByRole('button', { name: /more transaction actions/i }))
  const actions = within(page).getByRole('menu', { name: /transaction actions/i })
  expect(within(actions).getByRole('menuitem', { name: /^import$/i })).toBeInTheDocument()
  expect(within(actions).getByRole('menuitem', { name: /^export$/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run RED**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/transactions-domain.test.tsx -t "compact mobile transaction hierarchy" --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because the new data/ARIA contracts and actions menu are absent.

- [ ] **Step 3: Implement one responsive header without duplicating primary actions**

Import `Ellipsis` and `Plus`, add `mobileActionsOpen` state, and give the outer section these responsive classes:

```tsx
<section
  data-testid="mobile-transaction-page"
  data-ui="ios-transactions-page"
  className="-mx-4 border-0 bg-transparent px-4 shadow-none min-[1000px]:mx-0 min-[1000px]:rounded-2xl min-[1000px]:border min-[1000px]:border-outline/15 min-[1000px]:bg-surface-container-lowest min-[1000px]:p-6 min-[1000px]:shadow-ambient"
>
```

Keep one Add Transaction button. On mobile it shows a Plus icon with an accessible label; on desktop it retains the text. Keep the existing desktop export summary/import controls behind `max-[999px]:hidden`.

Add a mobile ellipsis button with `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls="mobile-transaction-actions"`. When open, render:

```tsx
<div id="mobile-transaction-actions" role="menu" aria-label={t('transactionsPage.mobileActions.menuLabel')}>
  <button role="menuitem" type="button" onClick={() => navigate('/import', { state: { from: '/transactions' } })}>
    {t('transactionsPage.import')}
  </button>
  <button role="menuitem" type="button" disabled={exportTransactionsMutation.isPending} onClick={() => void handleExportTransactions()}>
    {exportTransactionsMutation.isPending ? t('transactionsPage.exporting') : t('transactionsPage.export')}
  </button>
</div>
```

Close the menu after import selection or after export resolves. Add an Escape listener only while open and return focus to the ellipsis button via `useRef<HTMLButtonElement>`.

Replace the ad-hoc List/Calendar buttons with the existing `SegmentedControl` and `ariaLabel={t('transactionsPage.viewLabel')}`.

- [ ] **Step 4: Convert smart views and chips responsively**

Give Smart Views a stable named region:

```tsx
<article role="region" aria-labelledby="transaction-smart-views-title" data-ui="ios-grouped-list">
  <h3 id="transaction-smart-views-title">{t('transactionsPage.smartViews.title')}</h3>
</article>
```

Render the four `reviewReasonFilters` as actual buttons in one DOM set. Style them as full-width rows with count + chevron below 1000px and as compact summary pills on desktop. Each button sets `quickFilter` to `review` and sets its matching `reviewReasonFilter`; the `all` row selects all review items.

Wrap exactly those four buttons in `<div data-testid="mobile-smart-view-list">` so tests do not count quick-filter or advanced-filter buttons.

Change the quick filter wrapper to `flex-nowrap overflow-x-auto` below 1000px and keep each chip `shrink-0`. Preserve the existing advanced-filter disclosure and every filter/query state. Remove the mobile nested-card effect by changing the Smart Views wrapper to transparent/no-border on mobile and restoring the current card classes at `min-[1000px]`.

- [ ] **Step 5: Add translations and update affected existing tests**

Add `transactionsPage.viewLabel`, `transactionsPage.mobileActions.menuLabel`, and `transactionsPage.mobileActions.more`. Update any existing Import test that becomes ambiguous by scoping the old desktop import button to the desktop action group test id; do not weaken assertions or delete import behavior coverage.

- [ ] **Step 6: Run the transaction suite**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/transactions-domain.test.tsx src/transactions-import-behavior.test.tsx --maxWorkers=1 --no-file-parallelism
sudo docker run --rm -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/tsc -b
```

Expected: all transaction/import tests PASS; no API call assertions change.

- [ ] **Step 7: Commit the transaction layout**

```bash
git add frontend/app/src/pages/transactions-page.tsx \
  frontend/app/src/transactions-domain.test.tsx \
  frontend/app/src/locales/en/translation.json \
  frontend/app/src/locales/zh/translation.json
git diff --cached --check
git commit -m "feat: refine mobile transaction hierarchy"
```

## Task 4: Compact the standalone import flow

**Files:**

- Create: `frontend/app/src/import-page-layout.test.tsx`
- Modify: `frontend/app/src/pages/import-page.tsx`
- Modify: `frontend/app/src/locales/en/translation.json`
- Modify: `frontend/app/src/locales/zh/translation.json`

- [ ] **Step 1: Write failing static and error-state tests**

Mock the management API and render `ImportPage` under QueryClient + MemoryRouter:

```tsx
vi.mock('@/features/management/management-api', () => ({
  importCSVPreview: vi.fn(),
  importCSVConfirm: vi.fn(),
}))

it('renders a compact three-step import surface with guidance', () => {
  renderImportPage(['/import'])

  expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  const progress = screen.getByRole('list', { name: /import progress/i })
  expect(progress).toHaveAttribute('data-ui', 'ios-import-stepper')
  expect(within(progress).getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByTestId('compact-import-dropzone')).toHaveAttribute('data-ui', 'ios-compact-upload')
  expect(screen.getByRole('region', { name: /import guidance/i })).toBeInTheDocument()
})

it('keeps the selected file visible when preview fails', async () => {
  vi.mocked(importCSVPreview).mockRejectedValueOnce(new Error('Preview failed'))
  const user = userEvent.setup()
  renderImportPage(['/import'])

  const input = screen.getByLabelText(/csv file/i)
  await user.upload(input, new File(['date,amount\n2026-01-01,10'], 'failed.csv', { type: 'text/csv' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Preview failed')
  expect(screen.getByText('failed.csv')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run RED**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/import-page-layout.test.tsx --maxWorkers=1 --no-file-parallelism
```

Expected: FAIL because the stepper, compact upload data attributes, guidance region, back button, and selected-file error retention are absent.

- [ ] **Step 3: Implement source-aware return and the stepper**

Read navigation state safely and use `/me` as fallback:

```tsx
type ImportLocationState = { from?: '/me' | '/transactions' }
const location = useLocation()
const navigate = useNavigate()
const from = (location.state as ImportLocationState | null)?.from
const handleBack = () => navigate(from === '/transactions' ? '/transactions' : '/me')
```

Add a button labeled by `import.back`, a 32px mobile title, and an ordered list with the three step names. Map `upload`, `mapping`, and `result` to a zero-based active index and set `aria-current="step"` only on the active list item.

- [ ] **Step 4: Implement the compact upload and guidance**

Keep the existing hidden file input and drag/drop handlers. Change the upload surface to `min-h-[190px] max-h-[220px]` on mobile, include a visible `Button`-styled browse action, and add `data-testid="compact-import-dropzone" data-ui="ios-compact-upload"`.

After file selection, always render the selected file name above pending/error state. Put preview errors in `role="alert"`; do not reset `file`, `preview`, or `mapping` on error.

Below the upload surface add `<section aria-labelledby="import-guidance-title">` with grouped rows for CSV, UTF-8, and privacy. Keep mapping table, field selects, confirmation mutation, result counts, and API calls unchanged. Restyle only their mobile containers to remove large empty vertical padding.

- [ ] **Step 5: Add exact translation keys**

Add under `import`: back, progressLabel, stepUpload, stepMapping, stepResult, browse, selectedFile, guidanceTitle, csvTitle, csvDescription, encodingTitle, encodingDescription, privacyTitle, privacyDescription, and csvFileLabel in English and Chinese.

- [ ] **Step 6: Run import and management regression tests**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run src/import-page-layout.test.tsx src/accounting-settings.test.tsx --maxWorkers=1 --no-file-parallelism
sudo docker run --rm -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/tsc -b
```

Expected: both test files PASS and TypeScript exits 0.

- [ ] **Step 7: Commit the import layout**

```bash
git add frontend/app/src/pages/import-page.tsx \
  frontend/app/src/import-page-layout.test.tsx \
  frontend/app/src/locales/en/translation.json \
  frontend/app/src/locales/zh/translation.json
git diff --cached --check
git commit -m "feat: compact mobile import flow"
```

## Task 5: Add mobile E2E, visual, and accessibility coverage

**Files:**

- Modify: `e2e-tests/e2e/helpers/quality.ts`
- Modify: `e2e-tests/e2e/quality.visual.spec.ts`
- Modify: `e2e-tests/e2e/quality.a11y.spec.ts`
- Modify: `e2e-tests/e2e/profile.spec.ts`
- Modify: `e2e-tests/e2e/quality.visual.spec.ts-snapshots/*.png`

- [ ] **Step 1: Extend route coverage and write failing interaction checks**

Add to `appRoutes`:

```ts
{ path: '/me', heading: 'Me', snapshotKey: 'me' },
{ path: '/import', heading: 'Import Data', snapshotKey: 'import' },
```

Add a mobile profile test using the existing authenticated session:

```ts
test('mobile Me page opens the shared profile dialog', async ({ page }, testInfo) => {
  await bootstrapAuthedSession(page, testInfo)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/me', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /profile/i }).click()
  await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible()
  await expect(page.getByLabel('Display Name')).toBeVisible()
})
```

- [ ] **Step 2: Add explicit 999px/1000px and 320px visual scenarios**

At 999px assert `desktop-top-bar` is hidden and the Mobile navigation is visible. At 1000px assert the reverse. At 320px capture `/me`, `/transactions`, and `/import` using a helper that waits for each route heading and takes a named screenshot.

Change the Chinese mobile test to switch language from `/me` instead of the now-hidden TopBar select:

```ts
await page.goto('/me', { waitUntil: 'networkidle' })
await page.getByRole('radio', { name: '中文' }).check()
await expect(page.getByRole('heading', { name: '我的' })).toBeVisible()
await page.goto('/dashboard', { waitUntil: 'networkidle' })
await captureDashboard(page, 'visual-mobile-zh-dashboard.png', false)
```

Retain iPhone portrait and landscape scenarios and add Me/Transactions/Import captures to both browser projects.

- [ ] **Step 3: Audit open interactive states with axe**

After the existing route loop, add mobile-only checks that open the transaction actions menu and Me profile dialog, then run the same serious/critical filter. Record scenario names `mobile /transactions actions-open` and `mobile /me profile-open` in `seriousSummary`.

- [ ] **Step 4: Start an isolated frontend preview against the existing backend**

```bash
sudo docker run --rm -d --name xledger-mobile-preview --network host \
  -e VITE_API_PROXY_TARGET=http://127.0.0.1:8080 \
  -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vite --host 127.0.0.1 --port 4173
curl --fail --silent --show-error http://127.0.0.1:4173/ >/dev/null
```

Expected: container starts and the preview URL returns HTTP 200. This reuses the running backend and does not create a PostgreSQL container.

- [ ] **Step 5: Update and verify Chromium/WebKit baselines**

```bash
sudo docker run --rm --network host \
  -e E2E_BASE_URL=http://127.0.0.1:4173 \
  -v /opt/docker/xledger/e2e-tests:/app -w /app \
  mcr.microsoft.com/playwright:v1.58.2-noble \
  ./node_modules/.bin/playwright test e2e/quality.visual.spec.ts --update-snapshots

sudo docker run --rm --network host \
  -e E2E_BASE_URL=http://127.0.0.1:4173 \
  -v /opt/docker/xledger/e2e-tests:/app -w /app \
  mcr.microsoft.com/playwright:v1.58.2-noble \
  ./node_modules/.bin/playwright test e2e/quality.visual.spec.ts e2e/quality.a11y.spec.ts e2e/profile.spec.ts
```

Expected: Chromium and WebKit visual comparisons PASS, axe reports no serious/critical violations, and both desktop/mobile profile flows PASS.

- [ ] **Step 6: Stop the preview and commit quality coverage**

```bash
sudo docker stop xledger-mobile-preview
git add e2e-tests/e2e/helpers/quality.ts \
  e2e-tests/e2e/quality.visual.spec.ts \
  e2e-tests/e2e/quality.a11y.spec.ts \
  e2e-tests/e2e/profile.spec.ts \
  e2e-tests/e2e/quality.visual.spec.ts-snapshots
git diff --cached --check
git commit -m "test: cover mobile navigation quality"
```

## Task 6: Full verification, publish main, and deploy

**Files:**

- Verify all changed frontend and E2E files.
- Do not modify PostgreSQL or Compose topology.

- [ ] **Step 1: Run the complete frontend suite**

```bash
sudo docker run --rm -e CI=true -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/vitest run --maxWorkers=1 --no-file-parallelism
sudo docker run --rm -v /opt/docker/xledger/frontend/app:/app -w /app node:24-alpine \
  ./node_modules/.bin/tsc -b
sudo docker run --rm -v /opt/docker/xledger/e2e-tests:/app -w /app node:24-alpine \
  ./node_modules/.bin/tsc --noEmit
```

Expected: all Vitest files PASS and both TypeScript commands exit 0.

- [ ] **Step 2: Inspect the final patch and repository state**

```bash
git diff --check
git status --short --branch
git log --oneline --decorate -8
```

Expected: no whitespace errors, no uncommitted files, and `main` is ahead of `origin/main` only by the intentional spec, plan, implementation, and quality commits.

- [ ] **Step 3: Push the approved main branch**

```bash
git push origin main
```

Expected: push succeeds with no force and `git rev-parse HEAD` equals `git rev-parse origin/main`.

- [ ] **Step 4: Rebuild the existing services only**

```bash
sudo docker compose -f deploy/docker-compose.dev.yaml up -d --build
sudo docker compose -f deploy/docker-compose.dev.yaml ps
```

Expected: existing `redis`, `xledger-backend`, and `xledger-frontend` services become healthy. No PostgreSQL service is created.

- [ ] **Step 5: Verify local and public health**

```bash
curl --fail --silent --show-error http://127.0.0.1:8080/healthz
curl --fail --silent --show-error http://127.0.0.1:4174/ >/dev/null
curl --fail --silent --show-error https://xledger.xanne.cloud/ >/dev/null
sudo docker compose -f deploy/docker-compose.dev.yaml ps
git status --short --branch
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
```

Expected: all curls exit 0, all three services are healthy, HEAD equals origin/main, and the worktree is clean.

- [ ] **Step 6: Perform a final mobile smoke check**

Against `https://xledger.xanne.cloud`, verify at 390×844 in Chromium and WebKit: five tabs, no visible TopBar, Me language/profile actions, transaction ellipsis actions, import three-step header, and no serious axe violations. Record the tested commit SHA in the handoff response.
