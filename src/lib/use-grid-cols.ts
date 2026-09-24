'use client'

import { useEffect, useState } from 'react'

/**
 * Returns the number of columns the grid actually renders, measured from the
 * grid element itself via `getComputedStyle(grid).gridTemplateColumns`
 * (user spec 2026-09-24) watched with a ResizeObserver.
 *
 * Works for any CSS grid regardless of breakpoint classes (projects:
 * sm:grid-cols-2 lg:grid-cols-3, blog: md:grid-cols-2). SSR/initial: 3 (desktop-first);
 * corrected on first measure + on every resize.
 *
 * Pass the element via a state-setter ref: `<div ref={setEl}>` so mount/unmount
 * of conditionally-rendered grids is tracked too.
 */
export function useComputedGridCols(el: HTMLDivElement | null): number {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    if (!el) {
      return
    }
    const measure = () => {
      const n = getComputedStyle(el)
        .gridTemplateColumns.split(' ')
        .filter(Boolean)
        .length
      if (n > 0) {
        setCols(n)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return cols
}