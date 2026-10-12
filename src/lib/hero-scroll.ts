/**
 * Hero "fare" (scroll) düğmesinin About bölümüne kaydırma hesabı.
 *
 * NEDEN `scrollIntoView` DEĞİL (2026-10-12, şikâyet: "çok az gidiyor, üstte
 * siyah boş kısım kalıyor"):
 *   1) `#about` çapası, `Section`'ın ürettiği `absolute -top-20 sm:-top-24`
 *      bir div — bölümün 80–96px YUKARISINDA durur; ayrıca `[id]` için
 *      `scroll-margin-top: 88px` (globals.css) var. İkisi üst üste binince
 *      bölüm üst kenarı görünümün ~168px ALTINDA kalıyordu.
 *   2) `html, body { overflow-x: hidden; }` + `scrollIntoView` Chrome/WebKit'te
 *      pencereyi KISA kaydırır (bilinen davranış) → siyah boş şerit.
 * Bunun yerine hedefin gerçek konumu hesaplanıp `window.scrollTo` ile başlık
 * sabit üst çubuğun (48–56px) hemen altına getirilir.
 */
export const HERO_SCROLL_OFFSET = 80

export function heroScrollTop(section: HTMLElement | null | undefined): number {
  if (!section)
    return 0
  // Başlık (h2) hedef: çerçeveli kartın üst kenarını da üst çubuğun dibine
  // getirir (başlık = kart içi ilk eleman, kart dolgusu 16–32px).
  const target = section.querySelector<HTMLElement>('h2') ?? section
  return Math.max(
    target.getBoundingClientRect().top + window.scrollY - HERO_SCROLL_OFFSET,
    0,
  )
}
