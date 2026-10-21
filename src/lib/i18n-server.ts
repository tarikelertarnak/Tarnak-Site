import type { SiteContent } from '@/lib/content'
import type { Locale, LocalePref } from '@/lib/i18n'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { getContent } from '@/lib/content'
import {
  detectLocale,
  detectLocaleFromCountry,
  LOCALE_COOKIE,
  localeDirection,
  resolveLocale,
} from '@/lib/i18n'
import { localizeContent } from '@/lib/i18n-content-merge'

/**
 * Server-side locale: stored preference wins, otherwise location (country
 * from Cloudflare's CF-IPCountry header) → accept-language → English.
 *
 * `cache()` ile sarıldı: sayfa hem kendi `getLocale()` çağrısını yapıyor hem de
 * `getLocalizedContent()` içinden bir kez daha çağırıyordu. React cache aynı
 * istek içinde ikinci çağrıyı bedelsiz yapar (ve `cookies()`/`headers()`
 * dinamik okuması bir kez çalışır).
 */
export const getLocale = cache(async (): Promise<Locale> => {
  let pref: LocalePref | undefined
  let lang: string | undefined
  let country: string | undefined
  try {
    pref = (await cookies()).get(LOCALE_COOKIE)?.value as LocalePref | undefined
    country = (await headers()).get('cf-ipcountry') ?? undefined
    lang = (await headers()).get('accept-language') ?? undefined
  }
  catch {
    // static export / prerender: no cookie or header, use default
  }
  // Location first (reliable at the edge), then browser language preference.
  return resolveLocale(pref, detectLocaleFromCountry(country) ?? detectLocale(lang))
})

/** Get the text direction for the current locale. */
export function getLocaleDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeDirection(locale)
}

/** Server components: localized content for the current locale. */
export async function getLocalizedContent(): Promise<SiteContent> {
  const content = await getContent()
  return localizeContent(content, await getLocale())
}

/**
 * Build-safe variants: NO cookies()/headers().
 *
 * 2026-10-02 Cloudflare 1102 fix. `getLocale()` calls cookies()/headers(), which
 * makes Next mark every route that touches it as *dynamic* — so `revalidate = 300`
 * is silently ignored and every request does a full SSR of a 13 MB handler, which
 * blows the 10 ms Workers Free CPU budget (intermittent 503).
 *
 * Using these in the root layout + homepage lets Next prerender them at build time
 * and serve from the Pages CDN instead. Trade-off: SSR emits a FIXED locale;
 * the client corrects lang/dir/content after hydration (brief flash for
 * visitors whose language differs). Admin routes stay dynamic — they read
 * cookies themselves.
 *
 * 2026-10-04 — `resolveLocale(undefined, undefined)` yerine SABIT 'tr':
 *
 * Sorun: `resolveLocale` son çare olarak 'en' donuyordu. Yani build'de
 * prerender edilen 7 public sayfanin hepsi `<html lang="en">` basiyordu ve
 * `/about`, `/credits`, `/donate` Ingilizce title/description uretiyordu.
 * Arama motorlari bunu "Ingilizce site" olarak okuyor; kullanici da siteyi
 * Turkce yazilarla aramak istiyor ("tarik eler" + Turkce sorgular).
 *
 * Neden 'tr' sabit: Turkce BASE icerik (overlay yok), `data/content.json`
 * Turkce yazildi, JSON-LD `inLanguage: tr`, sitemap ve marka Turkce. Yani
 * prerender edilen sayfa zaten Turkce olmali. Ziyaretcinin tarayici dili
 * hydration sonrasi istemci tarafinda zaten uygulanir — bu degisiklik
 * fonksiyonu degil, sadece ilk boyanin ve SEO sinyallerinin dili duzeltir.
 */
export const getStaticLocale = cache(async (): Promise<Locale> => 'tr')

export async function getStaticLocalizedContent(): Promise<SiteContent> {
  const content = await getContent()
  return localizeContent(content, await getStaticLocale())
}
