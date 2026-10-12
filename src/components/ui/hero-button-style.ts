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
 *
 * ⚠️ `inline-flex` ZORUNLU (2026-10-06, kullanıcı "İletişim Bilgileri
 * butonu bozuk" dedi): buradaki `items-center` ve `gap-1.5` YALNIZCA flex
 * container'da çalışır. Ham `<button>` öğesi `display:inline-block`
 * olduğu için bu iki sınıf HİÇBİR ŞEY yapmıyordu. Tailwind preflight SVG'ye
 * `display:block` verdiğinden ikonlar blok seviyesine düşüp ALT ALTA
 * diziliyordu.
 *
 * Canlı ölçüm (localhost:3000, CDP) — düzeltmeden ÖNCE, üç tetikleyicinin
 * üçünde de aynı:
 *   display          inline-block      ← flex değil
 *   alignItems       center            ← uygulanmiyor
 *   gap              6px               ← uygulanmiyor
 *   MailIcon  merkezY  1248.5
 *   Chevron  merkezY  1282.9  ← buton alt kenarı 1280 → DIŞARI TAŞIYOR
 *   her iki ikonun x  356.4 (aynı)    ← yan yana değil, alt alta
 *
 * `whitespace-nowrap`: flex'e geçince dar kartlarda etiket iki satıra
 * bölünüp butonu iki satırlı yapabiliyordu.
 */
export const HERO_BTN_BODY
    = 'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-[13px] font-medium no-underline select-text transition-colors'

/**
 * Hover/active/focus — normal butonla aynı.
 *
 * Hover: mavi biraz koyulaşır (`bg-primary/90`). Parça başına uygulanır,
 * ikisi de aynı efekti alır; kabuk kırpma yaptığı için hover alanı dışa
 * taşmaz.
 */
export const HERO_BTN_STATE = 'hover:bg-primary/90 active:bg-primary/80'

/**
 * Odağı dış KABUĞA taşır.
 *
 * İki parçaya ayrı halka koymak ikisinin arasında iki çizgi bırakıyordu.
 * `:has(:focus-visible)` ile halka tek parça hâlinde GRUBU çevreler —
 * ve YALNIZCA klavye odaklanmasında görünür (tıklamada değil; komşu
 * butonlarla aynı `:focus-visible` anlamı).
 *
 * NEDEN BU YAZIM (2026-10-12, ölçüldü — "CV seçilmiyor" şikâyeti):
 *   1) `group-focus-within:` KAPSAYICI-olamaz: Tailwind kuralı
 *      `.group-focus-within\:ring-2:is(:where(.group):focus-within *)` —
 *      TORUN seçer; sınıf GRUP'un kendisinde olunca hiç eşleşmez (derlenmiş
 *      CSS doğruladı → halka hiç yok, CV klavyede "seçilmiyor" görünüyordu).
 *   2) `ring-primary-fg`: `--color-primary-fg` jetonu YOK (köprü
 *      `--color-primary-foreground`), o yüzden sınıf Tailwind'e atılıyordu.
 *      `ring-primary` = `--tprimary` (mavi) — komşu butonların `:focus-visible`
 *      halka rengiyle aynı dil.
 */
export const HERO_BTN_FOCUS
  = 'outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background'

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
 * Normal (tek parçalı) buton TETİKLEYİCİSİ — dropdown/combobox ve kart
 * içi butonlar için.
 *
 * 2026-10-05 ölçümü (canlı CDP, açık tema):
 *
 *   |             | referans (Projeler…) | sort combobox | Projeyi Aç |
 *   |-------------|----------------------|---------------|------------|
 *   | height      | 40px                 | 40px ✓        | 40px ✓     |
 *   | radius      | 6px                  | 0px ✗         | 8px ✗      |
 *   | border      | 1px #000             | 0px ✗         | 0px ✗      |
 *   | font-size   | 13px                 | 13px ✓        | 14px ✗     |
 *
 * Üçü de ayrı ayrı sapıyordu. Burada tek sınıf birleştirildi: dropdown
 * tetikleyicisi `rounded-md border` alıyor, "Projeyi Aç" `rounded-md`'e
 * geçiyor. `h-10 px-3.5 gap-1.5 text-[13px]` zaten `HERO_BTN_BODY` ile
 * aynıydı.
 */
export const HERO_BTN_TRIGGER
  = `${HERO_BTN_BODY} bg-primary ${HERO_BTN_EDGE} ${HERO_BTN_FG} ${HERO_BTN_STATE}`

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
