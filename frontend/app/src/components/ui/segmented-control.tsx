import { useId } from 'react'
import { cn } from '@/lib/utils'

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  ariaLabel: string
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange: (value: T) => void
  className?: string
  disabled?: boolean
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className,
  disabled = false,
}: SegmentedControlProps<T>) {
  const id = useId()

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      aria-busy={disabled}
      data-ui="ios-segmented-control"
      className={cn(
        'grid min-h-11 w-full grid-flow-col auto-cols-fr rounded-xl bg-[#e3e3e8] p-0.5 motion-reduce:transition-none md:w-auto md:min-w-[360px]',
        className,
      )}
    >
      {options.map((option) => {
        const optionId = `${id}-${option.value}`
        const selected = option.value === value

        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className={cn(
              'relative flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-[13px] font-semibold text-[#3a3a3c] transition-colors motion-reduce:transition-none',
              selected && 'bg-white text-[#0066cc] shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              id={optionId}
              type="radio"
              name={`${id}-segment`}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="peer sr-only"
            />
            <span className="pointer-events-none absolute inset-0 rounded-lg ring-[#0066cc] peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1" />
            <span className="relative">{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}
