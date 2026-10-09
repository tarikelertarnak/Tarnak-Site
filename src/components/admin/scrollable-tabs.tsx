'use client'

import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { useCallback, useEffect, useRef } from 'react'
import { TabScrollDots } from '@/components/admin/tab-scroll-dots'
import { useScrollState } from '@/hooks/use-scroll-state'

/** Sabit (sticky) üst bar yüksekliği kadar pay — globals.css `[id]` ile aynı. */
const HEADER_OFFSET = 88

/**
 * Yatay kaydırılabilir sekme şeridi: tek/çift oklar + kenar solmaları + bölüm
 * noktaları.
 *
 * Lobehub `Tabs`, `TabsList`'e ref geçirmediği için kaydırılabilir kutu DOM'dan
 * bulunur. Taşma yoksa oklar ve noktalar HİÇ render edilmez.
 *
 * Sekme değişiminde yatay kaydırma `scrollToTab` ile SADECE bu kutunun içinde
 * yapılır — `scrollIntoView` çağrısı tüm atasını (ve sayfayı) yatay kaydırdığı
 * için bilerek kullanılmıyor.
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
    scrollElRef.current =
      node?.querySelector<HTMLElement>('[role="tablist"]') ?? null
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
    <div className="relative min-w-0">
      <div ref={attach} className="min-w-0 scroll-mt-[88px]">
        {children}
      </div>
      {state.hasOverflow && (
        <>
          {/* Kenar solmaları: gizli sekme olduğunu belli eder. Sadece düz degrade —
              parıltı/glow YOK. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-background to-transparent ${
              state.canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-background to-transparent ${
              state.canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <TabArrow
            side="left"
            disabled={!state.canScrollLeft}
            onClick={() => state.scrollBy(-1)}
          />
          <TabArrow
            side="right"
            disabled={!state.canScrollRight}
            onClick={() => state.scrollBy(1)}
          />
        </>
      )}
      <TabScrollDots
        pageCount={state.pageCount}
        activePage={state.activePage}
        canScrollLeft={state.canScrollLeft}
        canScrollRight={state.canScrollRight}
        onSelect={state.scrollToPage}
        onEdge={state.scrollToEdge}
      />
    </div>
  )
}

/**
 * Tek yön kaydırma oku — mavi, küçük; "Ekle" butonuyla aynı görsel.
 * Taşma yoksa hiç render edilmez (üst koşul).
 */
function TabArrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={side === 'left' ? 'Sola kaydır' : 'Sağa kaydır'}
      className={`absolute top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 ${
        side === 'left' ? 'left-1' : 'right-1'
      }`}
    >
      <Icon
        icon={side === 'left' ? 'mdi:chevron-left' : 'mdi:chevron-right'}
        width={18}
        height={18}
      />
    </button>
  )
}
