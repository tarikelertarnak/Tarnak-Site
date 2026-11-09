'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useRef } from 'react'

/**
 * SAĞA KAYDIRARAK YANITLA (mobil/dokunmatik, 2026-10-16 kullanıcı isteği).
 *
 * Kullanıcı: "mobil/dokunmatikte mesajı sağa kaydırınca (swipe, ~60px eşik,
 * hafif titreşim ve yanıt ikonu animasyonuyla) yanıtlama başlasın. Dikey
 * scroll'u bozma."
 *
 * Tasarım (neden böyle):
 *  · Olay tabanlı TEK kapsayıcıya takılır — mesajlar `.map()` içinde üretildiği
 *    için satır başına hook çağırmak React kuralına aykırı olurdu (desen:
 *    `useLongPress`, `context-menu.tsx`).
 *  · Dokunulan satır `[data-message-id]` ile bulunur; kaydırma sırasında yalnız
 *    o satır `transform` ile kaydırılır (React state'i YOK → her karede yeniden
 *    render olmaz, kaydırma akıcı kalır).
 *  · DİKEY niyet (|dy| > |dx| ve eşiği geçti) → kaydırma iptal edilir, liste
 *    normal kaydırılır. Yatay niyet ancak |dx| > 10 px olunca "kilitlenir".
 *  · Eşik aşıldığında `navigator.vibrate(10)` — desteklemeyen tarayıcıda sessiz.
 *
 * Dönüş değeri doğrudan liste kapsayıcısına yayılır (`{...handlers}`).
 */

/** Yanıtlamayı başlatan yatay kaydırma eşiği (px). */
export const SWIPE_REPLY_THRESHOLD = 60
/** Yatay niyetin kilitlendiği en küçük kayma (px). */
const SWIPE_LOCK = 10
/** Satırın en fazla kayacağı mesafe (px). */
export const SWIPE_MAX_SHIFT = 88
/** Dikey kaydırma niyeti eşiği (px). */
const VERTICAL_INTENT = 12

interface SwipeState {
  row: HTMLElement
  messageId: string
  hint: HTMLElement | null
  startX: number
  startY: number
  locked: boolean
  buzzed: boolean
}

/**
 * Kaydırma miktarından satırın kayma mesafesini üretir (saf; test edilebilir).
 * Eşiğin altında parmakla birebir, üstünde yumuşatılmış (dirençli) büyür.
 */
export function swipeShift(dx: number): number {
  if (dx <= 0) {
    return 0
  }
  if (dx <= SWIPE_REPLY_THRESHOLD) {
    return dx
  }
  const overflow = dx - SWIPE_REPLY_THRESHOLD
  return Math.min(SWIPE_MAX_SHIFT, SWIPE_REPLY_THRESHOLD + overflow * 0.35)
}

export function useSwipeReply(onReply: (messageId: string) => void) {
  const state = useRef<SwipeState | null>(null)

  const reset = useCallback(() => {
    const s = state.current
    if (!s) {
      return
    }
    s.row.style.transform = ''
    if (s.hint) {
      s.hint.style.opacity = ''
      s.hint.style.transform = ''
    }
    state.current = null
  }, [])

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      // Fare: hover butonu ve sağ tık menüsü var — kaydırma yalnız dokunma/kalem.
      if (e.pointerType === 'mouse') {
        return
      }
      const row = (e.target as Element | null)?.closest<HTMLElement>('[data-message-id]')
      if (!row) {
        return
      }
      state.current = {
        row,
        messageId: row.dataset.messageId ?? '',
        hint: row.querySelector<HTMLElement>('[data-reply-hint]'),
        startX: e.clientX,
        startY: e.clientY,
        locked: false,
        buzzed: false,
      }
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const s = state.current
      if (!s) {
        return
      }
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      if (!s.locked) {
        // Dikey niyet → bu bir liste kaydırmasıdır, yanıt değil.
        if (Math.abs(dy) > VERTICAL_INTENT && Math.abs(dy) >= Math.abs(dx)) {
          state.current = null
          return
        }
        if (dx <= SWIPE_LOCK) {
          return
        }
        s.locked = true
      }
      const shift = swipeShift(dx)
      s.row.style.transform = shift ? `translateX(${shift}px)` : ''
      if (s.hint) {
        const progress = Math.min(1, shift / SWIPE_REPLY_THRESHOLD)
        s.hint.style.opacity = String(progress)
        s.hint.style.transform = `scale(${0.7 + progress * 0.3})`
      }
      if (!s.buzzed && shift >= SWIPE_REPLY_THRESHOLD) {
        s.buzzed = true
        navigator.vibrate?.(10)
      }
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const s = state.current
      if (!s) {
        return
      }
      const reached = s.locked && e.clientX - s.startX >= SWIPE_REPLY_THRESHOLD
      const id = s.messageId
      reset()
      if (reached && id) {
        onReply(id)
      }
    },
    onPointerCancel: reset,
    // Kaydırma sırasında tarayıcının kendi jesti/metin seçimi araya girmesin.
    onPointerLeave: () => reset(),
  }
}
