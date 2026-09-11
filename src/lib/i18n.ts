/**
 * Single-locale i18n — the site is Turkish-only.
 *
 * Runtime always resolves to 'tr' (see detectLocale/resolveLocale below).
 * The literal 'en' stays in the type so legacy `locale === 'en'` branches
 * keep compiling; they are dead code and always take the Turkish path.
 */

export type Locale = 'tr' | 'en'
export type LocalePref = 'auto' | Locale
export const LOCALE_COOKIE = 'site-locale'

/** Single-locale site: browser/accept-language is ignored, always Turkish. */
export function detectLocale(_lang?: string): Locale {
  return 'tr'
}

export function resolveLocale(_pref?: LocalePref, _detected?: Locale): Locale {
  return 'tr'
}

/* ------------------------------------------------------------------ */
/* UI dictionary — static strings used by components                   */
/* ------------------------------------------------------------------ */

import trDict from '@/i18n/tr.json'

type Dictionary = Record<string, string>

/** Turkish is the only mounted dictionary; `en` never resolves at runtime. */
export const dictionaries: Partial<Record<Locale, Dictionary>> = { tr: trDict }

export function t(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? key
}