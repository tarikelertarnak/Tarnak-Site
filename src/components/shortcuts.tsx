'use client'

import { useEffect } from 'react'

/**
 * Klavye kısayolları (2026-10-05, kullanıcı isteği).
 *
 * Neden ayrı bileşen: kısayollar HER sayfada çalışmalı, ama bunları her
 * sayfa bileşenine `useEffect` + `addEventListener` olarak yazmak 19 route'a
 * kopyalanırdı ve biri güncellenince diğerleri bayat kalırdı. Tek bir kayıt
 * noktası, layout'a bir kez basılır.
 *
 * KURAL: `e.ctrlKey || e.metaKey` — Mac'te Cmd, PC'de Ctrl. Kullanıcı "ctrl+b"
 * dedi ama Mac'te Cmd+Kalın aynı tuştur; tek kod yazmak yerine ikisini birden
 * yakalıyoruz (bu bir kazanç, handikap değil).
 *
 * YANLİŞ TETİKLENME KORUMASI (asıl önemli kısım):
 *   1) `e.key` bir `<input>`/`<textarea>`/`contenteditable` içindeyken
 *      kısayol ÇALIŞMAZ. Aksi halde Ctrl+B "yazıyı kalınlaştır" demek —
 *      yazarken yanlışlıkla panel açılıp odak kaybolur, kullanıcının yazdığı
 *      metin kaybolur. Bu bir veri kaybı olurdu.
 *   2) Bir modal/drawer AÇIKSA yalnız `Escape` ve kendi kısayolu çalışır.
 *      Panel açıkken Ctrl+K arama açmak iki katman üst üste açar.
 *   3) `e.repeat` yok sayılır: tuşu basılı tutmak toggle'ı 20 kez tetikler.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  /*
    `target` `null`/`window`/`document` OLABILIR: olay `window.dispatchEvent`
    ile gelirse hedef atanmaz. `target as HTMLElement` cast'i bu durumda
    `undefined.tagName` okumasına yol acip listener'i sessizce ÖLDÜRÜYORDU
    (testte "kısayol hiç çalışmıyor" gibi görünüyordu, üretimde yalnız
    pencere hedefli yayınlarda olurdu). Bu yüzden gerçek HTMLElement
    kontrolü şart — `instanceof`, cast değil.
  */
  if (!(target instanceof HTMLElement))
    return false
  const el = target
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
    return true
  /*
    `contenteditable`: `el.isContentEditable` tarayıcıda doğru çalışır ama
    jsdom bu property'yi YANSITMAZ (hep `false` döner) ve attribute yalnızca
    `="true"` değeriyle bulunur. Bu yüzden ikisine de bakıyoruz:
    - gerçek tarayıcı → `isContentEditable`
    - jsdom / istisna  → `closest('[contenteditable]')`
    Aksi halde test ortamında kısayol "yazarken çalışıyor" gibi görünür ve
    gerçek koruma doğrulanamaz.
  */
  if (el.isContentEditable)
    return true
  return el.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

