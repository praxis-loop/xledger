import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './features/auth/auth-context'

const originalFetch = global.fetch
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

interface MockCategory {
  id: string
  name: string
  archived_at?: string
}

function renderManagementApp(initialEntries: string[]) {
  window.localStorage.setItem(
    'xledger.auth',
    JSON.stringify({
      accessToken: 'access.demo.token',
      refreshToken: 'refresh.demo.token',
      email: 'demo@example.com',
    }),
  )

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
          initialEntries={initialEntries}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

type MockAccount = { id: string; name: string; type: string; initial_balance: number; current_balance?: number; archived_at?: string }

function createManagementFetchMock(
  initialCategories: MockCategory[] = [{ id: 'cat-1', name: 'Food' }],
  options: { accounts?: MockAccount[]; failAccounts?: boolean } = {},
) {
  let categories = [...initialCategories]
  let tags = [{ id: 'tag-1', name: 'Dining' }]
  const accounts = options.accounts ?? [{ id: 'acc-1', name: 'Cash Wallet', type: 'cash', initial_balance: 1000, current_balance: 875 }]

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url.endsWith('/api/auth/me')) {
      return new Response(
        JSON.stringify({ code: 'OK', message: '成功', data: { email: 'demo@example.com' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/accounts') && (!init?.method || init.method === 'GET')) {
      if (options.failAccounts) {
        return new Response(
          JSON.stringify({ code: 'INTERNAL_ERROR', message: '服务内部错误', data: null }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: {
            items: accounts,
            pagination: { page: 1, page_size: accounts.length, total: accounts.length, total_pages: 1 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/accounts') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: { id: 'acc-2', name: 'Savings Vault', type: 'debit', initial_balance: 2000 },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/ledgers')) {
      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: {
            items: [{ id: 'ledger-1', name: 'Default Ledger', is_default: true }],
            pagination: { page: 1, page_size: 1, total: 1, total_pages: 1 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/categories') && init?.method === 'POST') {
      const body = typeof init.body === 'string' ? JSON.parse(init.body) as { name?: string } : {}
      const category = { id: `cat-${categories.length + 1}`, name: body.name ?? 'New Category' }
      categories = [...categories, category]

      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: category,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/categories/cat-1') && init?.method === 'PATCH') {
      const body = typeof init.body === 'string' ? JSON.parse(init.body) as { name?: string; archived?: boolean } : {}
      categories = categories.map((category) => {
        if (category.id !== 'cat-1') return category
        const next = { ...category, name: body.name ?? category.name }
        if (body.archived === false) delete next.archived_at
        return next
      })
      const category = categories.find((item) => item.id === 'cat-1') ?? { id: 'cat-1', name: 'Dining Out' }

      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: category,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/categories/cat-1') && init?.method === 'DELETE') {
      const category = categories.find((item) => item.id === 'cat-1') ?? { id: 'cat-1', name: 'Dining Out' }
      const archivedCategory = { ...category, archived_at: '2026-05-13T00:00:00Z' }
      categories = categories.map((item) => (item.id === 'cat-1' ? archivedCategory : item))

      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: { deleted: true, archived: true, category: archivedCategory },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/categories')) {
      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: {
            items: categories,
            pagination: { page: 1, page_size: categories.length, total: categories.length, total_pages: 1 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/tags') && init?.method === 'POST') {
      const body = typeof init.body === 'string' ? JSON.parse(init.body) as { name?: string } : {}
      const tag = { id: `tag-${tags.length + 1}`, name: body.name ?? 'New tag' }
      tags = [...tags, tag]
      return new Response(
        JSON.stringify({ code: 'OK', message: '成功', data: tag }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/tags')) {
      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: {
            items: tags,
            pagination: { page: 1, page_size: tags.length, total: tags.length, total_pages: 1 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/personal-access-tokens') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({ code: 'OK', message: '成功', data: { token: 'pat.secret.value', id: 'pat-2', expires_at: '2027-01-01T00:00:00Z' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/personal-access-tokens')) {
      return new Response(
        JSON.stringify({
          code: 'OK',
          message: '成功',
          data: {
            items: [{ id: 'pat-1', name: 'default', expires_at: '2026-12-31T00:00:00Z' }],
            pagination: { page: 1, page_size: 1, total: 1, total_pages: 1 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.endsWith('/api/personal-access-tokens/pat-1') && init?.method === 'DELETE') {
      return new Response(
        JSON.stringify({ code: 'OK', message: '成功', data: { revoked: true } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.includes('/api/export?')) {
      return new Response('date,amount\n2026-03-01,25.00', {
        status: 200,
        headers: { 'Content-Type': 'text/csv' },
      })
    }

    throw new Error(`Unexpected URL: ${url}`)
  })
}

describe('accounting settings domain', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    window.localStorage.clear()
  })

  it('renders accounts and creates a new account from the management page', async () => {
    const fetchMock = createManagementFetchMock()
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/accounts'])
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Cash Wallet')).toBeInTheDocument()
      expect(screen.getAllByText('¥875.00').length).toBeGreaterThan(0)
      expect(screen.getByText(/Opening ¥1,000\.00/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /cash wallet/i })).toHaveAttribute('href', '/transactions?account=acc-1')

    await user.click(screen.getByRole('button', { name: /new account/i }))
    await user.type(screen.getByLabelText(/account name/i), 'Savings Vault')
    await user.selectOptions(screen.getByLabelText(/account type/i), 'debit')
    await user.type(screen.getByLabelText(/initial balance/i), '2000')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/accounts',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Savings Vault', type: 'debit', initial_balance: 2000 }) }),
      )
    })
  })

  it('blocks an unnamed account and stores a credit card balance as a liability', async () => {
    const fetchMock = createManagementFetchMock()
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/accounts'])
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Cash Wallet')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new account/i }))
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Enter an account name.')).toBeInTheDocument()
    expect(screen.getByLabelText(/account name/i)).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/accounts', expect.objectContaining({ method: 'POST' }))

    await user.type(screen.getByLabelText(/account name/i), 'Travel card')
    await user.selectOptions(screen.getByLabelText(/account type/i), 'credit')
    await user.type(screen.getByLabelText(/amount owed/i), '1280.50')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/accounts',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Travel card', type: 'credit', initial_balance: -1280.5 }) }),
      )
    })
  })

  it('separates archived accounts and leaves them out of total assets', async () => {
    const fetchMock = createManagementFetchMock(undefined, {
      accounts: [
        { id: 'acc-1', name: 'Cash Wallet', type: 'cash', initial_balance: 1000, current_balance: 1000 },
        { id: 'acc-2', name: 'Travel card', type: 'credit', initial_balance: -200, current_balance: -200 },
        { id: 'acc-3', name: 'Old savings', type: 'debit', initial_balance: 500, current_balance: 500, archived_at: '2026-05-01T00:00:00Z' },
      ],
    })
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/accounts'])

    await waitFor(() => {
      expect(screen.getByText('Accounts (2)')).toBeInTheDocument()
    })
    const totalCard = screen.getByRole('region', { name: /total assets/i })
    expect(totalCard).toHaveTextContent('¥800.00')
    expect(totalCard).toHaveTextContent('¥1,000.00')
    expect(totalCard).toHaveTextContent('¥200.00')
    expect(screen.getByText('Archived (1)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restore account old savings/i })).toBeInTheDocument()
    expect(screen.getByText(/Credit card · Owed/)).toBeInTheDocument()
  })

  it('shows a retryable error instead of an empty state when accounts fail to load', async () => {
    const fetchMock = createManagementFetchMock(undefined, { failAccounts: true })
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/accounts'])

    await waitFor(() => {
      expect(screen.getByText("Accounts didn't load")).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.queryByText('No accounts yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /total assets/i })).not.toBeInTheDocument()
  })

  it('lets users create, rename, remove, and restore categories from settings', async () => {
    const fetchMock = createManagementFetchMock()
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/settings'])
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new category/i }))
    await user.type(screen.getByLabelText(/category name/i), 'Subscriptions')
    await user.click(screen.getByRole('button', { name: /save category/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/categories',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await user.click(screen.getByRole('button', { name: /rename category food/i }))
    await user.clear(screen.getByLabelText(/category name/i))
    await user.type(screen.getByLabelText(/category name/i), 'Dining Out')
    await user.click(screen.getByRole('button', { name: /save category/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/categories/cat-1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    await user.click(screen.getByRole('button', { name: /remove category dining out/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/categories/cat-1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
    await waitFor(() => {
      expect(screen.queryByText('Dining Out')).not.toBeInTheDocument()
    })
    expect(screen.getByText('"Dining Out" has transactions, so it was archived.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^undo$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/categories/cat-1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ archived: false }) }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Dining Out')).toBeInTheDocument()
    })
  })

  it('hides archived categories returned by the management API', async () => {
    const fetchMock = createManagementFetchMock([
      { id: 'cat-1', name: 'Food' },
      { id: 'cat-archived', name: 'Old Category', archived_at: '2026-05-13T00:00:00Z' },
    ])
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/settings'])

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument()
    })
    expect(screen.queryByText('Old Category')).not.toBeInTheDocument()
  })

  it('keeps newly created categories visible when the preview list is full', async () => {
    const fetchMock = createManagementFetchMock([
      { id: 'cat-1', name: 'Lunch' },
      { id: 'cat-2', name: 'Dinner' },
      { id: 'cat-3', name: 'Breakfast' },
      { id: 'cat-4', name: 'Coffee' },
      { id: 'cat-5', name: 'Groceries' },
      { id: 'cat-6', name: 'Transport' },
      { id: 'cat-7', name: 'Rent' },
      { id: 'cat-8', name: 'Utilities' },
      { id: 'cat-9', name: 'Salary' },
    ])
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/settings'])
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Lunch')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new category/i }))
    await user.type(screen.getByLabelText(/category name/i), 'Subscriptions')
    await user.click(screen.getByRole('button', { name: /save category/i }))

    await waitFor(() => {
      expect(screen.getByText('Subscriptions')).toBeInTheDocument()
    })
  })

  it('creates and revokes PATs and triggers CSV export from settings', async () => {
    const fetchMock = createManagementFetchMock()
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/settings'])
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('pat-1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /create pat/i }))

    await waitFor(() => {
      expect(screen.getByText(/pat.secret.value/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /revoke pat-1/i }))
    expect(fetchMock).not.toHaveBeenCalledWith('/api/personal-access-tokens/pat-1', expect.objectContaining({ method: 'DELETE' }))
    await user.click(screen.getByRole('button', { name: /^revoke pat$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/personal-access-tokens/pat-1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    await user.click(screen.getByRole('button', { name: /export csv/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/export\?/),
        expect.any(Object),
      )
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })

  it('manages ledgers and tags from settings', async () => {
    const fetchMock = createManagementFetchMock()
    global.fetch = fetchMock as typeof fetch

    renderManagementApp(['/settings'])
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Default Ledger')).toBeInTheDocument()
      expect(screen.getByText('Dining')).toBeInTheDocument()
    })
    expect(screen.getByText("Default ledger, can't be deleted")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete ledger default ledger/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /new tag/i }))
    await user.type(screen.getByLabelText(/tag name/i), 'Reimbursable')
    await user.click(screen.getByRole('button', { name: /save tag/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tags',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Reimbursable' }) }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText('Reimbursable')).toBeInTheDocument()
    })
  })
})
