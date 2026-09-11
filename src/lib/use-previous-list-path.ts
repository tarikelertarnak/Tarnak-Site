'use client'

import { useEffect, useState } from 'react'

/**
 * Remembers which path the user was on when arriving at a detail page.
 * Used for the "Go Back" button to return to the previous list in one click.
 *
 * - sessionStorage: keeps SPA navigation state
 * - The "Back" button is only shown on list/detail-like pages
 */
const KEY = 'last-list-path'

export function usePreviousListPath() {
  const [previous, setPrevious] = useState<string | null>(null)

  useEffect(() => {
    try {
      setPrevious(sessionStorage.getItem(KEY))
    } catch {
      setPrevious(null)
    }
  }, [])

  const set = (path: string) => {
    try {
      sessionStorage.setItem(KEY, path)
    } catch {
      // silently
    }
    setPrevious(path)
  }

  return { previous, set }
}