/** `[role="dialog"]` görünür var mı — açık modal/drawer tespiti. */
function hasOpenDialog(): boolean {
  const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]')
  return [...dialogs].some((d) => {
    // Gizli (DOM'da kalmış ama mount edilmemiş) olabilir: `display:none` veya
    // `visibility:hidden` kontrolü. `hidden` özniteliği de ekleniyor.
    if ((d as HTMLElement).hidden)
      return false
    const style = window.getComputedStyle(d)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

export interface ShortcutSpec {
  /** `ctrl` / `meta` / `shift` / `alt` — hangisi basılı olmalı. */
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  /** `event.key` değeri, küçük harf. */
  key: string
  /** Basıldığında çalışacak. */
  run: () => void
}

export function Shortcuts({ shortcuts }: { shortcuts: ShortcutSpec[] }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const wantsCtrl = shortcuts.some(s => s.ctrl)
      const wantsMeta = shortcuts.some(s => s.meta)

      // Sadece bizim tuşlarımızı dinle — yazarken hiçbiri çalışmaz.
      if (isTypingTarget(e.target))
        return

      // Üst üste katman: bir modal/drawer açıkken yeni kısayol çalıştırma.
      // (Escape gibi kendi handler'ı olan bileşenler zaten ayrı dinliyor.)
      const anyModalOpen = hasOpenDialog()

      for (const s of shortcuts) {
        if (s.key.toLowerCase() !== e.key.toLowerCase())
          continue
        // Modifier normalizasyonu: `KeyboardEvent.shiftKey` tarayıcıda hep
        // boolean, ama `fireEvent.keyDown` verilmediğinde `undefined` olabiliyor.
        // `undefined !== false` -> `true` çıkıp kısayolu sessizce düşürüyordu
        // (testte "Cmd+B çalışmıyor" gibi görünüyordu). `!!` ile zorla boolean.
        const shift = !!e.shiftKey
        const alt = !!e.altKey
        // Ctrl/MacCmd: tanımlıysa o basılı olmalı.
        if (s.ctrl && !e.ctrlKey && !e.metaKey)
          continue
        if (s.meta && !e.metaKey && !e.ctrlKey)
          continue
        if (shift !== !!s.shift)
          continue
        if (alt !== !!s.alt)
          continue
        if (e.repeat)
          continue
        if (anyModalOpen)
          continue

        e.preventDefault()
        s.run()
        return
      }
      void wantsCtrl
      void wantsMeta
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts])

  return null
}

/**
 * Global kısayol listesi.
 *
 * `export const` (statik) — `useEffect` bağımlılığı her render'da değişmesin
 * diye. React 19 `use()`/compiler zaten inline görecek, ama açık olmak daha
 * güvenli: liste module-scope'ta tek kez üretilir.
 *
 * Tuş seçimi gerekçeleri:
 *  • `B` — kullanıcının istediği yan panel aç/kapa. Sidebar zaten
 *    `sidebar:request-toggle` event'ini dinliyor (hamburger aynı işi yapıyor),
 *    yeni bir state yaratmıyoruz.
 *  • `K` — arama; `search-dialog.tsx` zaten `Ctrl+K` dinliyordu. Burada da
 *    tanımlı ki liste "hangi kısayol var" sorusunu tek yerden yanıtlasın.
 *    NOT: iki yer de dinlerse çift tetiklenme olur; `search-dialog` kendi
 *    listener'ını koruyoruz çünkü o bileşen modal'ı da yönetiyor, biz sadece
 *    "varsa" diyoruz. Çift açılma olmaz: modal zaten açıksa `SearchDialog`
 *    `open` state'ini görüp no-op.
 *  • `/` — ayarlar paneli. `settings-dropdown` `settings:open` event'ini
 *    dinliyor. `/` yazmak yazmaya başlamak için de kullanılır; bu yüzden
 *    `isTypingTarget` kontrolü şart (yoksa yazarken ayarlar açılır).
 *  • `↑`/`↓` — sayfa kaydırma. `ArrowUp`/`ArrowDown` tarayıcı yerleşik
 *    davranışıyla çakışır; `preventDefault` ile devralıyoruz. Sadece
 *    Ctrl/Cmd ile.
 */
export const GLOBAL_SHORTCUTS: ShortcutSpec[] = [
  {
    ctrl: true,
    key: 'b',
    run: () => window.dispatchEvent(new CustomEvent('sidebar:request-toggle')),
  },
  {
    ctrl: true,
    key: 'k',
    run: () => window.dispatchEvent(new CustomEvent('search:request-open')),
  },
  {
    ctrl: true,
    key: '/',
    run: () => window.dispatchEvent(new CustomEvent('settings:open')),
  },
  {
    ctrl: true,
    key: 'ArrowUp',
    run: () => window.scrollBy({ top: -400, behavior: 'smooth' }),
  },
  {
    ctrl: true,
    key: 'ArrowDown',
    run: () => window.scrollBy({ top: 400, behavior: 'smooth' }),
  },
]