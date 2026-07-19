import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileUp,
  LogOut,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAccountCenter } from '@/components/layout/account-center'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  supportedLanguageOptions,
  type SupportedLanguage,
} from '@/i18n'
import { cn } from '@/lib/utils'

interface ActionRowProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  destructive?: boolean
}

function ActionRow({ icon: Icon, label, onClick, destructive = false }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[16px] transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0066cc] motion-reduce:transition-none',
        destructive ? 'text-[#d70015]' : 'text-[#1c1c1e]',
      )}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight aria-hidden="true" className="h-4 w-4 text-[#8e8e93]" />
    </button>
  )
}

export function MePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const account = useAccountCenter()
  const languageOptions = supportedLanguageOptions.map(({ code, label }) => ({
    value: code,
    label: code === 'en' ? 'English' : label,
  }))

  return (
    <section
      aria-labelledby="me-page-title"
      data-ui="ios-me-page"
      className="mx-auto w-full max-w-2xl space-y-6 pb-4"
    >
      <h1
        id="me-page-title"
        className="font-headline text-[34px] font-bold leading-tight tracking-[-0.02em] text-[#1c1c1e]"
      >
        {t('layout.me.title')}
      </h1>

      <div className="space-y-3">
        <button
          type="button"
          aria-label={t('layout.me.profile')}
          onClick={account.openProfile}
          className="flex min-h-[76px] w-full items-center gap-4 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] motion-reduce:transition-none"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0066cc] text-lg font-bold text-white">
            {(account.displayName[0] ?? 'U').toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold text-[#1c1c1e]">
              {account.displayName}
            </span>
            <span className="block truncate text-[13px] text-[#6e6e73]">{account.email}</span>
          </span>
          <ChevronRight aria-hidden="true" className="h-5 w-5 text-[#8e8e93]" />
        </button>

        <SegmentedControl<SupportedLanguage>
          ariaLabel={t('layout.me.language')}
          value={account.currentLanguage}
          options={languageOptions}
          onChange={(language) => {
            void account.selectLanguage(language)
          }}
          disabled={account.languagePending}
          className="md:w-full md:min-w-0"
        />
      </div>

      <section role="region" aria-labelledby="me-account-actions-title">
        <h2
          id="me-account-actions-title"
          className="mb-2 px-4 text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]"
        >
          {t('layout.me.accountActions')}
        </h2>
        <div className="divide-y divide-black/10 overflow-hidden rounded-xl bg-white">
          <ActionRow
            icon={FileUp}
            label={t('layout.me.importData')}
            onClick={() => navigate('/import', { state: { from: '/me' } })}
          />
          <ActionRow
            icon={Smartphone}
            label={t('layout.me.mobileDevice')}
            onClick={account.openMobileDevice}
          />
        </div>
      </section>

      <section role="region" aria-labelledby="me-support-actions-title">
        <h2
          id="me-support-actions-title"
          className="mb-2 px-4 text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]"
        >
          {t('layout.me.supportActions')}
        </h2>
        <div className="divide-y divide-black/10 overflow-hidden rounded-xl bg-white">
          <ActionRow
            icon={Bell}
            label={t('layout.me.notifications')}
            onClick={account.openNotifications}
          />
          <ActionRow icon={CircleHelp} label={t('layout.me.help')} onClick={account.openHelp} />
          <Link
            to="/settings"
            className="flex min-h-[52px] w-full items-center gap-3 px-4 text-[16px] font-medium text-[#1c1c1e] transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0066cc] motion-reduce:transition-none"
          >
            <Settings aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="flex-1">{t('layout.me.settings')}</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 text-[#8e8e93]" />
          </Link>
        </div>
      </section>

      <section role="region" aria-labelledby="me-destructive-actions-title">
        <h2
          id="me-destructive-actions-title"
          className="mb-2 px-4 text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]"
        >
          {t('layout.me.destructiveActions')}
        </h2>
        <div className="overflow-hidden rounded-xl bg-white">
          <ActionRow
            icon={LogOut}
            label={t('layout.me.logout')}
            onClick={() => {
              void account.signOut()
            }}
            destructive
          />
        </div>
      </section>

      {account.actionError ? (
        <p role="alert" aria-live="assertive" className="px-4 text-sm font-medium text-[#d70015]">
          {account.actionError}
        </p>
      ) : null}
    </section>
  )
}
