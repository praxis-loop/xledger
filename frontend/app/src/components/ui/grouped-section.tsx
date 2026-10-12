import type { PropsWithChildren, ReactNode } from 'react'

interface GroupedSectionProps extends PropsWithChildren {
  id: string
  title: string
  description?: string
  action?: ReactNode
}

// iOS-style grouped list: a quiet heading above one white surface whose rows are split by hairlines.
export function GroupedSection({ id, title, description, action, children }: GroupedSectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <div className="px-1">
        <div className="flex items-center justify-between gap-3">
          <h2 id={id} className="min-w-0 text-[13px] font-semibold leading-5 text-ink-secondary">
            {title}
          </h2>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {description ? <p className="mt-0.5 max-w-2xl text-xs leading-5 text-ink-tertiary">{description}</p> : null}
      </div>
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{children}</div>
    </section>
  )
}
