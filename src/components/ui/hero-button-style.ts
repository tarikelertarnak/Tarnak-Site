/**
 * Hero buton satırı — ORTAK stil sabitleri (2026-10-05).
 *
 * SORUN: `CvPicker`/`SplitButton` kendi geometrisini ayrı sabitlerden
 * kuruyordu, `Button` (LobeButton) ise kendi `rounded`/padding'ini
 * dayatıyordu. Sonuç canlıda ölçüldü:
 *
 *   | özellik   | Projeler/İletişim/Blog/Hakkımda/Sohbet | CV     |
 *   |-----------|---------------------------------------|--------|
 *   | yükseklik | 40px                                  | 40px ✓ |
 *   | radius    | 6px                                   | 0px ✗  |
 *   | border    | 1px                                   | 0px ✗  |
 *   | padding-x | 14px                                  | 12px ✗ |
 *   | font-size | 13px                                  | 14px ✗ |
 *   | gap       | 6px                                   | 8px  ✗ |
 *
 * Kullanıcının "daha yüksek" algısı `14px` yazı + `radius:0`'dan geliyordu;
 * gerçek yükseklik zaten eşitti. Beş değer de tek yerde toplandı: hem
 * `SplitButton` (CV, proje kartı indir) hem hero `Button` çağrıları buradan
 * beslenir. Böylece biri değişince diğerleri bayat kalmaz.
 */

/**
 * Dış kabuk: tek yuvarlak kutu + 1px koyu çerçeve + kırpma.
 *
 * `flex-nowrap` şart: iki parça mobilde alt satıra KIRILMAMALI (kullanıcı
 * isteği). `inline-flex` zaten `nowrap` öntanımlıydı ama açık yazılması
 * güvenli — parçalardan biri `flex` olsaydı sarmalayıcı devralmıyordu.
 */
export const HERO_BTN_SHELL
  = 'inline-flex h-10 flex-nowrap items-stretch overflow-hidden rounded-md border border-primary text-primary-fg'

/** Buton içi tipografi ve ikon aralığı (LobeButton ile birebir aynı). */
export const HERO_BTN_BODY
  = 'h-10 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-medium no-underline transition-colors'

/** LobeButton'un hover/active davranışı — split parçaları da aynı olsun. */
export const HERO_BTN_STATE = 'hover:bg-primary/90 active:bg-primary/80'
