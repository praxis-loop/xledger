import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DashboardMetricCard } from '@/components/ui/dashboard-metric-card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MobileNav } from '@/components/layout/mobile-nav'
import '@/i18n'

describe('mobile iOS design primitives', () => {
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
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('aria-current', 'page')
  })
})
