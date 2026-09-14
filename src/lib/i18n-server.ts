import type { SiteContent } from '@/lib/content'
import type { Locale, LocalePref } from '@/lib/i18n'
import { cookies, headers } from 'next/headers'
import { getContent } from '@/lib/content'
import {
  detectLocale,
  LOCALE_COOKIE,
  resolveLocale,
  localeDirection,
} from '@/lib/i18n'
import { enContentOverlay } from '@/lib/i18n-content-en'
import { esContentOverlay } from '@/lib/i18n-content-es'
import { deContentOverlay } from '@/lib/i18n-content-de'
import { frContentOverlay } from '@/lib/i18n-content-fr'
import { jaContentOverlay } from '@/lib/i18n-content-ja'
import { ptContentOverlay } from '@/lib/i18n-content-pt'
import { ruContentOverlay } from '@/lib/i18n-content-ru'

/**
 * Server-side locale: stored preference wins, otherwise accept-language
 * (Turkish default).
 */
export async function getLocale(): Promise<Locale> {
  let pref: LocalePref | undefined
  let lang: string | undefined
  try {
    pref = (await cookies()).get(LOCALE_COOKIE)?.value as LocalePref | undefined
    lang = (await headers()).get('accept-language') ?? undefined
  }
  catch {
    // static export / prerender: no cookie or header, use default
  }
  return resolveLocale(pref, detectLocale(lang))
}

/** Get the text direction for the current locale. */
export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeDirection(locale)
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Deep-merge an overlay over the base content (only provided fields change). */
function mergeContent<T extends object>(
  base: T,
  patch?: DeepPartial<T>,
): T {
  if (!patch)
    return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const baseValue = (base as Record<string, unknown>)[key]
    out[key]
      = value
        && typeof value === 'object'
        && !Array.isArray(value)
        && baseValue
        && typeof baseValue === 'object'
        ? mergeContent(
            baseValue as Record<string, unknown>,
            value as DeepPartial<Record<string, unknown>>,
          )
        : value
  }
  return out as T
}

/** Per-locale content overlays. Turkish needs no overlay (base content). */
const contentOverlays: Partial<Record<Locale, DeepPartial<SiteContent>>> = {
  en: enContentOverlay,
  es: esContentOverlay,
  de: deContentOverlay,
  fr: frContentOverlay,
  ja: jaContentOverlay,
  pt: ptContentOverlay,
  ru: ruContentOverlay,
}

/** Content localization — Turkish base content, others via overlay. */
export function localizeContent(content: SiteContent, locale: Locale): SiteContent {
  const overlay = contentOverlays[locale]
  return overlay ? mergeContent(content, overlay) : content
}

/** Server components: localized content for the current locale. */
export async function getLocalizedContent(): Promise<SiteContent> {
  const content = await getContent()
  return localizeContent(content, await getLocale())
}