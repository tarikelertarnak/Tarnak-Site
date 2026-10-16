'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { isPrerenderingOrPrefetching, shouldTrackPath } from '@/lib/visits'

/**
 * Client ziyaret beacon'ı. Sayfa her gezişte /api/visits'e bildirim gönderir.
 * - /admin ve /api yolları izlenmez
 * - prerender/prefetch izlenmez
 * - tekilleştirme sunucu tarafında visitorId cookie ile yapılır
 */
export function VisitTracker() {
  const pathname = usePathname()
  const [sent, setSent] = useState(false)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || sent)
      return
    if (typeof document === 'undefined')
      return
    if (isPrerenderingOrPrefetching())
      return
    if (!shouldTrackPath(pathname))
      return

    fired.current = true
    fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      // credentials: 'include' — sunucuya cookie (visitorId) gider
      credentials: 'include',
    })
      .then(() => setSent(true))
      .catch(() => {
        // beacon başarısız olsa site bozulmaz
      })
  }, [pathname, sent])

  return null
}
