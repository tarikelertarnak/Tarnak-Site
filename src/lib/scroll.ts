import { HERO_SCROLL_OFFSET } from '@/lib/hero-scroll'

/**
 * Kaydırmanın TEK yardımcısı (2026-10-17).
 *
 * Neden: aynı iş üç ayrı biçimde yapılıyordu — `window.scrollTo({top: 0,
 * behavior: 'smooth'})` (4 dosyada kopyala-yapıştır), `scrollIntoView({behavior:
 * 'smooth'})` (başlık altı boşluğu YOK) ve `heroScrollTop()` (doğru hesap ama
 * yalnız hero'da). Sonuç: bazı geçişler yumuşak, bazıları ani; bazı hedefler
 * üst çubuğun altına yapışıyordu. Artık ofset ve hareket tercihi tek yerde.
 *
 * Kural: sayfa içi (belge) kaydırmalar buradan geçer. KAYDIRMA KAPSAYICISI
 * içindeki kaydırmalar (sohbet mesaj alanı, admin sekme şeridi, combobox
 * listesi) BİLEREK buraya bağlanmaz — onlar kendi elemanlarını kaydırır ve
 * sayfayı oynatmamalıdır (bkz. chat.test.ts regresyonu).
 */

/** Üst çubuğun yüksekliği (px) — CSS `--header-height` ile AYNI olmalı. */
export const HEADER_HEIGHT = 80

/**
 * Üst çubuk ile hedef arasında kalan nefes payı (px).
 * `hero-scroll.ts`'teki `HERO_SCROLL_GAP` ile aynı değer; tekrar yazmamak
 * için oradan okunur (CSS `--scroll-offset` da bu değeri taşır).
 */
export const SCROLL_GAP = HERO_SCROLL_OFFSET - HEADER_HEIGHT

/**
 * Hedefin üstünden çıkarılacak toplam mesafe: 80 + 16 = 96px.
 * CSS tarafı: `[id] { scroll-margin-top: calc(var(--header-height) +
 * var(--scroll-offset)) }` — aynı toplam.
 */
export const SCROLL_OFFSET = HERO_SCROLL_OFFSET

/**
 * Hareket azaltma tercihi: işletim sistemi ayarı (`prefers-reduced-motion`)
 * VEYA site içi "Animasyonları azalt" anahtarı (`data-reduce-motion`).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined')
    return true
  if (document.documentElement.dataset.reduceMotion === 'true')
    return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Verilen dikey konuma kaydırır — yumuşak; tercih varsa ANINDA. */
export function scrollToY(top: number): void {
  if (typeof window === 'undefined')
    return
  window.scrollTo({
    top: Math.max(0, Math.round(top)),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

/** Sayfanın en başına (yukarı çık, logo, "Başa Dön"). */
export function scrollToTop(): void {
  scrollToY(0)
}

/** Mevcut konumdan `delta` kadar kaydırır (Ctrl+↑/↓ kısayolları). */
export function scrollByY(delta: number): void {
  if (typeof window === 'undefined')
    return
  const y = window.scrollY + delta
  // Negatife düşmeyi kırp; tarayıcı zaten 0'da durur ama konum hesabı
  // `smooth` sırasında kayabilir, baştan doğru değeri verelim.
  scrollToY(Math.max(0, y))
}

/**
 * Elemanı üst çubuğun altına getirir.
 *
 * `scrollIntoView` YERİNE konum hesabı: `scrollIntoView` belge
 * kaydırılabilirse ATALARIN HEPSİNİ kaydırır ve `overflow-x: hidden` ile
 * birlikte Chrome/WebKit'te eksik kaydırıyor (bkz. hero-scroll.ts gerekçesi).
 */
export function scrollToElement(
  el: HTMLElement | null | undefined,
  offset = SCROLL_OFFSET,
): void {
  if (!el || typeof window === 'undefined')
    return
  scrollToY(el.getBoundingClientRect().top + window.scrollY - offset)
}
