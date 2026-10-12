import { Bell, CircleHelp, CircleUserRound, Download, LogOut, RefreshCcw, Search, Smartphone } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/features/pwa/use-pwa-install'
import { usePwaUpdate } from '@/features/pwa/use-pwa-update'
import { resolveSupportedLanguage, supportedLanguageOptions } from '@/i18n'
import { useAccountCenter } from './account-center'

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    actionError,
    currentLanguage,
    displayName,
    languagePending,
    openHelp,
    openMobileDevice,
    openNotifications,
    openProfile,
    selectLanguage,
    signOut,
  } = useAccountCenter()
  const [searchInput, setSearchInput] = useState('')
  const { canInstall, install } = usePwaInstall()
  const { updateAvailable, updating, updateNow } = usePwaUpdate()

  useEffect(() => {
    if (location.pathname !== '/transactions') return
    const q = new URLSearchParams(location.search).get('q') ?? ''
    setSearchInput(q)
  }, [location.pathname, location.search])

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchInput.trim()
    if (!query) {
      navigate('/transactions')
      return
    }
    navigate(`/transactions?q=${encodeURIComponent(query)}`)
  }

  return (
    <header
      data-ui="desktop-top-bar"
      className="sticky top-0 z-20 border-b border-black/10 bg-[#f2f2f7]/85 pb-2 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-[calc(var(--safe-area-top)+8px)] backdrop-blur-xl max-[999px]:hidden min-[1000px]:border-outline/15 min-[1000px]:bg-surface-container-lowest/90 min-[1000px]:px-5 min-[1000px]:py-3 xl:px-6"
    >
      <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4">
        <form className="relative hidden min-w-0 w-full max-w-[300px] min-[1000px]:block xl:max-w-[460px]" onSubmit={handleSearchSubmit}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('layout.topBar.searchPlaceholder')}
            className="h-11 w-full rounded-lg border border-outline/20 bg-surface-container-low pl-9 pr-24 text-sm text-on-surface placeholder:text-on-surface-variant/70"
          />
          <Button type="submit" variant="ghost" className="absolute right-1 top-1 h-9 px-3 text-xs">
            {t('common.search')}
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-2 xl:gap-2.5">
          <select
            value={currentLanguage}
            onChange={(event) => {
              void selectLanguage(resolveSupportedLanguage(event.target.value))
            }}
            className="h-11 w-[88px] cursor-pointer rounded-lg border border-black/10 bg-white/80 px-2 text-sm font-medium text-[#3a3a3c] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none xl:h-10 xl:w-auto xl:border-outline/20 xl:bg-surface-container-low xl:font-normal xl:text-on-surface-variant"
            aria-label={t('layout.topBar.languageLabel')}
            disabled={languagePending}
          >
            {supportedLanguageOptions.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="hidden h-10 w-10 place-items-center rounded-lg border border-outline/20 bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container min-[1000px]:grid"
            aria-label={t('layout.topBar.notifications')}
            onClick={openNotifications}
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 place-items-center rounded-lg border border-outline/20 bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container min-[1000px]:grid"
            aria-label={t('layout.topBar.help')}
            onClick={openHelp}
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          {canInstall ? (
            <Button
              variant="secondary"
              aria-label={t('layout.topBar.installApp')}
              className="hidden h-10 w-10 px-0 min-[1000px]:inline-flex xl:w-auto xl:px-3"
              onClick={() => {
                void install()
              }}
            >
              <Download className="h-4 w-4 xl:mr-1" />
              <span className="hidden xl:inline">{t('layout.topBar.installApp')}</span>
            </Button>
          ) : null}
          <Button
            variant="secondary"
            aria-label={t('layout.mobileDevice.title')}
            className="hidden h-10 w-10 px-0 min-[1000px]:inline-flex xl:w-auto xl:px-3"
            onClick={openMobileDevice}
          >
            <Smartphone className="h-4 w-4 xl:mr-1" />
            <span className="hidden xl:inline">{t('layout.mobileDevice.title')}</span>
          </Button>
          {updateAvailable ? (
            <Button
              variant="secondary"
              className="hidden h-10 w-10 px-0 min-[1000px]:inline-flex xl:w-auto xl:px-3"
              onClick={() => void updateNow()}
              disabled={updating}
              aria-label={updating ? t('layout.topBar.updating') : t('layout.topBar.updateApp')}
            >
              <RefreshCcw className="h-4 w-4 xl:mr-1" />
              <span className="hidden xl:inline">{updating ? t('layout.topBar.updating') : t('layout.topBar.updateApp')}</span>
            </Button>
          ) : null}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/80 text-[#0066cc] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none xl:hidden"
            aria-label={t('layout.topBar.openProfile')}
            onClick={openProfile}
          >
            <CircleUserRound className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden items-center gap-3 rounded-lg border border-outline/10 bg-surface-container-low px-3 py-2 xl:flex"
            onClick={openProfile}
          >
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-on-surface">{displayName}</p>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-bold text-white">
              {(displayName[0] ?? 'U').toUpperCase()}
            </div>
          </button>
          <Button
            variant="ghost"
            className="h-11 w-11 rounded-full px-0 py-0 text-[#0066cc] xl:h-auto xl:w-auto xl:rounded-lg xl:px-3 xl:py-2"
            onClick={() => void signOut()}
            aria-label={t('layout.topBar.logout')}
          >
            <LogOut className="h-4 w-4 xl:hidden" />
            <span className="hidden xl:inline">{t('layout.topBar.logout')}</span>
          </Button>
        </div>
      </div>
      {actionError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="absolute right-[max(1rem,var(--safe-area-right))] top-full mt-2 rounded-lg bg-error px-3 py-2 text-sm font-medium text-white shadow-ambient"
        >
          {actionError}
        </p>
      ) : null}
    </header>
  )
}
