/**
 * Buton görsel dili — TEK kaynak (2026-10-05).
 *
 * Bu dosya, "normal buton" (LobeButton tabanlı `Button`) ile "iki parçalı
 * buton" (`SplitButton`) arasındaki HER stil farkını kapatır. İdeali: iki
 * tip aynı sınıflardan beslensin, değer kopyalanmasın.
 *
 * CANLI ÖLÇÜM KAYNAĞI (CDP, her iki tema):
 *
 *   | özellik        | normal buton        | split (eski)         |
 *   |----------------|---------------------|----------------------|
 *   | height         | 40px                | 40px            ✓    |
 *   | radius         | 6px                 | 6px             ✓    |
 *   | background     | mavi (--primary)    | ŞEFFAF          ✗    |
 *   | border-width   | 1px                 | 1px             ✓    |
 *   | border-color   | light: siyah        | light: MAVİ     ✗    |
 *   |                | dark:  koyu gri/beyaz| dark:  MAVİ     ✗    |
 *   | text-color     | light: siyah        | light: siyah    ✓    |
 *   |                | dark:  beyaz        | dark:  beyaz    ✓    |
 *   | icon-color     | light: siyah        | light: GRI      ✗    |
 *   |                | dark:  beyaz        | dark:  ACIK GRI ✗    |
 *   | font-size      | 13px                | 14px            ✗    |
 *   | font-weight    | 500                 | 400             ✗    |
 *   | padding-x      | 14px                | 14px            ✓    |
 *   | icon size      | 16px                | 16px            ✓    |
 *   | gap            | 6px                 | 6px             ✓    |
 *
 * Kullanıcının tarif ettiği "beyaz arka plan + mavi çerçeve + soluk ikon"
 * belirtisi, split kabuğunda `bg-primary` OLMAMASI ve `border-primary`
 * kullanılmasından geliyordu: kabuk saydam, iç parçalar da saydam → kart
 * zemininin rengi (beyaz) görünüyor, çerçeve mavi kalıyor, ikon `stroke`
 * rengi `currentColor` yerine inherited `--tfg-*` tonuna kayıyordu.
 *
 * ÇÖZÜM: hepsi `--primary` ailesinden. Arka plan `bg-primary`, çerçeve
 * `border-primary` DEĞİL — çerçeve rengi de metinle aynı kaynaktan
 * (`--tprimary-fg` temasına bağlı: light siyah, dark beyaz) gelir.
 */

/**
 * Dış kabuk — tek çerçeve, tek radius, kırpma.
 *
 *  - `bg-primary`     : mavi zemin (normal butonla AYNI değişken)
 *  - `border`         : 1px; RENGİ `HERO_BTN_EDGE` ile belirlenir
 *  - `overflow-hidden`: iç parçaların köşeleri dış radius'u aşamaz
 *  - `flex-nowrap`    : mobilde parçalar alt satıra KIRILMAZ
 *  - `items-stretch`  : parçalar kabuk yüksekliğini doldurur (iç köşe düz)
 */
export const HERO_BTN_SHELL
  = 'inline-flex h-10 flex-nowrap items-stretch overflow-hidden rounded-md bg-primary'

/**
 * Dış çerçeve RENGİ — metin/ikonla aynı kaynaktan.
 *
 * Neden ayrı sabit: normal butonda çerçeve `LobeButton`'un kendi
 * `border-foreground` mantığıyla geliyor; split'te ise çerçeve kabuğun
 * kendisine ait. İkisini aynı *değişkene* bağlayınca "değişince ikisi de
 * değişir" garantisi oluşuyor.
 *
 * `text-primary-fg` = `--tprimary-fg` = light: #000, dark: #fff
 * (globals.css). Border da aynı renge bağlı: light siyah, dark beyaz —
 * kullanıcının istediği birebir değerler.
 */
export const HERO_BTN_EDGE = 'border border-primary-fg'

/**
 * Buton içi tipografi ve ikon aralığı (LobeButton ile birebir aynı):
 * `text-[13px] font-medium` = ölçülen `13px` / `fw 500`.
 *
 * `gap-1.5` = ölçülen 6px. `px-3.5` = ölçülen 14px.
 */
export const HERO_BTN_BODY
  = 'h-10 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-medium no-underline transition-colors'

/**
 * Hover/active/focus — normal butonla aynı.
 *
 * Hover: mavi biraz koyulaşır (`bg-primary/90`). Parça başına uygulanır,
 * ikisi de aynı efekti alır; kabuk kırpma yaptığı için hover alanı dışa
 * taşmaz.
 */
export const HERO_BTN_STATE = 'hover:bg-primary/90 active:bg-primary/80'

/**
 * Odağı Dış KABUĞA taşır.
 *
 * İki parçaya ayrı halka koymak ikisinin arasında iki çizgi bırakıyordu.
 * `group-focus-within:` ile halka tek parça hâlinde GRUBU çevreler.
 */
export const HERO_BTN_FOCUS
  = 'outline-none group-focus-within:ring-2 group-focus-within:ring-primary-fg group-focus-within:ring-offset-2 group-focus-within:ring-offset-background'

/**
 * Ayırıcı çizgi — dış çerçeveyle AYNI renk (kullanıcı isteği).
 *
 * Önceden `--tsplit-divider` vardı ve açık temada `rgba(0,0,0,.30)`,
 * koyu temada `rgba(255,255,255,.32)` idi; çerçeve `border-primary` iken
 * bu iki renk "bağımsız" görünüyordu. Artık çerçeve `--tprimary-fg`
 * ailesinden olduğu için ayırıcı da aynı değişkenden: light siyah,
 * dark beyaz.
 */
export const HERO_BTN_DIVIDER = 'border-l border-primary-fg'

/** İkon ve yazı rengi: `currentColor` mirası, ayrı opacity YOK. */
export const HERO_BTN_FG = 'text-primary-fg'

/**
 * Hero `<Button>` çağrıları için GÖVDE sınıfları.
 *
 * Normal butonların canlı ölçümü: `h 40px`, `radius 6px`, `fs 13px`,
 * `fw 500`, `pad-x 14px`, `gap 6px`, `icon 16px`, `border 1px solid`
 * (light siyah / dark koyu-beyaz). `SplitButton` ile aynı değerler.
 *
 * `text-primary-fg` + `bg-primary` zaten `Button` bileşeninin
 * `masterClass`'ı ile geliyor; burada sadece geometri/tipografi sabitlenir.
 */
export const HERO_BTN = HERO_BTN_BODY
