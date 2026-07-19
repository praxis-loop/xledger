// frontend/app/src/components/layout/mobile-nav.tsx
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mobileNavItems } from './nav-items'

export function MobileNav() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <nav
      aria-label={t('layout.mobileNavigation')}
      data-ui="ios-tab-bar"
      className="fixed inset-x-0 bottom-0 z-40 hidden max-w-full overflow-hidden border-t border-black/10 bg-white pb-[var(--safe-area-bottom)] pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] backdrop-blur-xl min-[1000px]:hidden max-[999px]:block"
    >
      <div className="grid h-[64px] grid-cols-5 items-center">
        {mobileNavItems.map(({ to, icon: Icon, labelKey, compactLabelKey }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <NavLink
              key={to}
              to={to}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5 py-1.5 text-center transition-colors motion-reduce:transition-none ${
                isActive ? 'text-[#0066cc]' : 'text-[#6e6e73]'
              }`}
            >
              <Icon aria-hidden="true" size={21} strokeWidth={isActive ? 2.5 : 2} />
              <span className="max-w-full truncate text-[9px] font-medium leading-[10px]">
                {t(compactLabelKey ?? labelKey)}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
