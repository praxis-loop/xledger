import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardMetricTone = 'positive' | 'negative' | 'balance'

interface DashboardMetricCardProps {
  label: string
  value: string
  delta?: string
  tone: DashboardMetricTone
  details?: ReactNode
  className?: string
}

const toneStyles: Record<DashboardMetricTone, string> = {
  positive: 'border-[#b7ebcc] bg-white text-[#176b3a]',
  negative: 'border-[#f5c2c7] bg-white text-[#b4233c]',
  balance: 'border-[#0066cc] bg-[#0066cc] text-white',
}

const deltaStyles: Record<DashboardMetricTone, string> = {
  positive: 'bg-[#e8f7ee] text-[#176b3a]',
  negative: 'bg-[#fdecef] text-[#b4233c]',
  balance: 'bg-white/15 text-white',
}

export function DashboardMetricCard({
  label,
  value,
  delta,
  tone,
  details,
  className,
}: DashboardMetricCardProps) {
  return (
    <article
      aria-label={label}
      data-ui="ios-metric-card"
      data-tone={tone}
      className={cn('min-w-0 rounded-lg border p-3.5 md:p-5', toneStyles[tone], className)}
    >
      <div className="flex min-h-8 min-w-0 items-start justify-between gap-1.5">
        <p className={cn('min-w-0 text-[12px] font-semibold leading-4 text-[#6e6e73] sm:text-[13px]', tone === 'balance' && 'text-white')}>
          {label}
        </p>
        {delta ? (
          <span className={cn('shrink-0 rounded-full px-1.5 py-1 text-[10px] font-semibold sm:px-2 sm:text-[11px]', deltaStyles[tone])}>
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-words font-headline text-2xl font-bold leading-none tracking-normal text-current md:mt-3 md:text-4xl">
        {value}
      </p>
      {details ? (
        <div className={cn('mt-3 text-xs leading-5 text-current md:text-sm', tone !== 'balance' && 'opacity-80')}>
          {details}
        </div>
      ) : null}
    </article>
  )
}
