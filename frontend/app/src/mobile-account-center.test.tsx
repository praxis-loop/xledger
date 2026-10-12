import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import App from './App'
import { AccountCenterProvider } from './components/layout/account-center'
import { AuthProvider } from './features/auth/auth-context'
import { RequireAuth } from './features/auth/require-auth'
import i18n from './i18n'
import { MePage } from './pages/me-page'

const originalFetch = global.fetch

function renderAuthenticatedApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter
          initialEntries={['/me']}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

function LocationProbe({ title }: { title: string }) {
  const location = useLocation()

  return (
    <>
      <h1>{title}</h1>
      <output data-testid="location-state">{JSON.stringify(location.state)}</output>
    </>
  )
}

function renderFocusedMe() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter
          initialEntries={['/me']}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <Routes>
            <Route
              path="/me"
              element={
                <RequireAuth>
                  <AccountCenterProvider>
                    <MePage />
                  </AccountCenterProvider>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<h1>Login destination</h1>} />
            <Route path="/import" element={<LocationProbe title="Import destination" />} />
            <Route path="/settings" element={<h1>Settings destination</h1>} />
            <Route path="/transactions" element={<h1>Transactions destination</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('mobile account center', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    window.localStorage.setItem(
      'xledger.auth',
      JSON.stringify({
        accessToken: 'access.mobile-me.token',
        refreshToken: 'refresh.mobile-me.token',
        email: 'mobile@example.com',
      }),
    )

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/auth/me')) {
        return new Response(
          JSON.stringify({
            code: 'OK',
            message: 'Success',
            data: { email: 'mobile@example.com', name: 'Mobile User' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.endsWith('/api/auth/logout')) {
        return new Response(
          JSON.stringify({ logged_out: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.endsWith('/api/accounts') || url.endsWith('/api/ledgers')) {
        return new Response(
          JSON.stringify({
            code: 'OK',
            message: 'Success',
            data: { items: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 } },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.includes('/api/transactions?')) {
        return new Response(
          JSON.stringify({
            code: 'OK',
            message: 'Success',
            data: { items: [], pagination: { page: 1, page_size: 1, total: 0, total_pages: 0 } },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.endsWith('/api/stats/overview')) {
        return new Response(
          JSON.stringify({
            code: 'OK',
            message: 'Success',
            data: { total_assets: 0, income: 0, expense: 0, net: 0 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.includes('/api/stats/trend?')) {
        return new Response(
          JSON.stringify({ code: 'OK', message: 'Success', data: { points: [] } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      throw new Error('Unexpected URL: ' + url)
    }) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders independent grouped mobile account actions', async () => {
    renderAuthenticatedApp()

    const page = await screen.findByRole('region', { name: /^me$/i })
    expect(page).toHaveAttribute('data-ui', 'ios-me-page')
    expect(within(page).getByRole('heading', { name: /^me$/i })).toBeInTheDocument()
    expect(within(page).getByRole('radio', { name: 'English' })).toBeChecked()
    expect(within(page).getByRole('radio', { name: '\u4e2d\u6587' })).toBeInTheDocument()
    expect(within(page).getByRole('button', { name: /profile/i })).toBeInTheDocument()

    const accountActions = within(page).getByRole('region', { name: /account actions/i })
    expect(within(accountActions).getByRole('button', { name: /import data/i })).toBeInTheDocument()
    expect(within(accountActions).getByRole('button', { name: /mobile device/i })).toBeInTheDocument()
    expect(within(page).getByRole('region', { name: /support/i })).toBeInTheDocument()
    expect(within(page).getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    expect(within(page).getByRole('button', { name: /help/i })).toBeInTheDocument()
    expect(within(page).getByRole('link', { name: /settings/i })).toBeInTheDocument()
    expect(within(page).getByRole('button', { name: /logout/i })).toBeInTheDocument()
    expect(within(page).getByRole('region', { name: /destructive actions/i })).toBeInTheDocument()
  })

  it('opens the shared Profile dialog from the personal summary', async () => {
    const user = userEvent.setup()
    renderAuthenticatedApp()

    const page = await screen.findByRole('region', { name: /^me$/i })
    await user.click(within(page).getByRole('button', { name: /profile/i }))

    expect(screen.getAllByRole('heading', { name: /^profile$/i })).toHaveLength(1)
    expect(screen.getByLabelText(/^email$/i)).toBeDisabled()
  })

  it('protects /me from unauthenticated access', async () => {
    window.localStorage.clear()

    renderAuthenticatedApp()

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /^me$/i })).not.toBeInTheDocument()
  })

  it('navigates Import Data with the Me source location state', async () => {
    const user = userEvent.setup()
    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const accountActions = within(page).getByRole('region', { name: /account actions/i })
    await user.click(within(accountActions).getByRole('button', { name: /import data/i }))

    expect(screen.getByRole('heading', { name: /import destination/i })).toBeInTheDocument()
    expect(JSON.parse(screen.getByTestId('location-state').textContent ?? 'null')).toEqual({
      from: '/me',
    })
  })

  it('disables language selection while pending and reports failures on Me', async () => {
    const user = userEvent.setup()
    let rejectLanguage: (reason?: unknown) => void = () => undefined
    const languageChange = new Promise<Awaited<ReturnType<typeof i18n.changeLanguage>>>(
      (_, reject) => {
        rejectLanguage = reject
      },
    )
    const languageChangeSpy = vi.spyOn(i18n, 'changeLanguage').mockReturnValue(languageChange)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const language = within(page).getByRole('radiogroup', { name: /language/i })
    await user.click(within(language).getByRole('radio', { name: '\u4e2d\u6587' }))

    expect(languageChangeSpy).toHaveBeenCalledWith('zh')
    expect(language).toHaveAttribute('aria-busy', 'true')
    for (const option of within(language).getAllByRole('radio')) {
      expect(option).toBeDisabled()
    }

    rejectLanguage(new Error('language service unavailable'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to change language.')
    await waitFor(() => {
      expect(within(language).getByRole('radio', { name: 'English' })).not.toBeDisabled()
    })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('opens and closes the shared Mobile Device QR dialog', async () => {
    const user = userEvent.setup()
    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const accountActions = within(page).getByRole('region', { name: /account actions/i })
    await user.click(within(accountActions).getByRole('button', { name: /mobile device/i }))

    expect(screen.getByRole('heading', { name: /use on mobile device/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/mobile entry qr code/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^close$/i }))

    expect(screen.queryByRole('heading', { name: /use on mobile device/i })).not.toBeInTheDocument()
  })

  it('opens and closes the shared Notifications dialog', async () => {
    const user = userEvent.setup()
    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const support = within(page).getByRole('region', { name: /support/i })
    await user.click(within(support).getByRole('button', { name: /notifications/i }))

    expect(screen.getByRole('heading', { name: /^notifications$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^close$/i }))

    expect(screen.queryByRole('heading', { name: /^notifications$/i })).not.toBeInTheDocument()
  })

  it('opens Help and follows its shared Transactions action', async () => {
    const user = userEvent.setup()
    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const support = within(page).getByRole('region', { name: /support/i })
    await user.click(within(support).getByRole('button', { name: /^help$/i }))

    expect(screen.getByRole('heading', { name: /quick help/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /go to transactions/i }))

    expect(screen.getByRole('heading', { name: /transactions destination/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /quick help/i })).not.toBeInTheDocument()
  })

  it('exposes Settings as an internal /settings navigation', async () => {
    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const support = within(page).getByRole('region', { name: /support/i })

    expect(within(support).getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
  })

  it('logs out through the shared account center and leaves protected Me', async () => {
    const user = userEvent.setup()
    renderFocusedMe()

    const page = await screen.findByRole('region', { name: /^me$/i })
    const destructiveActions = within(page).getByRole('region', {
      name: /destructive actions/i,
    })
    await user.click(within(destructiveActions).getByRole('button', { name: /logout/i }))

    expect(await screen.findByRole('heading', { name: /login destination/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('xledger.auth')).toBeNull()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/logout$/),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
