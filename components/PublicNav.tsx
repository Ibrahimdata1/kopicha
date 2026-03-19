'use client'

import Link from 'next/link'
import { Moon, Sun } from 'lucide-react'
import Logo from '@/components/Logo'
import LangSwitch from '@/components/LangSwitch'
import { useTheme } from '@/lib/theme-provider'
import { useI18n } from '@/lib/i18n/context'

export default function PublicNav() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-stone-950 border-b border-stone-100 dark:border-stone-900">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display font-semibold text-lg text-stone-900 dark:text-stone-100">QRforPay</span>
        </Link>
        <div className="flex items-center gap-1">
          <LangSwitch />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link href="/login" className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors">
            {t('common.login')}
          </Link>
          <Link href="/register" className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
            {t('common.register')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
