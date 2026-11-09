/**
 * Panel zemini — TEK kaynak.
 *
 * 2026-10-06 (kullanıcı): "ayarlar arka planı yanlış, sol yan panel ile
 * aynı olsun". Sol menü `bg-[#0a0a0e]` (sabit koyu), ayarlar çekmecesi
 * ise `bg-background` (tema değiştikçe değişen token) kullanıyordu — iki
 * panel aynı anda açık olduğunda zemin farklı görünüyordu.
 *
 * Burada tek sabit var; iki bileşen de BUNU kullanıyor, böylece biri
 * değişirse diğeri de otomatik değişir (ayrışma tekrar edemez).
 *
 * Neden hazır tema token'ı değil: `bg-surface-*` ailesi sayfa kartları için
 * (açık temada gri / koyu temada koyu). Yan menü ve ayarlar çekmecesi ise
 * her iki temada da koyu kalması istenen "kabuk" paneller — bu yüzden
 * değer sabit.
 */

/** Yan menü + ayarlar çekmecesi zemini. */
export const PANEL_SURFACE = 'bg-[#0a0a0e]'

/** Bu panellerdeki ince ayırıcı çizgiler. */
export const PANEL_SURFACE_BORDER = 'border-white/5'
