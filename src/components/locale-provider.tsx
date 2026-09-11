'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { t, type Locale, type LocalePref } from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  pref: LocalePref
  detected: Locale
  setPref: (pref: LocalePref) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * Single-locale provider — the site is Turkish-only.
 * Kept as a component so existing consumers (useLocale/useT) keep working
 * unchanged; setPref is a no-op since there is no language switcher anymore.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale: 'tr', pref: 'tr', detected: 'tr', setPref: () => {} }),
    [],
  )
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

/** Grab static strings from the Turkish UI dictionary. */
export function useT() {
  return { t: (key: string) => t('tr', key), locale: 'tr' as Locale }
}