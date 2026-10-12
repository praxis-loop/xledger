import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { className, error, helperText, id, label, ...props },
  ref,
) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const helperId = helperText ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [props['aria-describedby'], helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="block space-y-2">
      <label className="block text-[13px] font-semibold leading-5 text-ink-secondary" htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-outline focus:ring-1 disabled:cursor-not-allowed disabled:bg-ground disabled:text-ink-tertiary motion-reduce:transition-none',
          error ? 'border-error focus:border-error focus:ring-error' : 'border-black/15 focus:border-action focus:ring-action',
          className,
        )}
        {...props}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
      />
      {helperText ? <p id={helperId} className="text-xs leading-5 text-ink-secondary">{helperText}</p> : null}
      {error ? <p id={errorId} className="text-xs font-medium text-error">{error}</p> : null}
    </div>
  )
})
