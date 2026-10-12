import { describe, expect, it } from 'vitest'
import { TICK_PENDING_COLOR, TICK_READ_COLOR, tickFor } from './chat-ticks'

/**
 * Tik kuralı (2026-10-12, kullanıcı isteği):
 *   "sadece gönderildiyse SARI, görüldüyse YEŞİL"
 * Yani renk = "karşı taraf gördü mü?"; tik sayısı = gönderildi/teslim ayrımı.
 */
describe('tickFor — gönderildi / teslim edildi / okundu', () => {
  it('yalnızca gönderildi → SARI ve TEK tik', () => {
    const t = tickFor({ delivered_at: null, read_at: null })
    expect(t.color).toBe(TICK_PENDING_COLOR)
    expect(t.color).toBe('text-amber-400')
    expect(t.double).toBe(false)
    expect(t.labelKey).toBe('chat.sentAt')
  })

  it('teslim edildi (henüz okunmadı) → hâlâ SARI, ama ÇİFT tik', () => {
    const t = tickFor({ delivered_at: '2026-10-12T10:00:00.000Z', read_at: null })
    expect(t.color).toBe(TICK_PENDING_COLOR)
    expect(t.double).toBe(true)
    expect(t.labelKey).toBe('chat.deliveredAt')
  })

  it('okundu → YEŞİL ve ÇİFT tik', () => {
    const t = tickFor({
      delivered_at: '2026-10-12T10:00:00.000Z',
      read_at: '2026-10-12T10:01:00.000Z',
    })
    expect(t.color).toBe(TICK_READ_COLOR)
    expect(t.color).toBe('text-green-400')
    expect(t.double).toBe(true)
    expect(t.labelKey).toBe('chat.readAt')
  })

  // Okundu damgası teslim damgasından bağımsız gelirse bile "okundu" kazanır:
  // renk sorusu "görüldü mü?" — görülmüşse yeşil olmalı.
  it('read_at dolu + delivered_at boş → YEŞİL (okundu önceliği)', () => {
    const t = tickFor({ delivered_at: null, read_at: '2026-10-12T10:01:00.000Z' })
    expect(t.color).toBe(TICK_READ_COLOR)
    expect(t.double).toBe(true)
  })

  // Kullanıcının kuralı bu iki rengin AYRI olmasına dayanır.
  it('sarı ve yeşil ayrı renklerdir', () => {
    expect(TICK_PENDING_COLOR).not.toBe(TICK_READ_COLOR)
  })

  // Tema kuralı (AGENTS.md): koyu temada siyah, açık temada beyaz yazı yok.
  // Tik SABİT renk kullanır ama sabit siyah/beyaz DEĞİL — balon iki temada da
  // mavi (`bg-primary`), o yüzden okunurluk temaya göre değişmez.
  it('tik renkleri sabit siyah/beyaz değil', () => {
    for (const cls of [TICK_PENDING_COLOR, TICK_READ_COLOR]) {
      expect(cls).not.toMatch(/text-(white|black)\b/)
    }
  })
})
