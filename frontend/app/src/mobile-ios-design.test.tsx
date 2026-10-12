import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DashboardMetricCard } from '@/components/ui/dashboard-metric-card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MobileNav } from '@/components/layout/mobile-nav'
import '@/i18n'

describe('mobile iOS design primitives', () => {
  it('keeps the transaction mobile layout active through 999px', () => {
    const source = readFileSync(resolve(__dirname, 'pages/transactions-page.tsx'), 'utf8')

    expect(source).toContain("matchMedia('(max-width: 999px)')")
    expect(source).not.toContain("matchMedia('(max-width: 767px)')")
    expect(source).toMatch(
      /data-testid="desktop-transaction-table"[\s\S]{0,180}className="hidden[^"]*min-\[1000px\]:block"/,
    )
    expect(source).toMatch(
      /data-testid="mobile-transaction-cards"[\s\S]{0,120}className="divide-y[^"]*min-\[1000px\]:hidden"/,
    )
  })

  it('keeps quick filters horizontally scrollable without exposing a scrollbar', () => {
    const source = readFileSync(resolve(__dirname, 'pages/transactions-page.tsx'), 'utf8')

    expect(source).toMatch(
      /overflow-x-auto[^\"]*\[scrollbar-width:none\][^\"]*\[&::-webkit-scrollbar\]:hidden/,
    )
  })

  it('owns the mobile transaction gutter without creating a parent scroll range', () => {
    const source = readFileSync(resolve(__dirname, 'pages/transactions-page.tsx'), 'utf8')

    expect(source).toContain(
      'className="-mx-4 w-[calc(100%+2rem)] space-y-5 px-4 min-[1000px]:mx-0 min-[1000px]:w-auto min-[1000px]:px-0"',
    )
    expect(source).not.toMatch(/data-testid="mobile-transaction-page"[\s\S]{0,180}className="-mx-4/)
  })

  it('exposes segmented options as a controlled radio group', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SegmentedControl
        ariaLabel="Reporting period"
        value="month"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'month', label: 'Month' },
        ]}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('radiogroup', { name: /reporting period/i })).toHaveAttribute(
      'data-ui',
      'ios-segmented-control',
    )
    expect(screen.getByRole('radio', { name: /month/i })).toBeChecked()

    const month = screen.getByRole('radio', { name: /month/i })
    month.focus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('today')

    await user.click(screen.getByRole('radio', { name: /today/i }))
    expect(onChange).toHaveBeenCalledWith('today')
  })

  it('gives each clickable segment a minimum 44px touch target', () => {
    render(
      <SegmentedControl
        ariaLabel="Language"
        value="en"
        options={[
          { value: 'en', label: 'English' },
          { value: 'zh', label: '\u4e2d\u6587' },
        ]}
        onChange={vi.fn()}
      />,
    )

    const englishControl = screen.getByRole('radio', { name: 'English' })
    expect(englishControl.closest('label')).toHaveClass('min-h-11')
    expect(englishControl).toHaveClass('absolute', 'inset-0', 'z-10', 'opacity-0')
  })

  it('disables every segmented option while a selection is pending', () => {
    render(
      <SegmentedControl
        ariaLabel="Language"
        value="en"
        options={[
          { value: 'en', label: 'English' },
          { value: 'zh', label: '\u4e2d\u6587' },
        ]}
        onChange={vi.fn()}
        disabled
      />,
    )

    const group = screen.getByRole('radiogroup', { name: /language/i })
    const options = within(group).getAllByRole('radio')

    expect(group).toHaveAttribute('aria-disabled', 'true')
    expect(group).toHaveAttribute('aria-busy', 'true')
    for (const option of options) {
      expect(option).toBeDisabled()
    }
  })

  it('renders compact financial metrics with explicit tones', () => {
    const { rerender } = render(
      <DashboardMetricCard label="Income" value="¥1,280.00" delta="+8.0%" tone="positive" />,
    )

    expect(screen.getByRole('article', { name: /income/i })).toHaveAttribute('data-tone', 'positive')
    expect(screen.getByText('¥1,280.00')).toBeInTheDocument()

    rerender(<DashboardMetricCard label="Balance" value="¥980.00" tone="balance" />)
    expect(screen.getByRole('article', { name: /balance/i })).toHaveAttribute('data-tone', 'balance')
  })

  it('renders the mobile tab bar with a current destination', () => {
    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <MobileNav />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(nav).toHaveAttribute('data-ui', 'ios-tab-bar')
    const links = within(nav).getAllByRole('link')

    expect(links).toHaveLength(5)
    expect(within(nav).getByRole('link', { name: /home/i })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: /^me$/i })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /^import$/i })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument()
  })
})
