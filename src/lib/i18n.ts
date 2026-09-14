/**
 * i18n — 26 dil (Turkish default) + Auto detection.
 *
 * detectLocale() reads the browser/accept-language; resolveLocale() combines
 * the user preference (cookie) with the detected language; both fall back to
 * Turkish. The site content stays Turkish-first (data/content.json); each
 * locale gets a content overlay (src/lib/i18n-content-*.ts) and a UI
 * dictionary (extra dicts in src/i18n/extra.ts).
 */

/* ------------------------------------------------------------------ */
/* UI dictionary — static strings used by components                   */
/* ------------------------------------------------------------------ */

import enDict from '@/i18n/en.json'
import trDict from '@/i18n/tr.json'
import { extraDicts } from '@/i18n/extra'

export type Locale =
  | 'tr' | 'en' | 'es' | 'de' | 'ja' | 'fr' | 'pt' | 'ru' | 'it'
  | 'zh' | 'nl' | 'pl' | 'ko' | 'ar' | 'id' | 'vi' | 'fa' | 'uk'
  | 'th' | 'cs' | 'hu' | 'ro' | 'sv' | 'el' | 'he'

export type LocalePref = 'auto' | Locale
export const LOCALE_COOKIE = 'site-locale'

/** All selectable locales (Auto is handled separately as a pref). */
export const LOCALES: readonly Locale[] = [
  'tr', 'en', 'es', 'de', 'ja', 'fr', 'pt', 'ru', 'it', 'zh', 'nl', 'pl',
  'ko', 'ar', 'id', 'vi', 'fa', 'uk', 'th', 'cs', 'hu', 'ro', 'sv', 'el',
  'he',
]

/** Right-to-left locales (Arabic, Persian, Hebrew). */
export const RTL_LOCALES: ReadonlySet<string> = new Set(['ar', 'fa', 'he'])

/** accept-language base (e.g. `pt-BR` -> `pt`, `zh-Hans` -> `zh`) → Locale. */
const LANG_TABLE: Record<string, Locale> = {
  tr: 'tr', en: 'en', es: 'es', de: 'de', ja: 'ja', fr: 'fr', pt: 'pt',
  ru: 'ru', it: 'it', zh: 'zh', nl: 'nl', pl: 'pl', ko: 'ko', ar: 'ar',
  id: 'id', vi: 'vi', fa: 'fa', uk: 'uk', th: 'th', cs: 'cs', hu: 'hu',
  ro: 'ro', sv: 'sv', el: 'el', he: 'he',
}

function cleanLocale(s?: string | null): Locale {
  if (!s)
    return 'tr'
  const base = s.toLowerCase().split(/[_-]/)[0]
  return LANG_TABLE[base] ?? 'tr'
}

/** Detect from a language tag (`navigator.language` / `accept-language`). */
export function detectLocale(lang?: string): Locale {
  return cleanLocale(lang)
}

/** Combine stored preference with detection (works on server and client). */
export function resolveLocale(pref?: LocalePref, detected?: Locale): Locale {
  if (pref && pref !== 'auto' && LOCALES.includes(pref as Locale)) {
    return pref as Locale
  }
  return detected ?? 'tr'
}

/** Direction of a locale ('rtl' for Arabic/Persian/Hebrew). */
export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

type Dictionary = Record<string, string>

/**
 * Per-locale UI dictionaries. `tr` is the fallback default; `extra`
 * provides the full translations for every other locale (en included via
 * en.json). Missing keys fall back to Turkish.
 */
export const dictionaries: Partial<Record<Locale, Dictionary>> = {
  tr: trDict,
  en: enDict,
  ...extraDicts,
}

export function t(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? trDict[key as keyof typeof trDict] ?? key
}