import { describe, expect, it } from 'vitest'
import {
  TICK_FAILED_COLOR,
  TICK_PENDING_COLOR,
  TICK_READ_COLOR,
  TICK_SENDING_COLOR,
  tickFor,
} from './chat-ticks'

/**
 * Tik kuralı (2026-10-16, kullanıcı isteğiyle YENİDEN):
 *   "gri (soluk) = gönderildi/iletildi, mavi = okundu. Yeşil kullanma."
 * Yani renk = "karşı taraf gördü mü?"; tik sayısı = gönderildi/teslim ayrımı.
 */
describe('tickFor — gönderildi / teslim edildi / okundu', () => {
  it('yalnızca gönderildi → SOLUK ve TEK tik', () => {
    const t = tickFor({ delivered_at: null, read_at: null })
    expect(t.color).toBe(TICK_PENDING_COLOR)
    expect(t.double).toBe(false)
    expect(t.labelKey).toBe('chat.sentAt')
  })

  it('teslim edildi (henüz okunmadı) → hâlâ SOLUK, ama ÇİFT tik', () => {
    const t = tickFor({ delivered_at: '2026-10-12T10:00:00.000Z', read_at: null })
    expect(t.color).toBe(TICK_PENDING_COLOR)
    expect(t.double).toBe(true)
    expect(t.labelKey).toBe('chat.deliveredAt')
  })

  it('okundu → MAVİ ve ÇİFT tik', () => {
    const t = tickFor({
      delivered_at: '2026-10-12T10:00:00.000Z',
      read_at: '2026-10-12T10:01:00.000Z',
    })
    expect(t.color).toBe(TICK_READ_COLOR)
    expect(t.color).toBe('text-sky-300')
    expect(t.double).toBe(true)
    expect(t.labelKey).toBe('chat.readAt')
  })

  // Okundu damgası teslim damgasından bağımsız gelirse bile "okundu" kazanır:
  // renk sorusu "görüldü mü?" — görülmüşse mavi olmalı.
  it('read_at dolu + delivered_at boş → MAVİ (okundu önceliği)', () => {
    const t = tickFor({ delivered_at: null, read_at: '2026-10-12T10:01:00.000Z' })
    expect(t.color).toBe(TICK_READ_COLOR)
    expect(t.double).toBe(true)
  })

  // Kullanıcının kuralı bu iki rengin AYRI olmasına dayanır.
  it('soluk ve mavi ayrı renklerdir', () => {
    expect(TICK_PENDING_COLOR).not.toBe(TICK_READ_COLOR)
  })

  it('yEŞİL ve SARI hiç kullanılmaz (kullanıcı isteği)', () => {
    for (const cls of [TICK_PENDING_COLOR, TICK_READ_COLOR, TICK_SENDING_COLOR, TICK_FAILED_COLOR]) {
      expect(cls).not.toMatch(/green|amber|yellow|lime|emerald/)
    }
  })

  // Tema kuralı (AGENTS.md): tik SABİT renk kullanır ama sabit siyah/beyaz
  // DEĞİL — balon iki temada da mavi (`bg-primary`) ve tikler ya yarı saydam
  // metin rengi (`/60`) ya da mavi tonudur.
  it('tik renkleri sabit siyah/beyaz değil', () => {
    for (const cls of [TICK_PENDING_COLOR, TICK_READ_COLOR, TICK_SENDING_COLOR, TICK_FAILED_COLOR]) {
      expect(cls).not.toMatch(/text-(white|black)\b/)
    }
  })
})

/**
 * İyimser gönderim: mesaj sunucudan dönene kadar "saat", hata olursa kırmızı
 * ünlem. HİÇBİR ZAMAN doğrudan çift tikle başlamaz — bu, kullanıcının
 * şikâyetinin tam kalbidir (hiç görülmemiş mesajda çift tik).
 */
describe('tickFor — iyimser gönderim', () => {
  it('pending → saat (tek tik), damgalar boş olsa bile', () => {
    const t = tickFor({ delivered_at: null, read_at: null }, { pending: true })
    expect(t.double).toBe(false)
    expect(t.color).toBe(TICK_SENDING_COLOR)
    expect(t.labelKey).toBe('chat.sendingTick')
  })

  it('failed → kırmızı ünlem; sunucu damgası varsa bile kazanır', () => {
    const t = tickFor(
      { delivered_at: '2026-10-12T10:00:00.000Z', read_at: '2026-10-12T10:01:00.000Z' },
      { failed: true },
    )
    expect(t.double).toBe(false)
    expect(t.color).toBe(TICK_FAILED_COLOR)
    expect(t.labelKey).toBe('chat.sendFailedTick')
  })

  it('optimistic mesaj ASLA doğrudan okundu (mavi çift tik) değildir', () => {
    const optimistic = { delivered_at: null, read_at: null }
    expect(tickFor(optimistic, { pending: true }).color).toBe(TICK_SENDING_COLOR)
    expect(tickFor(optimistic).color).toBe(TICK_PENDING_COLOR)
    // İkisi de mavi DEĞİL.
    expect(tickFor(optimistic, { pending: true }).color).not.toBe(TICK_READ_COLOR)
    expect(tickFor(optimistic).color).not.toBe(TICK_READ_COLOR)
  })
})
