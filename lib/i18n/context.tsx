'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import th from './th.json'
import en from './en.json'

type Locale = 'th' | 'en'
type Translations = Record<string, string>

const translations: Record<Locale, Translations> = { th, en }

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'th',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th')

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved && (saved === 'th' || saved === 'en')) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] || translations['th']?.[key] || key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
