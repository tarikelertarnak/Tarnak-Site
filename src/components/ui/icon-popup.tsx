'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverPosition } from '@/components/ui/use-popover-position'

/**
 * İkon bilgi balonu (2026-10-16, kullanıcı isteği).
 *
 * Davranış sözleşmesi:
 *   - Üstüne gelince açılır; imleç çekilince (sabitlenmemişse) kapanır.
 *   - Tıklayınca SABİTLENİR: dışarı tıklama veya Esc'e kadar açık kalır; aynı
 *     ikona tekrar tıklamak kapatır.
 *   - Sabit popup'ı, başka bir ikonun hover'ı KAPATMAZ (kullanıcı isteği);
 *     ama yeni bir popup SABİTLENİRSE önceki kapanır (aynı anda tek popup).
 *   - Dokunmatikte dokunma = aç/kapa (aynı tıklama yolu).
 *   - Ekrandan taşmaz: konum `lib/popover-position.ts` ile ölçülür (alt → üst →
 *     sağ → sol) ve panel `document.body`'ye portal edilir (ata kırpamaz).
 *   - Erişilebilirlik: tetikleyici `button` + `aria-expanded`, panel
 *     `role="tooltip"`; Enter/Space açar-sabitler, Esc kapatır.
 */

/** Sabitlenmiş tek popup kalsın diye modül düzeyinde kayıt. */
const pinnedClosers = new Set<() => void>()

export function IconPopup({
  label,
  trigger,
  children,
  className = '',
  triggerClassName = '',
}: {
  /** Tetikleyicinin erişilebilir adı. */
  label: string
  /** Tıklanabilir/hover edilebilir içerik (ikon + ad). */
  trigger: ReactNode
  /** Popup gövdesi. */
  children: ReactNode
  className?: string
  /** Tetikleyici düğmenin sınıfları (çip düzeni çağıranda kalır). */
  triggerClassName?: string
}) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned
  const id = useId()

  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const { triggerRef, panelRef, portalStyle } = usePopoverPosition<HTMLDivElement>(open, 8)

  const close = useCallback(() => {
    setHovered(false)
    setPinned(false)
  }, [])

  // Yeni bir popup sabitlenince diğerlerini kapat.
  useEffect(() => {
    if (!pinned)
      return
    for (const other of pinnedClosers) {
      if (other !== close)
        other()
    }
  }, [pinned, close])

  useEffect(() => {
    pinnedClosers.add(close)
    return () => {
      pinnedClosers.delete(close)
    }
  }, [close])

  // Esc + dışarı tıklama — yalnız sabitken gerekir.
  useEffect(() => {
    if (!pinned)
      return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        close()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target)
        return
      if (wrapperRef.current?.contains(target) || panelRef.current?.contains(target))
        return
      close()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [pinned, close, panelRef])

  return (
    <span ref={wrapperRef} className={className}>
      <button
        type="button"
        ref={(node) => {
          triggerRef.current = node
        }}
        aria-label={label}
        aria-expanded={open}
        {...(open ? { 'aria-describedby': `icon-popup-${id}` } : {})}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => setPinned(p => !p)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open
        && typeof document !== 'undefined'
        && createPortal(
          <div
            ref={panelRef}
            id={`icon-popup-${id}`}
            role="tooltip"
            style={portalStyle}
            className="z-[70] w-56 rounded-xl border border-foreground-200/15 bg-background p-3 text-xs text-foreground shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </span>
  )
}
