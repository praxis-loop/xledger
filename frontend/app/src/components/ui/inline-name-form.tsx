import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface InlineNameFormProps {
  label: string
  submitLabel: string
  initialValue?: string
  pending?: boolean
  error?: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}

// One-field create/rename row. Enter saves, Esc cancels; the label stays visually hidden because the row context names it.
export function InlineNameForm({ label, submitLabel, initialValue = '', pending = false, error, onSubmit, onCancel }: InlineNameFormProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const errorId = useId()
  const [value, setValue] = useState(initialValue)
  const trimmed = value.trim()

  return (
    <form
      className="px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed) onSubmit(trimmed)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onCancel()
        }
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          // Autofocus is safe here: the row only appears after an explicit "new" or "rename" action.
          autoFocus
          value={value}
          placeholder={label}
          maxLength={40}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 min-w-0 flex-1 basis-40 rounded-lg border border-black/15 bg-white px-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-action focus:outline-none focus:ring-1 focus:ring-action motion-reduce:transition-none"
        />
        <Button type="submit" className="min-h-11 px-3 text-[13px]" disabled={pending || !trimmed} aria-busy={pending}>
          {pending ? t('common.working') : submitLabel}
        </Button>
        <Button variant="ghost" className="min-h-11 px-3 text-[13px]" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </form>
  )
}
