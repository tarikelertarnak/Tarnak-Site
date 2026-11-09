'use client'

import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { useCallback, useEffect, useRef } from 'react'
import { useScrollState } from '@/hooks/use-scroll-state'

/** Sabit (sticky) üst bar yüksekliği kadar pay — globals.css `[id]` ile aynı. */
const HEADER_OFFSET = 88

/**
 * Yatay kaydırılabilir sekme şeridi: oklar şeridin İKİ UCUNDA, kendi alanında
 * (sekmelerin/tabloların üstüne BİNMEZ) + kenar solmaları.
 *
 * Lobehub `Tabs`, `TabsList`'e ref geçirmediği için kaydırılabilir kutu DOM'dan
 * bulunur. Taşma yoksa oklar HİÇ render edilmez.
 *
 * Oklar artık mutlak konumlandırılmıyor: `children` (Tabs) hem sekme şeridini
 * hem panelleri kapsadığı için `top-1/2` sayfanın ortasına, "Tablolar"
 * kartlarının üstüne düşüyordu (2026-10-13). Şimdi oklar flex kardeş; kendi
 * yükseklikleri şeritten ölçülür (`stripHeight`) ve ona göre ortalanır.
 *
 * Sekme değişiminde kaydırma `scrollToTab` ile SADECE bu kutunun içinde yapılır —
 * `scrollIntoView` tüm atasını (ve sayfayı) yatay kaydırdığı için bilerek
 * kullanılmıyor; ortalama `centerScrollLeft` ile elle hesaplanır.
 */
export function ScrollableTabs({
  activeTabKey,
  children,
}: {
  /** Aktif sekmenin anahtarı; deşince kaydırma durumu buna göre tazelenir. */
  activeTabKey?: string
  children: ReactNode
}) {
  const scrollElRef = useRef<HTMLElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)

  const attach = useCallback((node: HTMLDivElement | null) => {
    stripRef.current = node
    scrollElRef.current
      = node?.querySelector<HTMLElement>('[role="tablist"]') ?? null
  }, [])

  const state = useScrollState(scrollElRef)

  // Aktif sekme değişti: yatayda çubuğu kaydır, dikeyde şerit üstten kırpılmışsa
  // sabit barın altına yumuşakça getir.
  useEffect(() => {
    if (!activeTabKey) {
      return
    }
    const list = scrollElRef.current
    if (list) {
      state.scrollToTab(
        list.querySelector<HTMLElement>('[aria-selected="true"]'),
      )
    }
    const strip = stripRef.current
    if (!strip) {
      return
    }
    const top = strip.getBoundingClientRect().top
    if (top < HEADER_OFFSET) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + top - HEADER_OFFSET),
        behavior: 'smooth',
      })
    }
    // `state` nesnesi her ölçümde yeniden oluşur; sadece sekme değişiminde çalışalım.
  }, [activeTabKey])

  return (
    <div className="flex w-full min-w-0 items-start gap-1">
      {state.hasOverflow && (
        <TabArrow
          side="left"
          height={state.stripHeight}
          disabled={!state.canScrollLeft}
          onClick={() => state.scrollBy(-1)}
        />
      )}
      <div className="relative min-w-0 flex-1">
        <div ref={attach} className="admin-tabs-strip min-w-0 scroll-mt-[88px]">
          {children}
        </div>
        {state.hasOverflow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-between"
            style={state.stripHeight > 0 ? { height: state.stripHeight } : undefined}
          >
            {/* Kenar solmaları: gizli sekme olduğunu belli eder. Sadece düz
                degrade — parıltı/glow YOK. */}
            <div
              className={`w-8 bg-gradient-to-r from-background to-transparent transition-opacity ${
                state.canScrollLeft ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div
              className={`w-8 bg-gradient-to-l from-background to-transparent transition-opacity ${
                state.canScrollRight ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        )}
      </div>
      {state.hasOverflow && (
        <TabArrow
          side="right"
          height={state.stripHeight}
          disabled={!state.canScrollRight}
          onClick={() => state.scrollBy(1)}
        />
      )}
    </div>
  )
}

/**
 * Tek yön kaydırma oku — mavi, küçük; "Ekle" butonuyla aynı görsel.
 * Taşma yoksa hiç render edilmez (üst koşul). Sarmalayıcı yüksekliği sekme
 * şeridinden gelir; böylece ok şeritle aynı hizada ortalanır.
 */
function TabArrow({
  side,
  height,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  height: number
  disabled: boolean
  onClick: () => void
}) {
  return (
    <div
      className="flex min-h-8 w-8 shrink-0 items-center justify-center"
      style={height > 0 ? { height } : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={side === 'left' ? 'Sola kaydır' : 'Sağa kaydır'}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon
          icon={side === 'left' ? 'mdi:chevron-left' : 'mdi:chevron-right'}
          width={18}
          height={18}
        />
      </button>
    </div>
  )
}
