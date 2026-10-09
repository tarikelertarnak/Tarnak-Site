'use client'

import { Icon } from '@iconify/react'

/**
 * Sekme çubuğunun altındaki bölüm göstergesi.
 *
 * Nokta sayısı sekme sayısına bağlı DEĞİL — `pageCount` çubuğun taşma miktarından
 * gelir. Aktif nokta kaydırma konumuna göre `activePage` ile belirlenir.
 * Taşma yoksa (`pageCount < 2`) hiç render edilmez.
 */
export function TabScrollDots({
  pageCount,
  activePage,
  canScrollLeft,
  canScrollRight,
  onSelect,
  onEdge,
}: {
  pageCount: number
  activePage: number
  canScrollLeft: boolean
  canScrollRight: boolean
  onSelect: (index: number) => void
  onEdge: (edge: 'start' | 'end') => void
}) {
  if (pageCount < 2) {
    return null
  }
  return (
    <div className="mt-2 flex flex-row items-center justify-center gap-1.5">
      <DotEdge
        edge="start"
        disabled={!canScrollLeft}
        onClick={() => onEdge('start')}
      />
      <div className="flex flex-row items-center gap-1.5">
        {Array.from({ length: pageCount }, (_, index) => {
          const active = index === activePage
          return (
            <button
              key={index}
              type="button"
              aria-label={`Bölüm ${index + 1}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(index)}
              className={`h-2.5 rounded-full transition-colors ${
                active
                  ? 'w-5 bg-primary'
                  : 'w-2.5 border border-primary/60 bg-transparent hover:bg-primary/30'
              }`}
            />
          )
        })}
      </div>
      <DotEdge
        edge="end"
        disabled={!canScrollRight}
        onClick={() => onEdge('end')}
      />
    </div>
  )
}

/** Noktaların iki yanındaki çift ok: "Başa git" / "Sona git". */
function DotEdge({
  edge,
  disabled,
  onClick,
}: {
  edge: 'start' | 'end'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={edge === 'start' ? 'Başa git' : 'Sona git'}
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon
        icon={edge === 'start' ? 'mdi:chevrons-left' : 'mdi:chevrons-right'}
        width={16}
        height={16}
      />
    </button>
  )
}
