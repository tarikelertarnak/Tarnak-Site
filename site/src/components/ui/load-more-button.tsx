'use client'

import { useT } from '@/components/locale-provider'
/**
 * "Daha Fazlasını Göster (+N) · görünen/toplam" düğmesi — Projeler ve Blog ORTAK.
 *
 * 2026-10-06 (kullanıcı): Projeler + Blog kart listeleri bu mantığa
 * geçiyor; ikisi de aynı hook'u (`useRowPagination`) ve aynı düğmeyi
 * kullanıyor, ayrışamazlar.
 *
 * 2026-10-13 (kullanıcı): eski "(+4 · −6)" biçimindeki "−6" kafa
 * karıştırıyordu → KALDIRILDI. Yeni biçim:
 *   · kapalı: "Daha Fazlasını Göster (+{n}) · {görünen}/{toplam}" + aşağı ok
 *   · tümü açık: "Daha Az Göster · {toplam}/{toplam}" + yukarı ok
 * `{n} = min(adım, toplam − görünen)`, hepsi `useRowPagination`ten gelir
 * (ölçülen sütun sayısına göre) — sabit yazılmaz.
 *
 * Boşluk: grid ile düğme arası `var(--section-gap)` — bölümdeki diğer
 * boşluklarla aynı, kartlara yapışmaz. Yatayda ortalanmış.
 *
 * Erişilebilirlik: `aria-label` açılacak/görünen/toplam sayıyı söyler.
 * Butona basıldığında odak BUTONDA kalır (kartlara kaymaz).
 *
 * Mobil: "{görünen}/{toplam}" rozeti butona sığmazsa (`sm` altı) butonun
 * ALTINDA, ortalı ve soluk gösterilir; buton metni tek satır kalır.
 */
import { Button } from '@/components/ui/button'
import { HERO_BTN_TRIGGER } from '@/components/ui/hero-button-style'
import { ArrowDownIcon, ChevronUpIcon } from '@/components/ui/icons'

export function LoadMoreButton({
  visible,
  total,
  opening,
  expanded,
  onClick,
  className,
}: {
  /** Şu an görünen öğe sayısı — rozetin solu (`useRowPagination().visibleCount`) */
  visible: number
  /** Toplam öğe sayısı — rozetin sağı (`useRowPagination().total`) */
  total: number
  /** Bu basışta açılacak öğe sayısı (`+N`) — `useRowPagination().willOpen` */
  opening: number
  /** Tümü açık → "Daha Az Göster · toplam/toplam" + yukarı ok */
  expanded: boolean
  /** Aç (kapalıyken) / ilk hâline döndür (açıkken) */
  onClick: () => void
  className?: string
}) {
  const { t } = useT()
  // Açılacak öğe yoksa ve liste zaten daraltılabilir değilse düğme HİÇ
  // çizilmez: toplam öğe ilk satırlara sığdıysa "Daha Fazlasını Göster" yok.
  if (!expanded && total - visible <= 0)
    return null

  const progress = `${visible}/${total}`

  return (
    <div className={`flex flex-col items-center ${className ?? 'mt-[var(--section-gap)]'}`}>
      <Button
        color="primary"
        onClick={onClick}
        className={`${HERO_BTN_TRIGGER} font-semibold`}
        aria-label={expanded
          ? t('common.showLessAria', { total })
          : t('common.showMoreAria', { opening, total, visible })}
        // 2026-10-07 (kullanıcı): butonun SAĞINDA yön oku. Açıkken yukarı,
        // kapalıyken aşağı bakar — listenin açılıp kapandığını anlatır.
        endContent={expanded
          ? <ChevronUpIcon size={16} className="shrink-0" />
          : <ArrowDownIcon size={16} className="shrink-0" />}
      >
        {expanded ? t('common.showLess') : t('common.showMore', { opening })}
        {/* Rozet kalın metnin parçası DEĞİL: soluk + normal ağırlık. */}
        <span className="hidden font-normal opacity-70 sm:inline">
          {' · '}
          {progress}
        </span>
      </Button>
      {/* Dar ekran yedeği — buton metni tek satır kalsın diye rozet burada. */}
      <span className="mt-1 text-xs font-normal text-foreground/60 sm:hidden">
        {progress}
      </span>
    </div>
  )
}
