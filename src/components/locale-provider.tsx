'use client'

import type { ReactNode } from 'react'
import type { Locale, LocalePref } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  detectLocale,
  detectLocaleFromCountry,

  isLocalePref,

  LOCALE_COOKIE,

  resolveLocale,
  t,
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
export function LocaleProvider({
  children,
  detectedLocale,
}: {
  children: ReactNode
  /**
   * Sunucunun cozdugu dil (`getLocale()` → `<html lang>` ile AYNI kaynak).
   *
   * ⚠️ Neden gerekli: sunucu `accept-language` basligina, istemci ise
   * `navigator.language`'a bakiyordu. Bu ikisi AYRISABILIYOR — tarayici arayuz
   * dili Ingilizce ama isletim sistemi dili Turkce oldugunda (ya da tersi)
   * sayfa **Ingilizce icerik + Turkce arayuz** olarak cikiyordu (gercek
   * tarayicida olculdu: html lang="en", ama "Gezinme"/"Takip Et" Turkce).
   * Artik otomatik algilama icin TEK kaynak sunucunun karari.
   */
  detectedLocale?: Locale
}) {
  const router = useRouter()
  const [pref, setPrefState] = useState<LocalePref>('auto')

  // Hydration-safe: bootstrap from cookie, then keep in sync with the provider.
  // ⚠️ Burada 25 dilin TAMAMI kabul edilmeli. Eskiden yalnizca tr|en|auto
  // kabul ediliyordu; combobox 25 dil sundugu icin diger secimler cerezde
  // dogru duruyor ama yenilemede `auto`ya dusup KAYBOLUYORDU.
  useEffect(() => {
    const fromCookie = (document.cookie.match(/(?:^|;\s*)site-locale=([^;]*)/) || [])[1]
    setPrefState(isLocalePref(fromCookie) ? fromCookie : 'auto')
  }, [])

  const value = useMemo<LocaleContextValue>(() => {
    // Sunucu karari varsa onu kullan (tek kaynak). Yoksa istemci tarafinda
    // tespit: tarayici dili, sonra bolge kodu.
    let detected: Locale
    if (detectedLocale) {
      detected = detectedLocale
    }
    else {
      detected = detectLocale(typeof navigator !== 'undefined' ? navigator.language : undefined)
      if (typeof navigator !== 'undefined') {
        try {
          // "pt-BR" → region "BR" → pt; "en-US" → region not in map → keep 'en'.
          const region = (navigator.language.split('-')[1] || '').toUpperCase()
          if (region) {
            detected = detectLocaleFromCountry(region) ?? detected
          }
        }
        catch {
          /* locale unavailable — keep browser-language result */
        }
      }
    }
    const locale = resolveLocale(pref, detected)
    const setPref = (next: LocalePref) => {
      // Savunma: gecersiz bir deger gelirse cerezi bozmayalim.
      if (!isLocalePref(next)) {
        return
      }
      setPrefState(next)
      try {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`
      }
      catch {
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
