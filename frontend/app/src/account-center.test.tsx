import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AccountCenterProvider, useAccountCenter } from './components/layout/account-center'
import { TopBar } from './components/layout/top-bar'
import i18n from './i18n'
import { AuthProvider } from './features/auth/auth-context'

const originalFetch = global.fetch

function AccountProbe() {
  const { openProfile } = useAccountCenter()

  return <button onClick={openProfile}>Open account</button>
}

describe('AccountCenterProvider', () => {
  afterEach(() => {
    global.fetch = originalFetch
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('opens exactly one shared profile dialog', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/auth/me')) {
        return new Response(
          JSON.stringify({ code: 'OK', message: 'Success', data: { email: 'shared@example.com' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      throw new Error(`Unexpected URL: ${String(input)}`)
    }) as typeof fetch

    window.localStorage.setItem(
      'xledger.auth',
      JSON.stringify({
        accessToken: 'access.shared.token',
        refreshToken: 'refresh.shared.token',
        email: 'shared@example.com',
      }),
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          >
            <AccountCenterProvider>
              <AccountProbe />
            </AccountCenterProvider>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Open account' }))


    expect(screen.getAllByRole('heading', { name: /profile/i })).toHaveLength(1)
  })
  it('disables language selection while pending and reports a translated failure', async () => {
    const user = userEvent.setup()
    await i18n.changeLanguage('en')

    let rejectLanguage: (reason?: unknown) => void = () => undefined
    const languageChange = new Promise<Awaited<ReturnType<typeof i18n.changeLanguage>>>((_, reject) => {
      rejectLanguage = reject
    })
    const languageChangeSpy = vi.spyOn(i18n, 'changeLanguage').mockReturnValue(languageChange)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/auth/me')) {
        return new Response(
          JSON.stringify({ code: 'OK', message: 'Success', data: { email: 'shared@example.com' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      throw new Error(`Unexpected URL: ${String(input)}`)
    }) as typeof fetch

    window.localStorage.setItem(
      'xledger.auth',
      JSON.stringify({
        accessToken: 'access.shared.token',
        refreshToken: 'refresh.shared.token',
        email: 'shared@example.com',
      }),
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          >
            <AccountCenterProvider>
              <TopBar />
            </AccountCenterProvider>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )

    const languageSelector = screen.getByRole('combobox', { name: /select language/i })
    await user.selectOptions(languageSelector, 'zh')

    expect(languageChangeSpy).toHaveBeenCalledWith('zh')
    expect(languageSelector).toBeDisabled()

    rejectLanguage(new Error('language service unavailable'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to change language.')
    await waitFor(() => {
      expect(languageSelector).not.toBeDisabled()
    })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
