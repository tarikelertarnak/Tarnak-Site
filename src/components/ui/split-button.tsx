'use client'

import type { ButtonProps } from '@/components/ui/button'
import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import {
  HERO_BTN_DIVIDER,
  HERO_BTN_EDGE,
  HERO_BTN_FG,
  HERO_BTN_FOCUS,
  HERO_BTN_SHELL,
  HERO_BTN_STATE,
} from '@/components/ui/hero-button-style'

/**
 * SplitButton — iki (veya daha fazla) eylemi TEK buton gibi gösteren birleşik yapı.
 *
 * SORUN (2026-10-05): yapı üç ayrı yerde üç ayrı sabitle kurulmuştu
 * (`split-button.tsx` sabitleri, `cv-picker` elle `<div>` + iki `<Button>`,
 * `project-card` elle `<div>` + `<a>` + `<button>`). Sonuç: CV butonunda iki
 * parça arasında çatlak, iç köşeler yuvarlak kalıyor, yükseklik/padding
 * uyumsuz — proje kartındakine bakıp "bu doğru" deniyordu. Sebep: parçalar
 * `Button` (LobeButton) üzerinden basıldığı için LobeButton'ın kendi
 * `rounded-lg`'i ve padding'i parçalara bulaşıyordu; `overflow-hidden` tek
 * başına yetmiyor çünkü YARI'nın radius'u parçanın kendi köşesidir.
 *
 * ÇÖZÜM: geometrinin TEK sahibi bu bileşen.
 *  - `SPLIT_WRAP` tek yuvarlak kutu + `overflow-hidden` + `bg-primary`
 *  - her yari `rounded-none` (kendisini yuvarlamaz) + `shrink-0`
 *  - yarılar arası 1px yarı saydam ayırıcı (`--tsplit-divider`)
 *  - sol yari içerik kadar, sağ yari sabit kare (`splitPartIconWidth`)
 *  - `focus-visible` halkası WRAP üzerinde: parçalar taşmaz, grup çevrelenir
 *  - `flex-nowrap`: mobilde parçalar alt satıra kırılmaz
 *
 * Neden `ButtonProps` DEĞİL de kontrollü props: `Button` (LobeButton) her
 * çağrıda kendi radius/padding/hikâyesini dayatıyordu. Burada parçalar sade
 * `<button>`/`<a>` — yani indirme linki (`<a download>`) ve menü düğmesi
 * (`<button>`) semantiği KORUNUR, ki bu iki kullanımın da ihtiyacı.
 */

