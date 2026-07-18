import {
  BarChart3,
  Home,
  LayoutDashboard,
  PieChart,
  Receipt,
  ReceiptText,
  Settings,
  Target,
  Upload,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  compactLabelKey?: string
  icon: LucideIcon
}

export const primaryNavItems: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/transactions', labelKey: 'nav.transactions', icon: ReceiptText },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/budgets', labelKey: 'nav.budgets', icon: Target },
  { to: '/accounts', labelKey: 'nav.accounts', icon: Wallet },
  { to: '/shortcut', labelKey: 'nav.quickEntry', icon: Zap },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export const mobileNavItems: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', compactLabelKey: 'layout.mobileTabs.home', icon: Home },
  { to: '/transactions', labelKey: 'nav.transactions', compactLabelKey: 'layout.mobileTabs.entries', icon: Receipt },
  { to: '/analytics', labelKey: 'nav.analytics', compactLabelKey: 'layout.mobileTabs.reports', icon: PieChart },
  { to: '/accounts', labelKey: 'nav.accounts', compactLabelKey: 'layout.mobileTabs.accounts', icon: Wallet },
  { to: '/import', labelKey: 'nav.import', compactLabelKey: 'layout.mobileTabs.import', icon: Upload },
  { to: '/settings', labelKey: 'nav.settings', compactLabelKey: 'layout.mobileTabs.settings', icon: Settings },
]
