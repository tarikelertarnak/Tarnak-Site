'use client'

/**
 * `usePopoverPosition` — portal ile konumlandırılmış açılır menü.
 *
 * `contact-quick-menu` ve `searchable-combobox` ("Sürüm seç") aynı
 * davranışı istiyor:
 *   - butonun hemen altında, çok az boşlukla
 *   - sığmazsa üst → sağ → sol
 *   - HİÇBİR durumda butonun üstüne binmemeli, ekrandan taşmamalı
 *
 * Çözümleyici: `src/lib/popover-position.ts` (saf fonksiyon, test edilebilir).
 * Burada yalnızca DOM ölçümü + portal var.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  computePopoverPosition,
  type PopoverPlacement,
  type PopoverPosition,
} from '@/lib/popover-position'

/** Panelin DOM'a ilk çizimi (genişlik/yükseklik ölçümü için). */
export function usePopoverPosition<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  gap = 6,
) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<T | null>(null)
  const [pos, setPos] = useState<PopoverPosition | null>(null)

  /**
   * Panelin kendi boyutunu okuyup konumu hesapla.
   *
   * Panel ÖNCE görünmez (ölçüm) olarak render edilir, sonra ölçülen
   * boyutla konumlanır. İki geçiş ŞART: ilk render'da panel DOM'da
   * olmadığı için `getBoundingClientRect()` 0 dönerdi.
   */
  const recalc = useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return

    const r = trigger.getBoundingClientRect()
    const p = panel.getBoundingClientRect()

    /*
      ÖLÇÜM SIFIR DÖNSE BİLE KONUM HESAPLANIR.
      (Eski kod `r.width === 0 && r.height === 0` ise erken dönüyordu;
      JSDOM'da tüm rect'ler 0 olduğu için panel kalıcı `visibility:hidden`
      kalıyor ve 22 test "role=menu bulunamadı" ile kırılıyordu.)
      Gerçek tarayıcıda görünür bir tetikleyicinin rect'i asla 0 değildir;
      sıfır durumu yalnızca yerleşimsiz ortamda (jsdom/SSR) olur ve orada
      konum anlamsız ama panel GÖRÜNÜR kalmalı — aksi halde içeriğe
      hiç erişilemez.
    */
    setPos(computePopoverPosition(
      { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
      { width: p.width, height: p.height },
      { width: window.innerWidth, height: window.innerHeight },
      { gap },
    ))
  }, [gap])

  /*
    Ölçüm ve konumlandırma.

    Neden `useLayoutEffect` + `ResizeObserver`, neden `requestAnimationFrame`
    DEĞİL: rAF güvenilir değil — headless/CDP ve gizli sekmede callback
    gecikiyor ya da hiç çalışmıyordu (ilk denemede panel `pos=null`
    kaldı, `visibility:hidden` ile ekranda görünmedi).

    `useLayoutEffect` DOM commit'inden SONRA çalışır; yani tetikleyici ve
    panel ref'leri bu noktada kesinlikle atanmıştır. Ölçüm senkron yapılır,
    `setPos` ile konum uygulanır. Layout effect olduğu için tarayıcı boya
    yapmadan önce biter → konumsuz geçen kare KULLANICIYA GÖRÜNMEZ.

    `ResizeObserver` `observe()` çağrısında BİR KEZ ZATEN tetiklenir; bu
    hem ilk ölçümü garantiler hem de liste uzayıp kısaldığında
    konumu tazeler.
  */
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const panel = panelRef.current
    const trigger = triggerRef.current
    if (!panel || !trigger) return

    const apply = () => recalc()
    apply()

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(apply)
      ro.observe(panel)
      return () => ro.disconnect()
    }
  }, [open, recalc])

  // Kaydirma/ekran boyutu degisince yeniden konumla (portal fixed).
  useEffect(() => {
    if (!open) return
    const onViewport = () => recalc()
    window.addEventListener('resize', onViewport)
    window.addEventListener('scroll', onViewport, true)
    return () => {
      window.removeEventListener('resize', onViewport)
      window.removeEventListener('scroll', onViewport, true)
    }
  }, [open, recalc])

  const portalStyle: React.CSSProperties = pos
    ? {
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        maxHeight: `${pos.maxHeight}px`,
        maxWidth: `${pos.maxWidth}px`,
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        // Ölçüm karesi: ekranda GORUNMEZ ama DOM'da ve olculebilir.
        visibility: 'hidden',
        pointerEvents: 'none',
      }

  return {
    triggerRef,
    panelRef,
    /** true → ölçüldü VE konum hesaplandı. */
    ready: pos !== null,
    placement: pos?.placement as PopoverPlacement | undefined,
    portalStyle,
    recalc,
  }
}