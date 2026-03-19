'use client'

import { useI18n } from '@/lib/i18n/context'

export default function LangSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()

  return (
    <button
      onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800 ${className}`}
      title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
    >
      {locale === 'th' ? 'EN' : 'TH'}
    </button>
  )
}
