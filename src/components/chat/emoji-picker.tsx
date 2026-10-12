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
 * Tema: `dark` sınıfı zorlanır ve renkler sitenin jetonlarından verilir
 * (`globals.css` → `.emoji-picker-host emoji-picker`).
 */

/**
 * Emoji VERİSİ (`emoji-picker-element-data` CDN'i) yalnız bu dillerde yayınlanır;
 * TR dahil diğerleri için İngilizce veri kullanılır (paket tarafında veri yok).
 * Arayüz etiketleri ise `I18N` ile site diline çevrilir.
 * shortcut: TR emoji etiketi yok — paket yayınlarsa DATA_LOCALES'e 'tr' ekle.
 */
const DATA_LOCALES = new Set(['en', 'fr', 'ja', 'ru', 'zh'])
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
  zh: () => import('emoji-picker-element/i18n/zh_CN'),
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
      if (cancelled || !host.current) {
        return
      }
      const code = (locale || 'en').slice(0, 2).toLowerCase()
      const dataLocale = DATA_LOCALES.has(code) ? code : 'en'
      const picker = document.createElement('emoji-picker') as PickerElement
      picker.setAttribute('class', 'dark')
      // Yükseklik sabit (kütüphanenin kendi kaydırması bu kutuda çalışır) ama
      // kısa ekranlarda taşmasın: en fazla ekranın %45'i.
      picker.style.height = 'min(350px, 45svh)'
      picker.style.width = '100%'
      picker.locale = dataLocale
      picker.dataSource = `${DATA_BASE}/${dataLocale}/emojibase/data.json`
      const loadI18n = I18N[code]
      if (loadI18n) {
        try {
          picker.i18n = (await loadI18n()).default
        }
        catch {
          // Çeviri yüklenemezse kütüphanenin İngilizce etiketleri kalır.
        }
      }
      if (cancelled || !host.current) {
        return
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

  return (
    <div
      ref={host}
      className="emoji-picker-host mx-auto mt-2 w-full max-w-[350px] overflow-hidden rounded-xl border border-surface-border bg-surface-1"
    />
  )
}
