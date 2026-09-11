import { useEffect, useState } from 'react'

/**
 * Returns the number of columns the project/blog grid will render at the current viewport.
 * Mirrors Tailwind `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` so a "+1 row" reveal
 * adds exactly one full row of cards (no orphan trailing card).
 *
 * SSR defaults to 3 (lg+) to match the desktop-first initial render; the value is
 * re-evaluated in an effect on mount and on every breakpoint crossing.
 */
export function useGridCols(): number {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mqLg = window.matchMedia('(min-width: 1024px)')
    const mqSm = window.matchMedia('(min-width: 640px)')
    const update = () => setCols(mqLg.matches ? 3 : mqSm.matches ? 2 : 1)
    update()
    mqLg.addEventListener('change', update)
    mqSm.addEventListener('change', update)
    return () => {
      mqLg.removeEventListener('change', update)
      mqSm.removeEventListener('change', update)
    }
  }, [])
  return cols
}
