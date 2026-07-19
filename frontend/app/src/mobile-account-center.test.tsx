import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './features/auth/auth-context'
import i18n from './i18n'

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
})
