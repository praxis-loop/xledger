import type { PropsWithChildren } from 'react'
import { AccountCenterProvider } from './account-center'
import { SideNav } from './side-nav'
import { TopBar } from './top-bar'
import { OfflineBanner } from './offline-banner'
import { MobileNav } from './mobile-nav'
import { FirstLoginOnboarding } from './first-login-onboarding'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <AccountCenterProvider>
      <div className="min-h-screen bg-[#f2f2f7] text-on-surface min-[1000px]:flex">
        <OfflineBanner />
        <SideNav />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="pb-mobile-nav mx-auto w-full max-w-[1680px] flex-1 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-[calc(var(--safe-area-top)+1rem)] min-[1000px]:px-5 min-[1000px]:pb-5 min-[1000px]:pt-5 xl:px-6 xl:pb-6 xl:pt-6">
            <FirstLoginOnboarding />
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </AccountCenterProvider>
  )
}
