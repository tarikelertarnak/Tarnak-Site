'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { CloseIcon } from '@/components/ui/icons'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: 'right' | 'left'
  width?: string
}

/**
 * Side drawer — same a11y/safety guarantees as Modal (ESC, scroll lock,
 * focus-on-open, backdrop close). Side='right' (default) slides from the
 * right edge; pass 'left' for the opposite edge.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  width = 'max-w-sm',
}: DrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Initial x position depends on which side we're sliding in from.
  const initialX = side === 'right' ? '100%' : '-100%'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            tabIndex={-1}
            initial={{ x: initialX }}
            animate={{ x: 0 }}
            exit={{ x: initialX }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} flex h-full w-full ${width} flex-col border-${side === 'right' ? 'l' : 'r'} border-foreground-200/15 bg-background shadow-2xl shadow-black/40 outline-none`}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-foreground-200/10 px-5 py-3.5">
                <h2
                  id="drawer-title"
                  className="text-base font-semibold text-foreground"
                >
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
