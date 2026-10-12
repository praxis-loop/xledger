import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAccountCenter } from './account-center'
import { primaryNavItems } from './nav-items'

function BrandMark() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-action text-white">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path d="M4 5h6v6H4V5Zm10 0h6v3h-6V5ZM14 10h6v9h-6v-9ZM4 13h6v6H4v-6Z" fill="currentColor" />
      </svg>
    </div>
  )
}

export function SideNav() {
  const { t } = useTranslation()
  const { openMobileDevice } = useAccountCenter()

  return (
    <aside className="hidden w-[230px] shrink-0 border-r border-black/10 bg-white px-4 py-5 min-[1000px]:sticky min-[1000px]:top-0 min-[1000px]:flex min-[1000px]:h-screen min-[1000px]:flex-col">
      <div className="mb-6 px-2 py-2">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-headline text-[30px] font-bold leading-none tracking-tight text-ink">xledger</p>
            <p className="mt-1 text-[11px] font-medium leading-4 text-ink-tertiary">
              {t('layout.brandTagline')}
            </p>
          </div>
        </div>
      </div>

      <nav aria-label={t('layout.primaryNavigation')} className="flex flex-1 flex-col gap-1.5">
        {primaryNavItems.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none',
                isActive ? 'bg-action-tint text-action' : 'text-ink-secondary hover:bg-ground hover:text-ink',
              )
            }
          >
            <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink-secondary transition hover:bg-ground hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
        onClick={openMobileDevice}
        aria-label={t('layout.mobileDevice.title')}
      >
        <Smartphone aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        <span>{t('layout.mobileDevice.title')}</span>
      </button>
    </aside>
  )
}
