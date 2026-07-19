import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'
import { TextField } from '@/components/ui/text-field'
import { useAuth } from '@/features/auth/auth-context'
import {
  changeLanguage,
  resolveSupportedLanguage,
  type SupportedLanguage,
} from '@/i18n'
import { ApiError } from '@/lib/api'
import { MobileDeviceDialog } from './mobile-device-dialog'

export interface AccountCenterValue {
  displayName: string
  email: string
  currentLanguage: SupportedLanguage
  languagePending: boolean
  actionError: string | null
  openProfile: () => void
  openNotifications: () => void
  openHelp: () => void
  openMobileDevice: () => void
  selectLanguage: (language: SupportedLanguage) => Promise<void>
  signOut: () => Promise<void>
}

const AccountCenterContext = createContext<AccountCenterValue | null>(null)

export function AccountCenterProvider({ children }: PropsWithChildren) {
  const { logout, session, updateDisplayName, changePassword } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const displayName = useMemo(
    () => session?.name || session?.email || t('layout.topBar.ledgerUser'),
    [session?.email, session?.name, t],
  )
  const currentLanguage = resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language)

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileDeviceOpen, setMobileDeviceOpen] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState(displayName)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [languagePending, setLanguagePending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const passwordChangeRequested = oldPassword.length > 0 || newPassword.length > 0

  useEffect(() => {
    setDisplayNameInput(displayName)
  }, [displayName])

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

  const openProfile = useCallback(() => {
    setProfileOpen(true)
    setDisplayNameInput(displayName)
    setError(null)
    setNotice(null)
  }, [displayName])

  const openNotifications = useCallback(() => {
    setNotificationsOpen(true)
  }, [])

  const openHelp = useCallback(() => {
    setHelpOpen(true)
  }, [])

  const openMobileDevice = useCallback(() => {
    setMobileDeviceOpen(true)
  }, [])

  const selectLanguage = useCallback(
    async (language: SupportedLanguage) => {
      setActionError(null)
      setLanguagePending(true)
      try {
        await changeLanguage(language)
      } catch (caughtError) {
        console.error('Failed to change language:', caughtError)
        setActionError(t('layout.accountCenter.languageChangeFailed'))
      } finally {
        setLanguagePending(false)
      }
    },
    [t],
  )

  const signOut = useCallback(async () => {
    setActionError(null)
    try {
      await logout()
    } catch (caughtError) {
      console.error('Failed to log out:', caughtError)
      setActionError(t('layout.accountCenter.logoutFailed'))
    }
  }, [logout, t])

  const value = useMemo<AccountCenterValue>(
    () => ({
      displayName,
      email: session?.email ?? '',
      currentLanguage,
      languagePending,
      actionError,
      openProfile,
      openNotifications,
      openHelp,
      openMobileDevice,
      selectLanguage,
      signOut,
    }),
    [
      actionError,
      currentLanguage,
      displayName,
      languagePending,
      openHelp,
      openMobileDevice,
      openNotifications,
      openProfile,
      selectLanguage,
      session?.email,
      signOut,
    ],
  )

  return (
    <AccountCenterContext.Provider value={value}>
      {children}

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
    </AccountCenterContext.Provider>
  )
}

export function useAccountCenter() {
  const context = useContext(AccountCenterContext)
  if (!context) {
    throw new Error('useAccountCenter must be used within AccountCenterProvider')
  }
  return context
}
