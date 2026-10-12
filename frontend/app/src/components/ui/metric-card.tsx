import { cn } from '@/lib/utils'

type MetricCardTone = 'neutral' | 'positive' | 'negative' | 'primary'

interface MetricCardProps {
  label: string
  value: string
  delta?: string
  tone?: MetricCardTone
}

const toneStyles: Record<MetricCardTone, string> = {
  neutral: 'border-black/10 text-ink',
  positive: 'border-income-edge text-income',
  negative: 'border-expense-edge text-expense',
  primary: 'border-action bg-action text-white',
}

export function MetricCard({ label, value, delta, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className={cn('rounded-lg border bg-white p-4 md:p-5', toneStyles[tone])}>
      <div className="flex items-start justify-between gap-4">
        <p className={cn('text-[13px] font-semibold leading-4', tone === 'primary' ? 'text-white' : 'text-ink-tertiary')}>
          {label}
        </p>
        {delta ? (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-1 text-[11px] font-semibold text-current">
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-headline text-2xl font-bold leading-none tabular-nums md:text-4xl">{value}</p>
    </article>
  )
}
