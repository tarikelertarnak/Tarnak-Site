'use client'

import type React from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Satır bazlı "Daha Fazlasını Göster" sayfalama.
 *
 * 2026-10-06 (kullanıcı): Projeler ve Blog kart listeleri "Daha Fazlasını
 * Göster (X)" mantığına çevrilecek — ikisi de AYNI hook'u kullanacak.
 *
 * TASARIM KURALLARI (kullanıcıdan birebir):
 *  1) Sütun sayısı (N) SABİT YAZILMAZ. Grid elemanı ölçülür:
 *     `getComputedStyle(grid).gridTemplateColumns` içindeki sütun sayısı
 *     okunur. ResizeObserver ile pencere değişince otomatik güncellenir.
 *  2) State "kaç KART" değil "kaç SATIR" (`visibleRows`). N değişse bile
 *     düzen bozulmaz.
 *  3) Başlangıç 2 satır → 2 × N kart. Toplam 2 × N'den azsa hepsi görünür,
 *     buton çıkmaz.
 *  4) Butona basınca EN FAZLA 2 satır eklenir, sadece kalan kadar.
 *  5) BOŞ HÜCRE KURALI: son satırda boşluk varken ve kalan kartlar o
 *     boşluklara SIĞIYORSA buton çıkmadan hepsi görünür. Fazlası varsa önce
 *     boş hücreler dolar, kalanı için buton çıkar.
 *  6) Kartlar `display:none` ile gizlenmez — sadece `slice()` ile render edilir.
 */

/** Saf hesap — DOM gerektirmez, test edilebilir. */
export function computeVisibleCount(
  total: number,
  columns: number,
  visibleRows: number,
): number {
  if (total <= 0)
    return 0
  // N en az 1 olmalı (grid henüz ölçülmediyse 0 gelir)
  const n = Math.max(1, columns)
  const wanted = Math.max(1, visibleRows) * n
  let visible = Math.min(total, wanted)

  /*
    BOŞ HÜCRE KURALI (5): son satır eksik kalıyorsa ve kalan kartlar o
    boş hücrelere sığıyorsa, gereksiz yeni satır açmadan hepsini göster.
      ör. total=7, N=3 → ilk 6 görünür, son satırda 0 boş hücre, kalan 1
          → buton "Daha Fazlasını Göster (1)"
      ör. total=8, N=3 → ilk 6 görünür, kalan 2. Son satır TAM (6/3=2
          satır dolu) → 0 boş hücre → buton (2)
      ör. total=6, N=4 → ilk 6 = 1.5 satır, son satırda 2 boş hücre,
          kalan 0 → zaten hepsi görünür
      ör. total=7, N=4 → ilk 8 istenir ama total 7 → 7 görünür
  */
  const inLastRow = visible % n
  const emptySlots = inLastRow === 0 ? 0 : n - inLastRow
  const hidden = total - visible
  if (emptySlots > 0 && hidden <= emptySlots) {
    visible = total
  }

  return Math.min(visible, total)
}

/** Kaç satır daha açılsın (en fazla 2). */
export function computeNextRows(
  total: number,
  columns: number,
  visibleRows: number,
): number {
  const visible = computeVisibleCount(total, columns, visibleRows)
  if (visible >= total)
    return 0
  const n = Math.max(1, columns)
  // Kaç satır daha gerekiyor (boş hücre kuralı uygulanmış görünen sayıyla)
  const rowsNeeded = Math.ceil((total - visible) / n)
  return Math.min(2, rowsNeeded)
}

/**
 * Butona basıldığında görünür olacak TOPLAM kart sayısı.
 *
 * 2026-10-11 (kullanıcı): "Daha Fazlasını Göster (+10 −278) gibi bişey olmalı,
 * kaç tane açacağı ve kaç tane kapalı olduğu". `+N` buradan hesaplanır:
 * `computeNextVisibleCount(...) - computeVisibleCount(...)`.
 */
export function computeNextVisibleCount(
  total: number,
  columns: number,
  visibleRows: number,
): number {
  const current = computeVisibleCount(total, columns, visibleRows)
  const rowsToAdd = computeNextRows(total, columns, visibleRows)
  if (rowsToAdd <= 0)
    return current
  return computeVisibleCount(total, columns, visibleRows + rowsToAdd)
}

