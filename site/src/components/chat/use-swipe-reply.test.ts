import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SWIPE_MAX_SHIFT, SWIPE_REPLY_THRESHOLD, swipeShift, useSwipeReply } from './use-swipe-reply'

/**
 * SAĞA KAYDIRARAK YANITLA (2026-10-16 kullanıcı isteği: "mobilde mesajı sağa
 * kaydırınca yanıtlama başlasın, dikey scroll bozulmasın").
 *
 * Kurallar burada sabitlenir; hook DOM'a olay tabanlı takılır (`transform`
 * doğrudan yazılır, React state'i yok).
 */
describe('swipeShift', () => {
  it('eşiğin altında parmakla birebir kayar', () => {
    expect(swipeShift(10)).toBe(10)
    expect(swipeShift(SWIPE_REPLY_THRESHOLD)).toBe(SWIPE_REPLY_THRESHOLD)
  })

  it('eşiğin üstünde dirençlidir (yumuşatılmış), üst sınırı aşmaz', () => {
    const shift = swipeShift(SWIPE_REPLY_THRESHOLD + 100)
    expect(shift).toBeGreaterThan(SWIPE_REPLY_THRESHOLD)
    expect(shift).toBeLessThan(SWIPE_MAX_SHIFT + 1)
    expect(swipeShift(10_000)).toBe(SWIPE_MAX_SHIFT)
  })

  it('sOLA kaydırma yanıtlamaz (tek yön)', () => {
    expect(swipeShift(0)).toBe(0)
    expect(swipeShift(-80)).toBe(0)
  })
})

/** Kaydırma testleri için asgari sahte satır: `[data-message-id]` + hint. */
function makeRow() {
  const hint = document.createElement('span')
  hint.dataset.replyHint = ''
  const row = document.createElement('div')
  row.dataset.messageId = 'm1'
  row.appendChild(hint)
  row.style.transform = ''
  return { row, hint }
}

function pointer(type: string, x: number, y = 0, pointerType = 'touch') {
  return { target: null, clientX: x, clientY: y, pointerType } as never
}

describe('useSwipeReply', () => {
  it('fare ile kaydırma YOK (masaüstünde hover oku + sağ tık var)', () => {
    const onReply = vi.fn()
    const { result } = renderHook(() => useSwipeReply(onReply))
    const { row } = makeRow()
    const down = pointer('down', 0, 0, 'mouse')
    ;(down as { target: unknown }).target = row
    result.current.onPointerDown(down)
    result.current.onPointerMove(pointer('move', 100, 0, 'mouse'))
    result.current.onPointerUp(pointer('up', 100, 0, 'mouse'))
    expect(onReply).not.toHaveBeenCalled()
  })

  it('eşiği geçen sağa kaydırma yanıtı başlatır ve satırı geri alır', () => {
    const onReply = vi.fn()
    const { result } = renderHook(() => useSwipeReply(onReply))
    const { row, hint } = makeRow()
    const down = pointer('down', 0)
    ;(down as { target: unknown }).target = row
    result.current.onPointerDown(down)
    result.current.onPointerMove(pointer('move', 20))
    expect(row.style.transform).toBe('translateX(20px)')
    expect(hint.style.opacity).toBeDefined()
    result.current.onPointerUp(pointer('up', SWIPE_REPLY_THRESHOLD + 5))
    expect(onReply).toHaveBeenCalledWith('m1')
    // bırakınca kaydırma sıfırlanır (satır eski yerinde kalır)
    expect(row.style.transform).toBe('')
  })

  it('eşiğin ALTINDA bırakılırsa yanıt BAŞLAMAZ', () => {
    const onReply = vi.fn()
    const { result } = renderHook(() => useSwipeReply(onReply))
    const { row } = makeRow()
    const down = pointer('down', 0)
    ;(down as { target: unknown }).target = row
    result.current.onPointerDown(down)
    result.current.onPointerMove(pointer('move', SWIPE_REPLY_THRESHOLD - 10))
    result.current.onPointerUp(pointer('up', SWIPE_REPLY_THRESHOLD - 10))
    expect(onReply).not.toHaveBeenCalled()
  })

  /*
    EN KRİTİK KURAL: dikey kaydırma niyeti kazanırsa yanıtlama iptal edilir ve
    satır kaymaz. Aksi hâlde liste kaydırmak isteyen kullanıcı istemeden yanıt
    başlatırdı.
  */
  it('dikey niyet (|dy| ≥ |dx|) kaydırmayı iptal eder — liste normal kayar', () => {
    const onReply = vi.fn()
    const { result } = renderHook(() => useSwipeReply(onReply))
    const { row } = makeRow()
    const down = pointer('down', 0, 0)
    ;(down as { target: unknown }).target = row
    result.current.onPointerDown(down)
    result.current.onPointerMove(pointer('move', 4, -40))
    expect(row.style.transform).toBe('')
    result.current.onPointerUp(pointer('up', 80, -40))
    expect(onReply).not.toHaveBeenCalled()
  })

  it('satır dışında başlayan dokunma yok sayılır', () => {
    const onReply = vi.fn()
    const { result } = renderHook(() => useSwipeReply(onReply))
    const outside = document.createElement('div')
    const down = pointer('down', 0)
    ;(down as { target: unknown }).target = outside
    result.current.onPointerDown(down)
    result.current.onPointerMove(pointer('move', 200))
    result.current.onPointerUp(pointer('up', 200))
    expect(onReply).not.toHaveBeenCalled()
  })
})
