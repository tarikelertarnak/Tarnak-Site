import type { SiteContent } from '@/lib/content'
import type { Locale } from '@/lib/i18n'
import { deContentOverlay } from '@/lib/i18n-content-de'
import { enContentOverlay } from '@/lib/i18n-content-en'
import { esContentOverlay } from '@/lib/i18n-content-es'
import { frContentOverlay } from '@/lib/i18n-content-fr'
import { jaContentOverlay } from '@/lib/i18n-content-ja'
import { ptContentOverlay } from '@/lib/i18n-content-pt'
import { ruContentOverlay } from '@/lib/i18n-content-ru'

/**
 * İçerik yerelleştirmesi — SUNUCU ve İSTEMCİ ortak (2026-10-21).
 *
 * Neden ayrı dosya: kök layout `force-static` olduğu için sunucu HTML'i her
 * zaman TÜRKÇE içerik basar (`getStaticLocale()` sabit 'tr'). Footer gibi
 * istemci bileşenleri `content.hero.tagline`'ı sunucudan olduğu gibi alınca
 * EN gezinmede Türkçe metin görünüyordu. Overlay'i istemcide de uygulayabilmek
 * için harita ve birleştirme mantığı buraya taşındı; `i18n-server.ts` aynı
 * fonksiyonu kullanır (tek kaynak).
 */

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Per-locale content overlays. Turkish needs no overlay (base content). */
export const CONTENT_OVERLAYS: Partial<Record<Locale, DeepPartial<SiteContent>>> = {
  en: enContentOverlay,
  es: esContentOverlay,
  de: deContentOverlay,
  fr: frContentOverlay,
  ja: jaContentOverlay,
  pt: ptContentOverlay,
  ru: ruContentOverlay,
}

/** Deep-merge an overlay over the base content (only provided fields change). */
export function mergeContent<T extends object>(
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

/** Content localization — Turkish base content, others via overlay. */
export function localizeContent(content: SiteContent, locale: Locale): SiteContent {
  const overlay = CONTENT_OVERLAYS[locale]
  return overlay ? mergeContent(content, overlay) : content
}
