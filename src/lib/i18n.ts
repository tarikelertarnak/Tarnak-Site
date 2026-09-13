/**
 * Bilingual i18n — Turkish (default) and English.
 *
 * detectLocale() reads the browser/accept-language; resolveLocale() combines
 * the user preference (cookie) with the detected language; both fall back to
 * Turkish. The site content stays Turkish-first; English is opt-in via the
 * settings switcher.
 */

/* ------------------------------------------------------------------ */
/* UI dictionary — static strings used by components                   */
/* ------------------------------------------------------------------ */

import enDict from '@/i18n/en.json'
import trDict from '@/i18n/tr.json'

export type Locale = 'tr' | 'en'
export type LocalePref = 'auto' | Locale
export const LOCALE_COOKIE = 'site-locale'

function cleanLocale(s?: string | null): Locale {
  return s?.toLowerCase().startsWith('en') ? 'en' : 'tr'
}

/** Detect from a language tag (`navigator.language` / `accept-language`). */
export function detectLocale(lang?: string): Locale {
  return cleanLocale(lang)
}

/** Combine stored preference with detection (works on server and client). */
export function resolveLocale(pref?: LocalePref, detected?: Locale): Locale {
  if (pref === 'tr' || pref === 'en') {
    return pref
  }
  return detected ?? 'tr'
}

type Dictionary = Record<string, string>

/** Turkish and English UI dictionaries; Turkish is the fallback default. */
export const dictionaries: Record<Locale, Dictionary> = {
  tr: trDict,
  en: enDict,
}

export function t(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.tr[key] ?? key
}
