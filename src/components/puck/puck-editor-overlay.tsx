'use client'

/**
 * Page Editor overlay — opens WITHOUT changing the URL.
 * The "Page Editor" button in the sidebar and the admin panel button
 * dispatch an `editor:open` event; this component listens in the root layout
 * and opens the current page's puck editor fullscreen.
 */

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PuckEditor } from '@/components/puck/puck-editor'
import { normalizePage } from '@/lib/puck/normalize'

export function PuckEditorOverlay() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openHandler = () => setOpen(true)
    const closeHandler = () => setOpen(false)
    window.addEventListener('editor:open', openHandler)
    window.addEventListener('editor:close', closeHandler)
    return () => {
      window.removeEventListener('editor:open', openHandler)
      window.removeEventListener('editor:close', closeHandler)
    }
  }, [])

  // The overlay closes on navigation (no lost edits — changes are kept in versions)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (!open)
    return null
  const path = normalizePage(pathname)

  return (
    <div className="fixed inset-0 z-[95] bg-[#0d0d12]">
      <PuckEditor page={path} onClose={() => setOpen(false)} />
    </div>
  )
}
