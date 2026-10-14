'use client'

import { useEffect, useRef } from 'react'

/**
 * Emoji seçici — `emoji-picker-element` özel elementi (2026-10-12 kullanıcı
 * isteği: eski 16 emojili şerit yerine aramalı, kaydırılabilir seçici).
 *
 * Kütüphane YALNIZ istemcide yüklenir: `import()` effect içinde çağrılır, çünkü
 * modül özel element tanımlar (`customElements`) ve SSR'da bu API yoktur.
 * Element de `document.createElement` ile üretilir — React JSX'inde `emoji-picker`
 * etiketi tanımlı olmadığı için tip çakışması da böylece doğmaz.
 *
 * Boyut/kenarlık/tema `globals.css` → `.emoji-picker-host emoji-picker`
 * bloğundan gelir (kütüphanenin `:host{width:min-content}` kuralı orada ezilir,
 * yoksa seçici ortada dar bir kutu olarak kalıyordu).
 *
 * ARAMA DİLİ (2026-10-13 kullanıcı isteği: "arama sadece İngilizce çalışıyor"):
 * kütüphane aramayı YALNIZ `dataSource` JSON'undaki etiketlerle yapar; API'sinde
 * veri enjeksiyonu yok (`picker.d.ts` → yalnız `dataSource`/`locale`/`i18n`).
 *   · Resmî paket 5 dil yayınlıyor → CDN'den.
 *   · Diğer diller için İngilizce taban + CLDR çevirisi birleştirilip YEREL dosya
 *     üretildi (`scripts/build-emoji-data.mjs` → `public/emoji-data/<dil>.json`).
 *     Böylece o dilde hem yerel ("kalp") hem İngilizce ("heart") arama çalışır.
 *   · Yerel dosya silinmiş/üretilmemişse İngilizce veriye düşülür + tek satır
 *     konsol uyarısı verilir (seçici hata ekranı göstermez).
 */

/** Resmî paketin yayınladığı veri dilleri (2026-10-13 ölçüldü: tr/de/es/pt/ar 404). */
const CDN_DATA_LOCALES = new Set(['en', 'fr', 'ja', 'ru', 'zh'])
/** `scripts/build-emoji-data.mjs` ile üretilmiş yerel veri dosyaları. */
const LOCAL_DATA_LOCALES = new Set(['tr', 'de', 'es', 'pt', 'ar'])
const DATA_BASE = 'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1'

/** Arayüz çevirileri (kütüphaneyle gelenler): site dili → gecikmeli import. */
const I18N: Record<string, () => Promise<{ default: unknown }>> = {
  ar: () => import('emoji-picker-element/i18n/ar'),
  de: () => import('emoji-picker-element/i18n/de'),
  en: () => import('emoji-picker-element/i18n/en'),
  es: () => import('emoji-picker-element/i18n/es'),
  fr: () => import('emoji-picker-element/i18n/fr'),
  it: () => import('emoji-picker-element/i18n/it'),
  ja: () => import('emoji-picker-element/i18n/ja'),
  nl: () => import('emoji-picker-element/i18n/nl'),
  pl: () => import('emoji-picker-element/i18n/pl'),
  pt: () => import('emoji-picker-element/i18n/pt_BR'),
  ru: () => import('emoji-picker-element/i18n/ru_RU'),
  tr: () => import('emoji-picker-element/i18n/tr'),
  zh: () => import('emoji-picker-element/i18n/zh_CN'),
}

/** Yerel dosyanın varlığı dil başına BİR kez ölçülür (oturum boyunca hatırlanır). */
const localDataProbe = new Map<string, Promise<boolean>>()

function hasLocalData(code: string) {
  let probe = localDataProbe.get(code)
  if (!probe) {
    probe = fetch(`/emoji-data/${code}.json`, { method: 'HEAD' })
      .then(res => res.ok)
      .catch(() => false)
    localDataProbe.set(code, probe)
  }
  return probe
}

/** Kullanılacak veri adresi + o verinin dili (IndexedDB deposu dile göre ayrılır). */
async function resolveDataSource(code: string): Promise<{ dataSource: string, dataLocale: string }> {
  if (LOCAL_DATA_LOCALES.has(code) && await hasLocalData(code)) {
    return { dataSource: `/emoji-data/${code}.json`, dataLocale: code }
  }
  if (LOCAL_DATA_LOCALES.has(code)) {
    console.warn(
      `[emoji] ${code} için yerel veri yok — İngilizce veriyle devam. `
      + `Üretmek için: node scripts/build-emoji-data.mjs ${code}`,
    )
  }
  if (code !== 'en' && CDN_DATA_LOCALES.has(code)) {
    return { dataSource: `${DATA_BASE}/${code}/emojibase/data.json`, dataLocale: code }
  }
  return { dataSource: `${DATA_BASE}/en/emojibase/data.json`, dataLocale: 'en' }
}

type PickerElement = HTMLElement & {
  i18n?: unknown
  locale: string
  dataSource: string
}

export interface EmojiPickerProps {
  /** Sitenin seçili dili (2 harfli: 'tr', 'en' …). */
  locale: string
  /** Seçilen emoji — çağıran imlecin olduğu yere ekler. */
  onPick: (unicode: string) => void
  /** Dışa tıklama veya Esc. */
  onClose: () => void
}

export function EmojiPicker({ locale, onPick, onClose }: EmojiPickerProps) {
  const host = useRef<HTMLDivElement>(null)
  // Callback'ler ref'te: effect kimliği değişsin diye yeniden kurulmaz.
  const pick = useRef(onPick)
  const close = useRef(onClose)
  pick.current = onPick
  close.current = onClose

  useEffect(() => {
    const node = host.current
    if (!node) {
      return
    }
    let cancelled = false
    void (async () => {
      await import('emoji-picker-element')
      const code = (locale || 'en').slice(0, 2).toLowerCase()
      const { dataSource, dataLocale } = await resolveDataSource(code)
      // Çeviri de veriyle PARALEL yüklenir (aynı anda tek yuvarlak yol).
      const loadI18n = I18N[code] ?? I18N.en
      const [i18n] = await Promise.all([
        loadI18n().then(m => m.default).catch(() => undefined),
      ])
      if (cancelled || !host.current) {
        return
      }
      const picker = document.createElement('emoji-picker') as PickerElement
      picker.setAttribute('class', 'dark')
      picker.locale = dataLocale
      picker.dataSource = dataSource
      if (i18n) {
        picker.i18n = i18n
      }
      picker.addEventListener('emoji-click', (e) => {
        const unicode = (e as CustomEvent<{ unicode?: string }>).detail?.unicode
        if (unicode) {
          pick.current(unicode)
        }
      })
      host.current.replaceChildren(picker)
    })()
    return () => {
      cancelled = true
      node.replaceChildren()
    }
  }, [locale])

  /* Dışa tıklama + Esc ile kapanır. Kapsam kabın TAMAMI (yazma alanı + seçici):
     yazma alanına tıklamak seçiciyi kapatmaz, dışarı (mesajlar) tıklamak kapatır. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close.current()
      }
    }
    const onDown = (e: MouseEvent) => {
      const wrap = host.current?.parentElement
      if (!wrap || !wrap.contains(e.target as Node)) {
        close.current()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  /* Genişlik yazma çubuğuyla AYNI: kap `w-full`, kütüphanenin
     `:host{width:min-content}` kuralı globals.css'te `width:100%` ile ezilir. */
  return (
    <div
      ref={host}
      className="emoji-picker-host mt-2 w-full overflow-hidden rounded-xl border border-surface-border bg-surface-1"
    />
  )
}
