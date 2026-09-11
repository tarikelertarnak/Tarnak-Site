'use client'

import { useEffect } from 'react'
import { usePreviousListPath } from '@/lib/use-previous-list-path'

/**
 * Saves this page as the "list page". The Go Back button on detail
 * pages returns here.
 */
export function RememberListPath({ path }: { path: string }) {
  const { set } = usePreviousListPath()
  useEffect(() => {
    set(path)
  }, [path, set])
  return null
}
