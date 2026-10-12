import type { PropsWithChildren, ReactNode } from 'react'

interface PageSectionProps extends PropsWithChildren {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageSection({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PageSectionProps) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[13px] font-semibold text-ink-tertiary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 font-headline text-[28px] font-bold leading-tight text-ink md:text-[34px]">
            {title}
          </h2>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}
