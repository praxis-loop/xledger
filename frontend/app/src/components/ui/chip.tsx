import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface ChipProps extends PropsWithChildren {
  tone?: 'default' | 'positive' | 'negative'
}

const tones = {
  default: 'bg-ground text-ink-control',
  positive: 'bg-income-tint text-income',
  negative: 'bg-expense-tint text-expense',
}

export function Chip({ children, tone = 'default' }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-4',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
