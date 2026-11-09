'use client'

import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'

/** Ok başına kaydırma miktarı (px) — kullanıcı isteği 2026-10-13. */
export const ARROW_STEP = 200
/** Kenar tespit toleransı (px) — 1-2 px'lik kırılma oku yanlış durdurmasın. */
const EDGE_EPS = 4

export interface ScrollState {
  /** Yatay kaydırma pozisyonu (px). */
  scrollLeft: number
  /** Yatay kaydırılabilir maksimum (px). */
  maxScrollLeft: number
  /** `scrollWidth > clientWidth` — yani gerçekten gizli sekme var mı. */
  hasOverflow: boolean
  canScrollLeft: boolean
  canScrollRight: boolean
  /** Sekme şeridinin yüksekliği (px) — oklar bu yüksekliğe ortalanır. */
  stripHeight: number
  /** Ok butonu: `ARROW_STEP` kadar kaydır. */
  scrollBy: (direction: -1 | 1) => void
  /** Sekmeyi şeridin ORTASINA getirir (yalnızca çubuğun kendisi kayar). */
  scrollToTab: (tab: HTMLElement | null) => void
}

/** Sekmeyi görünür alanın ortasına alacak kaydırma konumu (asla negatif değil). */
export function centerScrollLeft(
  tabStart: number,
  tabWidth: number,
  clientWidth: number,
): number {
  return Math.max(0, tabStart - (clientWidth - tabWidth) / 2)
}

interface Metrics {
  scrollLeft: number
  clientWidth: number
  scrollWidth: number
  clientHeight: number
}

/**
 * Yatay kaydırılabilir bir kutu için canlı kaydırma durumu.
 *
 * Durumu üç kaynaktan tazeler: kutu `scroll` olayı, kutu `ResizeObserver`'ı ve
 * `window` `resize` olayı. Sayfa yatay kaydırması olmamalı; bu yüzden kaydırma
 * daima `el.scrollTo` ile SADECE bu kutunun içinde yapılır.
 */
export function useScrollState<T extends HTMLElement>(
  scrollRef: RefObject<T | null>,
): ScrollState {
  const [metrics, setMetrics] = useState<Metrics>({
    scrollLeft: 0,
    clientWidth: 0,
    scrollWidth: 0,
    clientHeight: 0,
  })

  const sync = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const next: Metrics = {
      scrollLeft: el.scrollLeft,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      clientHeight: el.clientHeight,
    }
    setMetrics(prev =>
      prev.scrollLeft === next.scrollLeft
      && prev.clientWidth === next.clientWidth
      && prev.scrollWidth === next.scrollWidth
      && prev.clientHeight === next.clientHeight
        ? prev
        : next,
    )
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    sync()
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro.disconnect()
    }
  }, [scrollRef, sync])

  const scrollTo = useCallback(
    (left: number) => {
      const el = scrollRef.current
      if (!el) {
        return
      }
      const max = Math.max(0, el.scrollWidth - el.clientWidth)
      el.scrollTo({
        left: Math.min(Math.max(left, 0), max),
        behavior: 'smooth',
      })
    },
    [scrollRef],
  )

  const scrollBy = useCallback(
    (direction: -1 | 1) => {
      const el = scrollRef.current
      if (!el) {
        return
      }
      scrollTo(el.scrollLeft + direction * ARROW_STEP)
    },
    [scrollRef, scrollTo],
  )

  const scrollToTab = useCallback(
    (tab: HTMLElement | null) => {
      const el = scrollRef.current
      if (!el || !tab) {
        return
      }
      // `offsetLeft` çubuğun KENDİ koordinatıdır (kaydırmadan etkilenmez).
      scrollTo(centerScrollLeft(tab.offsetLeft, tab.offsetWidth, el.clientWidth))
    },
    [scrollRef, scrollTo],
  )

  const maxScrollLeft = Math.max(0, metrics.scrollWidth - metrics.clientWidth)

  return {
    scrollLeft: metrics.scrollLeft,
    maxScrollLeft,
    hasOverflow: maxScrollLeft > 0,
    canScrollLeft: metrics.scrollLeft > EDGE_EPS,
    canScrollRight:
      maxScrollLeft > 0 && metrics.scrollLeft < maxScrollLeft - EDGE_EPS,
    stripHeight: metrics.clientHeight,
    scrollBy,
    scrollToTab,
  }
}
