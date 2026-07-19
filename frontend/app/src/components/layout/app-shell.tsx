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
          <main className="pb-mobile-nav mx-auto w-full max-w-[1680px] flex-1 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-4 min-[1000px]:p-5 xl:p-6">
            <FirstLoginOnboarding />
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </AccountCenterProvider>
  )
}
