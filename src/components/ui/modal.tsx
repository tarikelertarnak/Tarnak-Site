'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { CloseIcon } from '@/components/ui/icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}

/**
 * Centered modal — focus trap, ESC close, body scroll lock, backdrop click close.
 * Motion/react for smooth fade+scale. Same backdrop/styling as Drawer so the
 * brand feels coherent when both appear on the same page.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESC + body scroll lock. Cleanup restores prior overflow so chained modals
  // don't get stuck in locked state if one closes mid-transition.
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
    // Move focus into the dialog on open for screen readers + keyboard users.
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black px-4 pb-4 pt-20 sm:pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
            className={`relative flex w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-foreground-200/15 bg-background shadow-2xl shadow-black/40 outline-none`}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-foreground-200/10 px-5 py-3.5">
                <h2
                  id="modal-title"
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