export interface UseRowPaginationResult<T> {
  /** Render edilecek kartlar (yoksa boş hücre doldurma uygulanmış) */
  visible: T[]
  /** Hâlâ gizli kart sayısı */
  remaining: number
  /** Bu basışta KAÇ kart açılacak (`+N` rozeti) */
  willOpen: number
  /** Buton görünmeli mi (daha açılacak kart var) */
  hasMore: boolean
  /** Görünen kart sayısı (`visible.length` ile aynı; `{görünen}/{toplam}` rozeti) */
  visibleCount: number
  /** Toplam kart sayısı (`{görünen}/{toplam}` rozeti) */
  total: number
  /** Tümü açık mı — buton "Daha Az Göster"e döner (2026-10-13) */
  canCollapse: boolean
  /** Ölçülen sütun sayısı (N) */
  columns: number
  /** Kaç satır açık */
  visibleRows: number
  /** Grid'e ref olarak bağlanacak element */
  gridRef: React.RefObject<HTMLDivElement | null>
  /** 2 satır daha aç */
  loadMore: () => void
  /** Listeyi ilk haline (initialRows) döndür — "Daha Az Göster" (2026-10-13) */
  collapse: () => void
  /** Yeni kartlar için animasyon anahtarı (her loadMore'da artar) */
  revealKey: number
}

export function useRowPagination<T>(
  items: T[],
  {
    initialRows = 2,
    stepRows = 2,
    /** Arama/sıralama değiştiğinde sıfırlanır */
    resetKey,
    /**
     * `false` → sayfalama KAPALI: tüm öğeler döner, `hasMore` her zaman
     * `false`. `/projects/` sayfası tüm projeleri baştan göstermek istiyor
     * (2026-10-07, kullanıcı) — ana sayfa bölümünde sayfalama kalıyor.
     */
    enabled = true,
  }: {
    initialRows?: number
    stepRows?: number
    resetKey?: string | number
    enabled?: boolean
  } = {},
): UseRowPaginationResult<T> {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [columns, setColumns] = useState(0)
  const [visibleRows, setVisibleRows] = useState(initialRows)
  const [revealKey, setRevealKey] = useState(0)

  /*
    Sütun sayısını ÖLÇ. `gridTemplateColumns` "182px 182px 182px" gibi bir
    liste döndürür; boşsa (ölçüm yoksa) kutu sayısına düşeriz.
  */
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid)
      return

    const measure = () => {
      const tpl = getComputedStyle(grid).gridTemplateColumns
      const n = tpl && tpl !== 'none'
        ? tpl.trim().split(/\s+/).length
        : 0
      if (n > 0)
        setColumns(n)
    }
    measure()

    if (typeof ResizeObserver === 'undefined')
      return
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [items.length])

  // Arama / sıralama değişti → liste başa dön (2 satır)
  useEffect(() => {
    setVisibleRows(initialRows)
    setRevealKey(k => k + 1)
  }, [resetKey, initialRows])

  const total = items.length
  // Sayfalama kapalıysa: sütun ölçümüne de gerek yok, doğrudan hepsi.
  const visibleCount = enabled ? computeVisibleCount(total, columns, visibleRows) : total
  const visible = items.slice(0, visibleCount)
  const remaining = enabled ? total - visibleCount : 0
  const willOpen = enabled
    ? Math.max(0, computeNextVisibleCount(total, columns, visibleRows) - visibleCount)
    : 0

  const loadMore = useCallback(() => {
    const n = columns > 0 ? columns : 1
    const rowsNeeded = computeNextRows(total, n, visibleRows)
    if (rowsNeeded <= 0)
      return
    setVisibleRows(r => r + rowsNeeded)
    setRevealKey(k => k + 1)
  }, [columns, total, visibleRows, stepRows])

  /**
   * "Daha Az Göster" (2026-10-13): listeyi ilk haline döndürür. Satır sayısı
   * `initialRows`a iner; `{görünen}/{toplam}` yeniden ilk değere döner.
   */
  const collapse = useCallback(() => {
    setVisibleRows(initialRows)
    setRevealKey(k => k + 1)
  }, [initialRows])

  return {
    visible,
    remaining,
    willOpen,
    hasMore: enabled && remaining > 0,
    visibleCount,
    total,
    // Yalnız sayfalama AÇIKKEN ve başlangıçtan fazla satır açılmışken daraltılır.
    canCollapse: enabled && visibleRows > initialRows,
    columns,
    visibleRows,
    gridRef,
    loadMore,
    collapse,
    revealKey,
  }
}
