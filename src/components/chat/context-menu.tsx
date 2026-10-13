'use client'

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/components/ui/cn'

/**
 * İMLEÇ KONUMLU BAĞLAM MENÜSÜ (2026-10-13).
 *
 * Öncesinde iki menü de yanlış yerde açılıyordu:
 *  · kişi menüsü (`PeerMenu`) `absolute top-2 right-2` ile satırın SAĞ ÜST
 *    köşesine çakılıydı ve kaydırılabilir listenin İÇİNDE render edildiği için
 *    uzun listede kırpılabiliyordu,
 *  · mesaj menüsü (`MessageMenu`) tam ekran karartma + ortalanmış diyalogdu.
 * Kullanıcı isteği: menü sağ tıklanan NOKTADA açılsın, kenara taşarsa içeri
 * kaydırılsın, klavyeyle gezilebilsin.
 *
 * Bu bileşen konum + taşma düzeltmesi + kapatma kuralları + erişilebilirliği
 * tek yerde toplar; içerik (satırlar, takma ad formu) çağıranın elinde kalır.
 * `fixed` konumlandığı için kaydırılan bir ata içinde kırpılmaz.
 */

/** Kenardan bırakılacak en az boşluk (px). */
const EDGE = 8
const GAP = 4

export function MenuSurface({ x, y, onClose, label, children }: {
  x: number
  y: number
  onClose: () => void
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  /**
   * İlk boyama GİZLİ: menünün gerçek ölçüsü ancak DOM'a girdikten sonra
   * bilinir, o yüzden "önce ölç, sonra yaz" yapılır (`useLayoutEffect`).
   * Aksi hâlde menü bir kare yanlış yerde görünüp zıplıyordu.
   */
  const [pos, setPos] = useState<{ left: number, top: number, ready: boolean }>({ left: x, top: y, ready: false })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const { width, height } = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Sağdan/alttan taşıyorsa imlecin SOLUNA/YUKARISINA aç (viewport clamp).
    const left = x + width + EDGE > vw ? Math.max(EDGE, x - width - GAP) : Math.max(EDGE, x)
    const top = y + height + EDGE > vh ? Math.max(EDGE, y - height - GAP) : Math.max(EDGE, y)
    setPos({ left, top, ready: true })
  }, [x, y])

  /** Odağı açan öğeyi sakla; kapanışta geri ver. */
  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null
    return () => {
      restoreTo.current?.focus?.()
    }
  }, [])

  /**
   * Açılışta ilk maddeye odaklan. `pos.ready` BEKLENİR: menü ilk karede
   * `visibility: hidden` (yanlış konumda parlamasın diye) ve GİZLİ öğe
   * odaklanamaz — ÖLÇÜLDÜ (2026-10-13, gerçek Chromium): odak erken
   * çağrılınca hiç odaklanmıyor, sağ tık sonrası ok tuşları ölü kalıyordu
   * (`document.activeElement` `<body>`'de kalıyordu).
   */
  useEffect(() => {
    if (!pos.ready) {
      return
    }
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
  }, [pos.ready])

  /** Esc · dışarı tıklama · kaydırma · pencere boyutu değişimi → kapat. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        onClose()
      }
    }
    const onScrollOrResize = () => onClose()
    // `capture`: menünün kendi kapsayıcıları da kaydırma olayı üretir.
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [onClose])

  /** Ok tuşlarıyla gezme (rol="menu" sözleşmesi). Enter/Space yerleşik çalışır. */
  const onKeyDown = useCallback((e: ReactKeyboardEvent) => {
    const nodes = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    )
    if (nodes.length === 0) {
      return
    }
    const index = nodes.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      nodes[(index + 1) % nodes.length].focus()
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nodes[(index - 1 + nodes.length) % nodes.length].focus()
    }
    else if (e.key === 'Home') {
      e.preventDefault()
      nodes[0].focus()
    }
    else if (e.key === 'End') {
      e.preventDefault()
      nodes[nodes.length - 1].focus()
    }
    else if (e.key === 'Tab') {
      e.preventDefault()
      onClose()
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      onContextMenu={e => e.preventDefault()}
      className="fixed z-[60] min-w-56 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-xl"
      style={{ left: pos.left, top: pos.top, visibility: pos.ready ? 'visible' : 'hidden' }}
    >
      {children}
    </div>
  )
}

/** Menü satırı. Kapatma kararı `onSelect` geri çağrısının içindedir. */
export function MenuItem({ icon, label, danger, disabled, onSelect }: {
  icon?: ReactNode
  label: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => onSelect()}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
        danger ? 'text-red-500 hover:bg-red-500/10' : 'hover:bg-foreground/10',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

/** Menü başlığı (kimin menüsü olduğunu söyler) — opsiyonel. */
export function MenuHeader({ text, onClose, closeLabel }: {
  text: string
  onClose: () => void
  closeLabel: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-foreground/10 px-4 py-2">
      <p className="min-w-0 truncate text-xs text-foreground-500">{text}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="shrink-0 cursor-pointer rounded px-1 text-xs hover:bg-foreground/10"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Menü açılacak nokta: imleç varsa orası, yoksa (klavyeyle `Menü` tuşu veya
 * Shift+F10 → `clientX/Y` sıfırdır) hedef öğenin sol üst köşesi. Aksi hâlde
 * menü ekranın (0,0) köşesinde açılırdı.
 */
export function menuPoint(e: { clientX: number, clientY: number, currentTarget: Element }) {
  if (e.clientX || e.clientY) {
    return { x: e.clientX, y: e.clientY }
  }
  const rect = e.currentTarget.getBoundingClientRect()
  return { x: rect.left + 8, y: rect.top + 8 }
}

/**
 * UZUN BASMA (mobil): sağ tık yerine ~500 ms basılı tutunca menü açılır.
 * Parmak 10 px'den fazla kayarsa (listeyi kaydırma niyeti) iptal edilir —
 * kaydırırken menü açılmaz.
 *
 * Olay tabanlı (tek kapsayıcıya takılır, satır başına hook YOK): satır listeleri
 * `.map()` içinde üretildiği için hook'u satır başına çağırmak kural dışıdır.
 * Bu yüzden dokunulan öğe (`e.target`) geri çağrıya verilir; çağıran
 * `closest('[data-...]')` ile hangi satıra denk geldiğini bulur.
 */
export function useLongPress(
  onLongPress: (x: number, y: number, target: Element | null) => void,
  ms = 500,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const target = useRef<Element | null>(null)
  const fired = useRef(false)

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => cancel, [cancel])

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      // Fare sağ tıkla açıyor; uzun basma yalnız dokunma/kalem için.
      if (e.pointerType === 'mouse') {
        return
      }
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      target.current = e.target as Element
      cancel()
      timer.current = setTimeout(() => {
        timer.current = null
        fired.current = true
        onLongPress(origin.current.x, origin.current.y, target.current)
      }, ms)
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (!timer.current) {
        return
      }
      if (Math.abs(e.clientX - origin.current.x) > 10 || Math.abs(e.clientY - origin.current.y) > 10) {
        cancel()
      }
    },
    // Parmak süre dolmadan kalkarsa/kaydırma devralınırsa iptal — yoksa
    // "kısa dokunma" da menü açardı.
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    /** Uzun basmadan sonra gelen click'i yut: menü açılırken satır seçilmesin. */
    onClickCapture: (e: ReactMouseEvent) => {
      if (fired.current) {
        e.preventDefault()
        e.stopPropagation()
        fired.current = false
      }
    },
  }
}
