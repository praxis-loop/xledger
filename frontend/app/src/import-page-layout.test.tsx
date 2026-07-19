import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InitialEntry } from '@remix-run/router'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ImportPage } from './pages/import-page'
import { importCSVConfirm, importCSVPreview } from './features/management/management-api'
import './i18n'

vi.mock('./features/management/management-api', () => ({
  importCSVPreview: vi.fn(),
  importCSVConfirm: vi.fn(),
}))

function renderImportPage(initialEntries: InitialEntry[] = ['/import']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={initialEntries}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Routes>
          <Route path="/import" element={<ImportPage />} />
          <Route path="/me" element={<div>Me destination</div>} />
          <Route path="/transactions" element={<div>Transactions destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('standalone import layout', () => {
  beforeEach(() => {
    vi.mocked(importCSVPreview).mockReset()
    vi.mocked(importCSVConfirm).mockReset()
  })

  it('renders a compact three-step import surface with guidance', () => {
    renderImportPage()

    expect(screen.getByRole('button', { name: /back/i })).toHaveClass('min-[1000px]:hidden')
    expect(screen.getByTestId('import-page-title')).toHaveClass('text-[32px]', 'min-[1000px]:text-2xl')
    const progress = screen.getByRole('list', { name: /import progress/i })
    expect(progress).toHaveAttribute('data-ui', 'ios-import-stepper')
    expect(progress).toHaveClass('min-[1000px]:hidden')
    expect(within(progress).getAllByRole('listitem')).toHaveLength(3)
    expect(within(progress).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByTestId('compact-import-dropzone')).toHaveAttribute('data-ui', 'ios-compact-upload')
    expect(screen.getByTestId('compact-import-dropzone')).toHaveClass(
      'min-h-[190px]',
      'max-h-[220px]',
      'min-[1000px]:min-h-0',
      'min-[1000px]:max-h-none',
      'min-[1000px]:p-12',
    )
    expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /browse/i })).toHaveClass('min-[1000px]:hidden')
    expect(screen.getByRole('region', { name: /import guidance/i })).toHaveClass('min-[1000px]:hidden')
  })

  it('preserves whole-surface file selection for the desktop upload area', async () => {
    const user = userEvent.setup()
    renderImportPage()
    const input = screen.getByLabelText(/csv file/i)
    const inputClick = vi.spyOn(input, 'click')

    await user.click(screen.getByTestId('compact-import-dropzone'))

    expect(inputClick).toHaveBeenCalledTimes(1)
  })

  it('returns to the source page and otherwise falls back to Me', async () => {
    const user = userEvent.setup()
    const first = renderImportPage([{ pathname: '/import', state: { from: '/transactions' } }])

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('Transactions destination')).toBeInTheDocument()

    first.unmount()
    renderImportPage([{ pathname: '/import', state: { from: '/unknown' } }])
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('Me destination')).toBeInTheDocument()
  })

  it('keeps the selected file visible when preview fails', async () => {
    vi.mocked(importCSVPreview).mockRejectedValueOnce(new Error('Preview failed'))
    const user = userEvent.setup()
    renderImportPage()

    const input = screen.getByLabelText(/csv file/i)
    await user.upload(
      input,
      new File(['date,amount\n2026-01-01,10'], 'failed.csv', { type: 'text/csv' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Preview failed')
    expect(screen.getByText('failed.csv')).toBeInTheDocument()
    expect(screen.getByTestId('compact-import-dropzone')).toBeInTheDocument()
  })

  it('advances the progress state without changing the preview contract', async () => {
    vi.mocked(importCSVPreview).mockResolvedValueOnce({
      format: 'csv',
      columns: ['date', 'amount'],
      sample_rows: [['2026-01-01', '10']],
      mappingSlots: ['date', 'amount'],
      mappingCandidates: { date: ['date'], amount: ['amount'] },
      suggested_mapping: { date: 'date', amount: 'amount' },
    })
    const user = userEvent.setup()
    renderImportPage()

    await user.upload(
      screen.getByLabelText(/csv file/i),
      new File(['date,amount\n2026-01-01,10'], 'valid.csv', { type: 'text/csv' }),
    )

    const progress = screen.getByRole('list', { name: /import progress/i })
    expect(await within(progress).findByText(/map fields/i)).toBeInTheDocument()
    expect(within(progress).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
    expect(importCSVPreview).toHaveBeenCalledTimes(1)
    expect(screen.getByText('valid.csv')).toBeInTheDocument()
  })

  it('preserves mapping confirmation and result behavior', async () => {
    vi.mocked(importCSVPreview).mockResolvedValueOnce({
      format: 'csv',
      columns: ['date', 'amount'],
      sample_rows: [['2026-01-01', '10']],
      mappingSlots: ['date', 'amount'],
      mappingCandidates: { date: ['date'], amount: ['amount'] },
      suggested_mapping: { date: 'date', amount: 'amount' },
    })
    vi.mocked(importCSVConfirm).mockResolvedValueOnce({
      success_count: 1,
      skip_count: 0,
      fail_count: 0,
    })
    const user = userEvent.setup()
    renderImportPage()

    await user.upload(
      screen.getByLabelText(/csv file/i),
      new File(['date,amount\n2026-01-01,10'], 'confirmed.csv', { type: 'text/csv' }),
    )
    await user.click(await screen.findByRole('button', { name: /confirm import/i }))

    expect(await screen.findByRole('heading', { name: /import successful/i })).toBeInTheDocument()
    const submittedForm = vi.mocked(importCSVConfirm).mock.calls[0][0]
    expect((submittedForm.get('file') as File).name).toBe('confirmed.csv')
    expect(submittedForm.get('mapping')).toBe(JSON.stringify({ date: 'date', amount: 'amount' }))
    const progress = screen.getByRole('list', { name: /import progress/i })
    expect(within(progress).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step')
  })

  it('keeps the file and mapping visible after confirmation fails and allows retry', async () => {
    vi.mocked(importCSVPreview).mockResolvedValueOnce({
      format: 'csv',
      columns: ['date', 'amount'],
      sample_rows: [['2026-01-01', '10']],
      mappingSlots: ['date', 'amount'],
      mappingCandidates: { date: ['date'], amount: ['amount'] },
      suggested_mapping: { date: 'date', amount: 'amount' },
    })
    vi.mocked(importCSVConfirm)
      .mockRejectedValueOnce(new Error('Confirmation failed'))
      .mockResolvedValueOnce({ success_count: 1, skip_count: 0, fail_count: 0 })
    const user = userEvent.setup()
    renderImportPage()

    await user.upload(
      screen.getByLabelText(/csv file/i),
      new File(['date,amount\n2026-01-01,10'], 'retry.csv', { type: 'text/csv' }),
    )
    const mappingControls = await screen.findAllByRole('combobox')
    await user.selectOptions(mappingControls[0], 'amount')
    await user.click(screen.getByRole('button', { name: /confirm import/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmation failed')
    expect(screen.getByText('retry.csv')).toBeInTheDocument()
    expect(mappingControls[0]).toHaveValue('amount')

    await user.click(screen.getByRole('button', { name: /confirm import/i }))
    expect(await screen.findByRole('heading', { name: /import successful/i })).toBeInTheDocument()
    expect(importCSVConfirm).toHaveBeenCalledTimes(2)
    expect(vi.mocked(importCSVConfirm).mock.calls[1][0].get('mapping')).toBe(
      JSON.stringify({ date: 'amount', amount: 'amount' }),
    )
  })
})
