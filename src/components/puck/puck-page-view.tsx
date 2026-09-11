'use client'

/** Public view of a Puck page — used on the / and /puck/* routes. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Render } from '@measured/puck'
import { config } from '@/lib/puck/config'

export function PuckPageView({
  data,
  embed,
}: {
  data: Record<string, unknown>
  embed?: boolean
}) {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  if (!isClient) return null

  return (
    <main id="main" className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <Render config={config} data={data as never} />
      {!embed && (
        <div className="flex justify-center pb-8 text-xs text-foreground/40">
          <Link href="/" className="hover:text-primary">
            ← Ana sayfaya dön
          </Link>
        </div>
      )}
    </main>
  )
}

export default PuckPageView
