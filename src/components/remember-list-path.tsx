'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { usePreviousListPath } from '@/lib/use-previous-list-path'

/**
 * Bu sayfayı "liste sayfası" olarak kaydeder. Detay sayfalarında Geri Gel
 * butonu buraya döner.
 */
export function RememberListPath({ path }: { path: string }) {
  useEffect(() => {
    const { set } = usePreviousListPathStore.get()
    set(path)
  }, [path])
  return null
}

// Module-level store hook: usePreviousListPath hook'unu SSR-safe şekilde dışa aç.
import { usePreviousListPath as usePreviousListPathHook } from '@/lib/use-previous-list-path'
const usePreviousListPathStore = { get: () => usePreviousListPathHook() }