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
  RTL_LOCALES,
  t,
} from '@/lib/i18n'
import { localizeContent } from '@/lib/i18n-content-merge'

interface LocaleContextValue {
  locale: Locale
  pref: LocalePref
  detected: Locale
  setPref: (pref: LocalePref) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * ADMIN SÖZLÜK ÇEVİRİLERİ (2026-10-30).
 *
 * `content.textOverrides[dil]` içindeki `dict:` anahtarları burada, aktif dil
 * için `dict:blog.sub` → `blog.sub` biçimine indirilir; `useT()` sözlük
 * değerinin ÜZERİNE bindirir. Ayrı context: `pref`/`locale` gibi gezinme
 * durumunu kirletmeden yalnız çeviri katmanını taşıyor.
 */
const DictOverridesContext = createContext<Record<string, string> | null>(null)

/**
 * Bilingual provider — English default, Turkish via translation layer.
 * setPref persists the choice to the `site-locale` cookie and refreshes the
 * page so server components re-render with the new locale.
 */
export function LocaleProvider({
  children,
  detectedLocale,
  textOverrides,
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
  /**
   * Admin'in girdiği dile özel sözlük çevirileri (2026-10-30) —
   * `content.textOverrides`. `dict:` önekli anahtarlar `useT()` tarafından
   * uygulanır; `content:` anahtarları sunucuda `localizeContent` içinde.
   */
  textOverrides?: Record<string, Record<string, string>>
}) {
  const router = useRouter()
  const [pref, setPrefState] = useState<LocalePref>('auto')

  /**
   * Tarayıcı dilinden çözülen dil — SADECE mount sonrası dolar.
   *
   * NEDEN `null` İLE BAŞLIYOR (2026-10-30, gerçek hata): eskiden bu değer
   * render sırasında `navigator.language`'dan hesaplanıyordu. Sunucu ise
   * `force-static` layout yüzünden her zaman sabit 'tr' HTML basıyor. Sonuç:
   * Türkçe olmayan tarayıcılarda sunucu "Şu An" basıp istemci "Now" çiziyordu
   * → React **hydration mismatch** ("server rendered text didn't match the
   * client") her /now, /gizlilik, /kvkk açılışında konsola düşüyordu
   * (e2e `personal-pages.spec.ts` yakaladı).
   *
   * Kural: İLK render sunucunun HTML'i ile BİREBİR aynı olmalı. Tarayıcı
   * dili ancak effect içinde okunur; dil bir kare sonra değişir (aynı desen
   * cerez tercihi için de kullanılıyor).
   */
  const [browserLocale, setBrowserLocale] = useState<Locale | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.language)
      return
    let next = detectLocale(navigator.language)
    try {
      const region = (navigator.language.split('-')[1] || '').toUpperCase()
      if (region)
        next = detectLocaleFromCountry(region) ?? next
    }
    catch {
      /* locale unavailable — keep browser-language result */
    }
    setBrowserLocale(next)
  }, [])

  // Hydration-safe: bootstrap from cookie, then keep in sync with the provider.
  // ⚠️ Burada 25 dilin TAMAMI kabul edilmeli. Eskiden yalnizca tr|en|auto
  // kabul ediliyordu; combobox 25 dil sundugu icin diger secimler cerezde
  // dogru duruyor ama yenilemede `auto`ya dusup KAYBOLUYORDU.
  useEffect(() => {
    const fromCookie = (document.cookie.match(/(?:^|;\s*)site-locale=([^;]*)/) || [])[1]
    setPrefState(isLocalePref(fromCookie) ? fromCookie : 'auto')
  }, [])

  const value = useMemo<LocaleContextValue>(() => {
    // İlk render'da (hydration) sunucunun kararı geçerli — HTML birebir eşleşir.
    // Mount sonrası tarayıcı dili varsa o kazanır, yoksa sunucu kararı kalır.
    const detected: Locale = browserLocale ?? detectedLocale ?? 'en'
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
  }, [browserLocale, detectedLocale, pref, router])

  /*
    `<html lang>`/`<html dir>` senkronu (2026-10-20).

    KÖK NEDEN: kök layout `force-static` olduğu için sunucu HTML'i HER ZAMAN
    `lang="tr"` basar (`getStaticLocale()` sabit 'tr' — bkz. i18n-server.ts
    yorumu). İstemci metni EN'e çevirse bile `lang` "tr" kalıyordu.

    Neden ÖNEMLİ — somut, canlıda ölçüldü: CSS `text-transform: uppercase`
    İLE `lang="tr"` birleşince tarayıcı TÜRKÇE büyük-harf kuralını uygular:
    `i` → `İ`. `/donate` tablo başlığı EN modda "LİNK" çıkıyordu (doğrusu
    "LINK"). Yani yalnız kozmetik değil: ekran okuyucu telaffuzu, tireleme
    ve `lang` tabanlı tüm CSS davranışı yanlış dilde çalışıyordu.

    Ayrıca `dir` RTL dillerde (ar/fa/he) kritik — sunucu "ltr" basıyor.
    Yalnız DOM niteliği yazılır, içerik/yerleşim değişmez → CLS yok.
  */
  useEffect(() => {
    const root = document.documentElement
    root.lang = value.locale
    root.dir = RTL_LOCALES.has(value.locale) ? 'rtl' : 'ltr'
  }, [value.locale])

  /**
   * Aktif dil için admin çevirileri (2026-10-30).
   *
   * Yalnız `dict:` anahtarları buraya girer ve önek atılır; sözlük anahtarları
   * noktalı düz metindir (`blog.sub`). Dil değişince memo yeniden kurulur.
   */
  const dictOverrides = useMemo(() => {
    const allBucket = textOverrides?.all
    const forLocale = textOverrides?.[value.locale]
    if (!allBucket && !forLocale)
      return null
    const out: Record<string, string> = {}
    for (const bucket of [allBucket, forLocale]) {
      if (!bucket)
        continue
      for (const [key, val] of Object.entries(bucket)) {
        if (!key.startsWith('dict:') || typeof val !== 'string')
          continue
        out[key.slice('dict:'.length)] = val
      }
    }
    return Object.keys(out).length ? out : null
  }, [textOverrides, value.locale])

  return (
    <LocaleContext.Provider value={value}>
      <DictOverridesContext.Provider value={dictOverrides}>
        {children}
      </DictOverridesContext.Provider>
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

/**
 * Look up static UI strings for the active locale.
 *
 * `t` MEMOIZE EDİLİR (2026-10-11 ölçümü). Önce her render'da yeni bir `t`
 * üretiyordu; `useEffect(..., [t])` kullanan her bileşen (chat dahil) her
 * render'da temizlenip yeniden başlıyor, uçuştaki istek/yanıt `cancelled`
 * bayrağına takılıp sessizce düşüyordu. Kimlik artık yalnızca `locale`
 * değiştiğinde değişir.
 */
export function useT() {
  const { locale } = useLocale()
  const overrides = useContext(DictOverridesContext)
  return useMemo(
    () => ({
      t: (key: string, vars?: Record<string, string | number>) => {
        const custom = overrides?.[key]
        if (typeof custom === 'string' && custom.trim())
          return custom
        return t(locale, key, vars)
      },
      locale,
    }),
    [locale, overrides],
  )
}

/**
 * İçerik VERİSİNİ aktif dile yerelleştirir (2026-10-21).
 *
 * KÖK NEDEN: kök layout `force-static` olduğu için sunucu HTML'i her zaman
 * Türkçe içerik basar (`getStaticLocale()` sabit 'tr'). Footer gibi istemci
 * bileşenleri `content.hero.tagline`'ı sunucudan olduğu gibi alınca EN
 * gezinmede Türkçe metin görünüyordu. Sunucudaki `getStaticLocalizedContent`
 * ile AYNI overlay'i istemcide uygular → tek kaynak, iki taraf.
 */
export function useLocalizedContent<T extends object>(content: T): T {
  const { locale } = useLocale()
  return useMemo(
    () => localizeContent(content as never, locale) as T,
    [content, locale],
  )
}
