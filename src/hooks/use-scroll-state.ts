'use client'

import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'

/** Ok başına kaydırma: görünür genişliğin %75'i. */
const PAGE_RATIO = 0.75
/** Aktif sekme okların altında kalmasın diye kenar payı (px). */
const EDGE_INSET = 8
/** Kenar tespit toleransı (px) — 1-2 px'lik kırılma oku yanlış durdurmasın. */
const EDGE_EPS = 4

/** Kaydırma hedefi: baş (0) mı son (max) mu. */
export type ScrollEdge = 'start' | 'end'

/**
 * Nokta sayısı SEKME SAYISINA BAĞLI DEĞİL — çubuğun kendi genişliğinden türetilir:
 * `Math.ceil(scrollWidth / clientWidth)`.
 * Taşma yoksa 1 döner (gösterge hiç çizilmez).
 */
export function tabPageCount(scrollWidth: number, clientWidth: number): number {
  if (clientWidth <= 0) {
    return 1
  }
  return Math.max(1, Math.ceil(scrollWidth / clientWidth))
}

/** Aktif nokta: kaydırma konumunun toplam mesafe içindeki oranı. */
export function activeTabPage(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): number {
  const pages = tabPageCount(scrollWidth, clientWidth)
  const max = scrollWidth - clientWidth
  if (pages < 2 || max <= 0) {
    return 0
  }
  return Math.min(
    pages - 1,
    Math.max(0, Math.round((scrollLeft / max) * (pages - 1))),
  )
}

export interface ScrollState {
  /** Yatay kaydırma pozisyonu (px). */
  scrollLeft: number
  /** Yatay kaydırılabilir maksimum (px). */
  maxScrollLeft: number
  /** `scrollWidth > clientWidth` — yani gerçekten gizli sekme var mı. */
  hasOverflow: boolean
  canScrollLeft: boolean
  canScrollRight: boolean
  /** Nokta sayısı (taşma yoksa 1). */
  pageCount: number
  /** Kaydırma konumuna göre aktif nokta. */
  activePage: number
  /** Ok butonu: bir "sayfa" (görünür genişliğin %75'i) kadar kaydır. */
  scrollBy: (direction: -1 | 1) => void
  /** Başa / sona git. */
  scrollToEdge: (edge: ScrollEdge) => void
  /** N. bölüme kaydır — ilk bölüm başa, son bölüm sona gider. */
  scrollToPage: (index: number) => void
  /** Aktif sekmeyi görünür kılar (yalnızca çubuğun kendisi kayar). */
  scrollToTab: (tab: HTMLElement | null) => void
}

interface Metrics {
  scrollLeft: number
  clientWidth: number
  scrollWidth: number
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
    }
    setMetrics(prev =>
      prev.scrollLeft === next.scrollLeft
      && prev.clientWidth === next.clientWidth
      && prev.scrollWidth === next.scrollWidth
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
      scrollTo(el.scrollLeft + direction * el.clientWidth * PAGE_RATIO)
    },
    [scrollRef, scrollTo],
  )

  const scrollToEdge = useCallback(
    (edge: ScrollEdge) => {
      const el = scrollRef.current
      if (!el) {
        return
      }
      scrollTo(edge === 'start' ? 0 : el.scrollWidth)
    },
    [scrollRef, scrollTo],
  )

  const scrollToPage = useCallback(
    (index: number) => {
      const el = scrollRef.current
      if (!el) {
        return
      }
      const pages = tabPageCount(el.scrollWidth, el.clientWidth)
      const page = Math.min(Math.max(index, 0), pages - 1)
      scrollTo(
        page === 0
          ? 0
          : page === pages - 1
            ? el.scrollWidth
            : page * el.clientWidth,
      )
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
      const start = tab.offsetLeft
      const end = start + tab.offsetWidth
      if (start >= el.scrollLeft && end <= el.scrollLeft + el.clientWidth) {
        return
      }
      scrollTo(start - EDGE_INSET)
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
    pageCount: tabPageCount(metrics.scrollWidth, metrics.clientWidth),
    activePage: activeTabPage(
      metrics.scrollLeft,
      metrics.scrollWidth,
      metrics.clientWidth,
    ),
    scrollBy,
    scrollToEdge,
    scrollToPage,
    scrollToTab,
  }
}
