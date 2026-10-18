'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/ui/icons'
import { PANEL_SURFACE, PANEL_SURFACE_BORDER } from '@/lib/panel-surface'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /**
   * `right`/`left`: kenardan kayan çekmece (mevcut davranış).
   * `middle`: ORTA ANA ALANIN üstüne oturan panel (Ayarlar). Sol/sağ paneller
   * onun üstünde kalır (z-index), böylece tıklanabilir kalırlar.
   */
  side?: 'right' | 'left' | 'middle'
  width?: string
  /**
   * `side='middle'` — dışına tıklama tespiti için ORTA ALAN kapsayıcısının id'si.
   * Kapsayıcının DIŞINA yapılan her tıklama (sol panel, sağ panel, aradaki
   * boşluk) paneli kapatır; içine (Ayarlar + onay penceresi) tıklama kapatmaz.
   */
  containerId?: string
  /** `side='middle'` — `role="dialog"` için erişilebilir ad. */
  ariaLabel?: string
}

/** Odak tuzağında dolaşılabilir öğeler. */
const FOCUSABLE
  = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Side drawer / middle panel — same a11y/safety guarantees as Modal (ESC,
 * scroll lock, focus-on-open, backdrop close). Side='right' (default) slides from
 * the right edge; pass 'left' for the opposite edge; pass 'middle' to overlay the
 * main content area only (settings), with a focus trap and outside-click close.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  /*
    2026-10-04 (kullanıcı isteği): sağ yan panel %25 büyüdü.
    `max-w-sm` = 24rem = 384px; 384 * 1.25 = 480px. Tailwind'in standart
    merdiveninde tam karşılığı yok (`max-w-md` 448, `max-w-lg` 512), bu
    yüzden kesin değer. Tek varsayılan — AYARLAR ve PROFIL panelleri gibi
    tüm sağ drawer'lar birlikte büyür, ayrı ayrı vermek gerekmez.
  */
  width = 'max-w-[480px]',
  containerId = 'layout-main',
  ariaLabel,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const isMiddle = side === 'middle'

  /*
    ORTA PANEL PORTAL (2026-10-16): panel, orta alan kapsayıcısının (#layout-main)
    DOĞRUDAN çocuğu olarak basılır — içerik sarmalayıcısının (#layout-main-content)
    DIŞINDA. Böylece açıkken orta içeriği `inert` yapabiliriz; panelin kendisi
    inert olmaz. Ayrıca `fixed` konumlandırma, arada transform'lu bir ata
    olmadığı için doğru çalışır.
  */
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!isMiddle || !open) {
      setHost(null)
      return
    }
    setHost(document.getElementById(containerId))
  }, [isMiddle, open, containerId])

  /*
    ARKA PLANI ETKİLEŞİME KAPAT (kullanıcı isteği): yalnızca ORTA içerik inert
    olur. Sol/sağ paneller inert OLMASIN (üstte kalıp tıklanabilir kalırlar).
  */
  useEffect(() => {
    if (!isMiddle || !open) {
      return
    }
    const content = document.getElementById(`${containerId}-content`)
    if (!content) {
      return
    }
    content.setAttribute('inert', '')
    return () => content.removeAttribute('inert')
  }, [isMiddle, open, containerId])

  /*
    ODAK KAYBI KÖK NEDENİ (2026-10-16): `onClose` efektin bağımlılığında
    olduğu için, çağıranlar satır içi ok fonksiyonu verdiğinde
    (`onClose={() => setOpen(false)}` → her render'da YENİ referans) bu efekt
    her tuş vuruşunda yeniden çalışıyor ve `dialogRef.current?.focus()`
    input'un odağını panel kapsayıcısına çalıyordu. Çözüm: onClose'u ref'te
    tut, efekti yalnızca `open` değişiminde çalıştır.
  */
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      // Odak tuzağı — yalnızca orta panelde (role=dialog + aria-modal=false).
      if (isMiddle && e.key === 'Tab') {
        const dlg = dialogRef.current
        if (!dlg) {
          return
        }
        const nodes = Array.from(dlg.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!nodes.length) {
          e.preventDefault()
          dlg.focus()
          return
        }
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement
        if (!dlg.contains(active)) {
          e.preventDefault()
          first.focus()
          return
        }
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        }
        else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    const prevOverflow = document.body.style.overflow
    /*
      Orta panel gövde kaydırmasını KİLİTLEMEZ: sol/sağ paneller kullanılabilir
      kalmalı (kullanıcı isteği). Çekmece/modal aynen eskisi gibi kilitler.
    */
    if (!isMiddle) {
      document.body.style.overflow = 'hidden'
    }
    document.addEventListener('keydown', onKey)
    const prevFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => {
      if (!isMiddle) {
        document.body.style.overflow = prevOverflow
      }
      document.removeEventListener('keydown', onKey)
      // Kapanınca odağı açan öğeye geri ver (yalnızca orta panel).
      if (isMiddle && prevFocus && document.contains(prevFocus)) {
        prevFocus.focus()
      }
    }
  }, [open, isMiddle])

  /*
    DIŞINA TIKLAMA (orta panel): kapsayıcının (orta alan) dışına yapılan her
    tıklama paneli kapatır — sol panel, sağ panel ve aradaki boşluk dahil.
    Kapsayıcı yoksa (örn. izole test) yalnızca arka plana tıklama kapatır.
  */
  useEffect(() => {
    if (!open || !isMiddle) {
      return
    }
    const container = document.getElementById(containerId)
    if (!container) {
      return
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) {
        return
      }
      const dlg = dialogRef.current
      if (dlg && dlg.contains(target)) {
        return
      }
      // Popovers rendered through a portal still belong to the drawer. Their
      // DOM is outside both the dialog and layout container, so recognize the
      // explicit layer marker before treating the pointer as an outside click.
      if (target instanceof Element && target.closest('[data-drawer-portal]')) {
        return
      }
      // Orta alanın (Ayarlar + onay penceresi bu ağacın içinde) tıklamaları: kapatma.
      if (container.contains(target)) {
        return
      }
      onCloseRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, isMiddle, containerId])

  // Initial x position depends on which side we're sliding in from.
  const initialX = side === 'right' ? '100%' : '-100%'

  const header = title
    ? (
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
      )
    : null

  const overlay = (
    <AnimatePresence>
      {open && (
        <div
          className={
            isMiddle
              /*
                ORTA PANEL: TopBar'ın altından başlar (`pt-14`), böylece üst
                çubuk erişilebilir kalır. `z-40` — sol panel (`z-50`) ve sağ
                panel üstte kalıp tıklanabilir olur.
              */
              ? 'fixed inset-0 z-40 pt-14'
              : 'fixed inset-0 z-[100]'
          }
        >
          {/*
            Arka plan: eskiden `bg-black` (tamamen opak) → panel açılınca
            sitenin gerisi görünmüyordu. Artık yarı saydam + blur: site
            arkada seçilir kalıyor, tıklayınca yine kapanıyor.
          */}
          <motion.div
            className={
              isMiddle
                ? 'absolute inset-0 bg-black/35 backdrop-blur-[2px]'
                : 'absolute inset-0 bg-black/45 backdrop-blur-[2px]'
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            /*
              aria-modal=false: panel açıkken sol/sağ paneller ETKİN kalır
              (kullanıcı isteği). Çekmece/modal eskisi gibi aria-modal=true.
            */
            aria-modal={isMiddle ? 'false' : 'true'}
            aria-label={isMiddle ? (ariaLabel ?? title) : undefined}
            aria-labelledby={
              !isMiddle && title ? 'drawer-title' : undefined
            }
            tabIndex={-1}
            {...(isMiddle
              ? {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: 8 },
                  transition: { duration: 0.18 },
                }
              : {
                  initial: { x: initialX },
                  animate: { x: 0 },
                  exit: { x: initialX },
                  transition: { type: 'spring', stiffness: 360, damping: 34 },
                })}
            className={
              isMiddle
                ? `absolute inset-[var(--layout-gap)] mx-auto max-w-2xl flex flex-col overflow-hidden rounded-2xl border ${PANEL_SURFACE_BORDER} ${PANEL_SURFACE} shadow-2xl shadow-black/40 outline-none`
                : `absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} flex h-full w-full ${width} flex-col border-${side === 'right' ? 'l' : 'r'} ${PANEL_SURFACE_BORDER} ${PANEL_SURFACE} shadow-2xl shadow-black/40 outline-none`
            }
          >
            {header}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  // Orta panel kapsayıcıya portal edilir; çekmece/modal yerinde kalır.
  if (isMiddle && host) {
    return createPortal(overlay, host)
  }
  return overlay
}