export type SplitButtonPartProps = {
  /** Görünür içerik: ikon + yazı. */
  children: ReactNode
  href?: string
  onClick?: () => void
  /** Sadece ikon (sağ kare yarı için). */
  label?: string
  /** `download` özniteliği — indirme yarıları için. */
  download?: boolean | string
  target?: string
  rel?: string
  title?: string
  'aria-label'?: string
  'aria-expanded'?: boolean
  'aria-haspopup'?: boolean
  /** Sabit kare genişlikte ikon yarı (ikon ortalanır). */
  iconOnly?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

/** Sağ (ikon) yarının kare genişliği — 40px buton yüksekliğiyle aynı. */
const ICON_PART_WIDTH = 40

/**
 * Dış sarmalayıcı. `group-focus-within:` ile odak halkası GRUPU çevreler:
 * her parçaya ayrı halka koymak ikisinin arasında iki çizgi yapıyordu.
 *
 * GÖRSEL DİL DÜZELTMESİ (2026-10-05): canlı ölçüm üç gerçek farkı
 * gösterdi ve kullanıcının "beyaz arka plan + mavi çerçeve + soluk ikon"
 * tarifini açıklıyordu:
 *   1. kabukta `bg-primary` YOKTU → saydam, kart zemininin beyazı görünüyordu
 *   2. çerçeve `border-primary` idi → mavi kalıyordu (normal buton siyah/beyaz)
 *   3. ikon `currentColor` yerine inherited gri tonunu alıyordu
 * Üçü de `hero-button-style.ts`ten gelen sabitlerle kapandı; artık
 * normal butonla (LobeButton) aynı değişkenlerden besleniyoruz.
 */
const WRAP
  = `${HERO_BTN_SHELL} ${HERO_BTN_EDGE} ${HERO_BTN_FG} align-middle select-none group ${HERO_BTN_FOCUS}`

/**
 * Her yari: geometrisiz. Yuvarlatma yok, esnemez.
 *
 * `bg-primary` KABUKTA da var ama PARÇAYA DA konur. Neden (2026-10-05):
 * LobeUI/antd `cssinjs` in şu kuralı global:
 *   `:where(.css-*) a { color: var(--ant-color-link) }`
 * Split'in `<a>` parçası `text-primary-fg` utility'si taşıyor ama bu
 * `:where()` kuralı daha YÜKSEK özgüllüğe sahip olduğu için ikon ve yazı
 * `--tfg-700` (açık temada `rgb(63,63,70)`, koyu temada
 * `rgb(228,228,231)`) rengini alıyordu — yani kullanıcının "soluk ikon"
 * şikâyeti. Kabuk `bg-primary` olduğu için `a.bg-primary { color: ... }`
 * kuralı da tetiklenmiyordu (o kural kabukta çalışmıyor).
 * Parçaya `bg-primary` eklenince `a.bg-primary` kuralı işe yarıyor ve
 * `color: var(--tprimary-fg)` uygulanıyor: light siyah, dark beyaz.
 */
const PART
  = `inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-none border-0 bg-primary text-[13px] font-medium no-underline transition-colors ${HERO_BTN_STATE} ${HERO_BTN_FG} focus-visible:outline-none`

/** Sag yari: sabit kare + ince ayirici (dış çerçeveyle aynı renk). */
const ICON_PART = HERO_BTN_DIVIDER

/**
 * Sol yari: icerik kadar genis, yatay dolgu.
 *
 * `px-3.5` + `text-[13px]` diger hero butonlariyla (`px-3.5 text-[13px]
 * font-medium`) BIREBIR ayni. Once `px-4`/`text-sm` idi ve komşu butonlardan
 * farkli genislik ve yazi boyu cikardi.
 */
const MAIN_PART = 'px-3.5'

/**
 * Eski dışa aktarılan sabitler — geriye dönük uyum. Artık hiçbir yerde
 * kullanılmıyor ama bir dış paket alırsa kırılmasın.
 */
export const SPLIT_WRAP = WRAP
export const SPLIT_PART = `${PART} ${MAIN_PART}`
export const SPLIT_DIVIDER = ICON_PART

function isModifiedClick(e: React.MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
}

/**
 * Bir yarinin YAZI (metin) icerdigini kestirir. Yazi yoksa sabit kare
 * yari sayilir. Yazi tespiti bilerek basit: `children` string/seviyesinde
 * bir metin iceriyorsa. Proje kartinda iki yari da ikon (`DownloadIcon`,
 * `ChevronDownIcon`) oldugu icin ikisi de kare olur — bu yuzden `iconOnly`
 * ile acikca verilebilir.
 */
function hasContentPart(parts: SplitButtonPartProps[], index: number) {
  const c = parts[index]?.children
  if (typeof c === 'string' || typeof c === 'number')
    return true
  return Array.isArray(c) && c.some(x => typeof x === 'string' || typeof x === 'number')
}

/**
 * @param parts  Sırayla parçalar. Son parça ikon/kare yarı sayılır; öncesi
 *               içerik kadar geniş. Tek parça verilirse ikon karesi uygulanmaz.
 */
export function SplitButton({
  parts,
  className,
  ref,
}: {
  parts: SplitButtonPartProps[]
  className?: string
  /**
   * Sarmalayıcı `<div>`'e ref. Menü/panel konumlandırması gereken yerler
   * bunu kullanır (proje kartındaki indirme menüsü: ayırıcı çizginin x
   * konumu = wrapper'ın solu + sol parçanın genişliği, bkz. project-card.tsx).
   * React 19'da `ref` prop'a geçer, `forwardRef` gerekmez.
   */
  ref?: React.Ref<HTMLDivElement>
}) {
  if (parts.length === 0)
    return null

  const lastIndex = parts.length - 1

  return (
    <div ref={ref} className={cn(WRAP, className)}>
      {parts.map((p, i) => {
        // Sabit kare yari: ya acikca isaretlenmis ya da (yoksa) son yari
        // ve oncesinde yazi/ikon disi bir yari varsa. Proje kartinda IKISI
        // de ikon oldugu icin `iconOnly` her ikisinde de verilmek zorunda.
        const isIcon = p.iconOnly ?? (i === lastIndex && !hasContentPart(parts, i))
        const base = cn(PART, isIcon ? ICON_PART : MAIN_PART)

        const inner = (
          <>
            {p.children}
            {!p.children && p.label ? <span className="sr-only">{p.label}</span> : null}
          </>
        )

        // Son (ikon) yarı düğme: açılır menü tetikler.
        if (!p.href) {
          return (
            <button
              key={i}
              ref={p.ref}
              type="button"
              onClick={p.onClick}
              title={p.title}
              aria-label={p['aria-label']}
              aria-expanded={p['aria-expanded']}
              aria-haspopup={p['aria-haspopup']}
              style={isIcon ? { width: ICON_PART_WIDTH } : undefined}
              className={cn(base, isIcon && 'px-0')}
            >
              {inner}
            </button>
          )
        }

        // Baş (içerik) yarı bağlantı: önizleme / indirme.
        return (
          <a
            key={i}
            href={p.href}
            {...(p.download !== undefined ? { download: p.download } : {})}
            {...(p.target ? { target: p.target } : {})}
            {...(p.rel ? { rel: p.rel } : {})}
            {...(p.title ? { title: p.title } : {})}
            {...(p['aria-label'] ? { 'aria-label': p['aria-label'] } : {})}
            onClick={p.onClick ? (e: React.MouseEvent) => { if (!isModifiedClick(e)) p.onClick!() } : undefined}
            style={isIcon ? { width: ICON_PART_WIDTH } : undefined}
            className={cn(base, isIcon && 'px-0')}
          >
            {inner}
          </a>
        )
      })}
    </div>
  )
}
