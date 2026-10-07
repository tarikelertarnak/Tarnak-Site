'use client'

/**
 * "Daha Fazlasını Göster (X)" düğmesi — Projeler ve Blog ORTAK.
 *
 * 2026-10-06 (kullanıcı): Projeler + Blog kart listeleri bu mantığa
 * geçiyor; ikisi de aynı hook'u (`useRowPagination`) ve aynı düğmeyi
 * kullanıyor, ayrışamazlar.
 *
 * Boşluk: grid ile düğme arası `var(--section-gap)` — bölümdeki diğer
 * boşluklarla aynı, kartlara yapışmaz. Yatayda ortalanmış.
 *
 * Erişilebilirlik: `aria-label` kalan sayıyı da söyler. Butona basıldığında
 * odak BUTONDA kalır (kartlara kaymaz) — yeni satırlar `aria-live` ile
 * duyurulur, ama odak yerinden oynamaz.
 */
import { Button } from '@/components/ui/button'
import { HERO_BTN_TRIGGER } from '@/components/ui/hero-button-style'
import { ArrowDownIcon } from '@/components/ui/icons'
import { useT } from '@/components/locale-provider'

export function LoadMoreButton({
  remaining,
  onClick,
  className,
}: {
  /** Hâlâ gizli kart sayısı */
  remaining: number
  onClick: () => void
  className?: string
}) {
  const { t } = useT()
  if (remaining <= 0) return null

  return (
    <div className={`flex justify-center ${className ?? 'mt-[var(--section-gap)]'}`}>
      <Button
        color="primary"
        onClick={onClick}
        className={`${HERO_BTN_TRIGGER} font-semibold`}
        aria-label={t('common.showMoreAria', { count: remaining })}
        // 2026-10-07 (kullanıcı): butonun SAĞINDA aşağı bakan ok + ikon
        // olsun — "daha fazlası var aşağıda" yönünü tek bakışta anlatır.
        endContent={<ArrowDownIcon size={16} className="shrink-0" />}
      >
        {t('common.showMore', { count: remaining })}
      </Button>
    </div>
  )
}