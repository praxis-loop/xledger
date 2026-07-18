import { Bell, CircleHelp, CircleUserRound, Download, LogOut, RefreshCcw, Search, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'
import { TextField } from '@/components/ui/text-field'
import { MobileDeviceDialog } from './mobile-device-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { usePwaInstall } from '@/features/pwa/use-pwa-install'
import { usePwaUpdate } from '@/features/pwa/use-pwa-update'
import { ApiError } from '@/lib/api'
import { changeLanguage, resolveSupportedLanguage, supportedLanguageOptions } from '@/i18n'

export function TopBar() {
  const { logout, session, updateDisplayName, changePassword } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const displayName = useMemo(
    () => session?.name || session?.email || t('layout.topBar.ledgerUser'),
    [session?.email, session?.name, t],
  )

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileDeviceOpen, setMobileDeviceOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState(displayName)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { canInstall, install } = usePwaInstall()
  const { updateAvailable, updating, updateNow } = usePwaUpdate()
  const currentLang = resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language)
  const passwordChangeRequested = oldPassword.length > 0 || newPassword.length > 0

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void changeLanguage(e.target.value).catch((caughtError) => {
      console.error('Failed to change language:', caughtError)
    })
  }

  useEffect(() => {
    setDisplayNameInput(displayName)
  }, [displayName])

  useEffect(() => {
    if (location.pathname !== '/transactions') return
    const q = new URLSearchParams(location.search).get('q') ?? ''
    setSearchInput(q)
  }, [location.pathname, location.search])

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchInput.trim()
    if (!query) {
      navigate('/transactions')
      return
    }
    navigate(`/transactions?q=${encodeURIComponent(query)}`)
  }

  function getPasswordValidationError() {
    if (!passwordChangeRequested) return null
    if (!oldPassword || !newPassword) return t('layout.topBar.passwordFieldsRequired')
    if (newPassword.trim().length < 8) return t('layout.topBar.passwordMinLengthError')
    return null
  }

  async function handleSaveProfile() {
    const passwordValidationError = getPasswordValidationError()
    if (passwordValidationError) {
      setNotice(null)
      setError(passwordValidationError)
      return
    }

    setPending(true)
    setError(null)
    setNotice(null)
    try {
      await updateDisplayName(displayNameInput)
      if (passwordChangeRequested) {
        await changePassword(oldPassword, newPassword)
        setOldPassword('')
        setNewPassword('')
        setNotice(t('layout.topBar.profileAndPasswordUpdated'))
      } else {
        setNotice(t('layout.topBar.profileUpdated'))
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message)
      } else {
        setError(t('layout.topBar.profileUpdateFailed'))
      }
    } finally {
      setPending(false)
    }
  }

  async function handleChangePassword() {
    const passwordValidationError = getPasswordValidationError()
    if (passwordValidationError) {
      setNotice(null)
      setError(passwordValidationError)
      return
    }

    setPending(true)
    setError(null)
    setNotice(null)
    try {
      await changePassword(oldPassword, newPassword)
      setOldPassword('')
      setNewPassword('')
      setNotice(t('layout.topBar.passwordUpdated'))
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message)
      } else {
        setError(t('layout.topBar.passwordUpdateFailed'))
      }
    } finally {
      setPending(false)
    }
  }

  function openProfileDialog() {
    setProfileOpen(true)
    setDisplayNameInput(displayName)
    setError(null)
    setNotice(null)
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f2f2f7]/85 pb-2 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-[calc(var(--safe-area-top)+8px)] backdrop-blur-xl min-[1000px]:border-outline/15 min-[1000px]:bg-surface-container-lowest/90 min-[1000px]:px-5 min-[1000px]:py-3 xl:px-6">
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
              value={currentLang}
              onChange={handleLanguageChange}
              className="h-11 w-[88px] cursor-pointer rounded-lg border border-black/10 bg-white/80 px-2 text-sm font-medium text-[#3a3a3c] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none xl:h-10 xl:w-auto xl:border-outline/20 xl:bg-surface-container-low xl:font-normal xl:text-on-surface-variant"
              aria-label={t('layout.topBar.languageLabel')}
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
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="hidden h-10 w-10 place-items-center rounded-lg border border-outline/20 bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container min-[1000px]:grid"
              aria-label={t('layout.topBar.help')}
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            {canInstall ? (
              <Button
                variant="secondary"
                className="hidden h-10 px-3 xl:inline-flex"
                onClick={() => {
                  void install()
                }}
              >
                <Download className="mr-1 h-4 w-4" />
                {t('layout.topBar.installApp')}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="hidden h-10 px-3 xl:inline-flex"
              onClick={() => setMobileDeviceOpen(true)}
            >
              <Smartphone className="mr-1 h-4 w-4" />
              {t('layout.mobileDevice.title')}
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
              aria-label={t('layout.topBar.installGuide')}
              onClick={() => navigate('/install')}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/80 text-[#0066cc] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none xl:hidden"
              aria-label={t('layout.topBar.openProfile')}
              onClick={openProfileDialog}
            >
              <CircleUserRound className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="hidden items-center gap-3 rounded-lg border border-outline/10 bg-surface-container-low px-3 py-2 xl:flex"
              onClick={openProfileDialog}
            >
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-on-surface">{displayName}</p>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-bold text-white">
                {(displayName[0] ?? 'U').toUpperCase()}
              </div>
            </button>
            <Button variant="ghost" className="h-11 w-11 rounded-full px-0 py-0 text-[#0066cc] xl:h-auto xl:w-auto xl:rounded-lg xl:px-3 xl:py-2" onClick={() => void logout()} aria-label={t('layout.topBar.logout')}>
              <LogOut className="h-4 w-4 xl:hidden" />
              <span className="hidden xl:inline">{t('layout.topBar.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      {notificationsOpen ? (
        <DialogShell
          title={t('layout.topBar.notifications')}
          description={t('layout.topBar.notificationsDescription')}
          onClose={() => setNotificationsOpen(false)}
          className="max-w-xl"
          footer={
            <Button variant="secondary" onClick={() => setNotificationsOpen(false)}>
              {t('common.close')}
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-outline/15 bg-surface-container-low p-4 text-sm text-on-surface">
              {t('layout.topBar.noCriticalAlerts')}
            </div>
            <div className="rounded-xl border border-outline/15 bg-surface-container-low p-4 text-sm text-on-surface">
              {t('layout.topBar.searchTip')}
            </div>
          </div>
        </DialogShell>
      ) : null}

      {helpOpen ? (
        <DialogShell
          title={t('layout.topBar.quickHelp')}
          description={t('layout.topBar.quickHelpDescription')}
          onClose={() => setHelpOpen(false)}
          className="max-w-xl"
          footer={
            <Button
              onClick={() => {
                setHelpOpen(false)
                navigate('/transactions')
              }}
            >
              {t('layout.topBar.goToTransactions')}
            </Button>
          }
        >
          <div className="space-y-3 text-sm text-on-surface">
            <p className="rounded-xl border border-outline/15 bg-surface-container-low p-4">
              {t('layout.topBar.helpTransactions')}
            </p>
            <p className="rounded-xl border border-outline/15 bg-surface-container-low p-4">
              {t('layout.topBar.helpSettings')}
            </p>
          </div>
        </DialogShell>
      ) : null}

      {mobileDeviceOpen ? <MobileDeviceDialog onClose={() => setMobileDeviceOpen(false)} /> : null}

      {profileOpen ? (
        <DialogShell
          title={t('layout.topBar.profile')}
          description={t('layout.topBar.profileDescription')}
          onClose={() => setProfileOpen(false)}
          className="max-w-2xl"
          footer={
            <>
              <Button variant="secondary" onClick={() => setProfileOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void handleSaveProfile()} disabled={pending || !displayNameInput.trim()}>
                {t('layout.topBar.saveProfile')}
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label={t('layout.topBar.email')} value={session?.email ?? ''} disabled />
              <TextField
                label={t('layout.topBar.displayName')}
                value={displayNameInput}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder={t('layout.topBar.displayNamePlaceholder')}
              />
            </div>
            <div className="rounded-2xl border border-outline/15 bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                {t('layout.topBar.changePassword')}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextField
                  label={t('layout.topBar.currentPassword')}
                  type="password"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                />
                <TextField
                  label={t('layout.topBar.newPassword')}
                  type="password"
                  value={newPassword}
                  helperText={t('layout.topBar.passwordMinLengthHint')}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={() => void handleChangePassword()}
                  disabled={pending || !oldPassword || !newPassword}
                >
                  {t('layout.topBar.updatePassword')}
                </Button>
              </div>
            </div>
            {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
            {notice ? <p className="text-sm font-medium text-emerald-700">{notice}</p> : null}
          </div>
        </DialogShell>
      ) : null}
    </>
  )
}
