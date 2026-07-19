import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AccountCenterProvider, useAccountCenter } from './components/layout/account-center'
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
})
