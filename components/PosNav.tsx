'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import LangSwitch from '@/components/LangSwitch'
import {
  BarChart3,
  Grid3X3,
  LogOut,
  Moon,
  Package,
  Receipt,
  Settings,
  Shield,
  Sun,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useTheme } from '@/lib/theme-provider'
import { useI18n } from '@/lib/i18n/context'

interface Props {
  profile: { role: string | null; shop_id: string | null; full_name: string } | null
}

export default function PosNav({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const isSuperAdmin = profile?.role === 'super_admin'
  const isCashier = profile?.role === 'cashier'

  const NAV_ITEMS = [
    { href: '/pos/tables', label: t('nav.tables'), Icon: Grid3X3 },
    { href: '/pos/orders', label: t('nav.bills'), Icon: Receipt },
    // Owner-only tabs
    ...(!isCashier ? [
      { href: '/pos/products', label: t('nav.products'), Icon: Package },
      { href: '/pos/dashboard', label: t('nav.summary'), Icon: BarChart3 },
    ] : []),
    // Settings — visible to all (cashier sees read-only)
    { href: '/pos/settings', label: t('nav.settings'), Icon: Settings },
  ]

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Left */}
          <div className="flex items-center gap-0.5">
            <Link href={isSuperAdmin ? '/pos/admin' : '/pos/tables'} className="flex items-center gap-2 mr-4 select-none">
              <Logo size={30} />
              <span className="font-display font-semibold hidden sm:block text-stone-900 dark:text-stone-100">
                QRforPay
              </span>
            </Link>

            {!isSuperAdmin && NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors min-w-[40px] min-h-[40px] ${
                    active
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 font-medium'
                      : 'text-stone-500 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}

            {isSuperAdmin && (
              <Link
                href="/pos/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname.startsWith('/pos/admin')
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 font-medium'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <Shield size={15} />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-0.5">
            <LangSwitch />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {profile?.full_name && (
              <span className="text-xs text-stone-500 hidden sm:block px-2 max-w-[120px] truncate">
                {profile.full_name}
              </span>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{t('common.logoutShort')}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
