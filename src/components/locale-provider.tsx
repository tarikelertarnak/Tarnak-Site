'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  detectLocale,
  LOCALE_COOKIE,
  resolveLocale,
  t,
  type Locale,
  type LocalePref,
} from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  pref: LocalePref
  detected: Locale
  setPref: (pref: LocalePref) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * Bilingual provider — Turkish default, English opt-in.
 * setPref persists the choice to the `site-locale` cookie and refreshes the
 * page so server components re-render with the new locale.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pref, setPrefState] = useState<LocalePref>('auto')

  // Hydration-safe: bootstrap from cookie, then keep in sync with the provider.
  useEffect(() => {
    const fromCookie = (document.cookie.match(/(?:^|;\s*)site-locale=([^;]*)/) || [])[1]
    setPrefState((fromCookie === 'tr' || fromCookie === 'en' || fromCookie === 'auto'
      ? fromCookie
      : 'auto') as LocalePref)
  }, [])

  const value = useMemo<LocaleContextValue>(() => {
    const detected = detectLocale(typeof navigator !== 'undefined' ? navigator.language : 'tr')
    const locale = resolveLocale(pref, detected)
    const setPref = (next: LocalePref) => {
      setPrefState(next)
      try {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`
      } catch {
        /* noop */
      }
      router.refresh()
    }
    return { locale, pref, detected, setPref }
  }, [pref, router])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

/** Look up static UI strings for the active locale. */
export function useT() {
  const { locale } = useLocale()
  return { t: (key: string) => t(locale, key), locale }
}