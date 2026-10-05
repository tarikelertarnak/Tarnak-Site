import { beforeEach, describe, expect, it } from 'vitest'
import { LIMITS, checkLimit, rateLimitResponse, resetLimits } from '@/lib/rate-limit-kv'

/**
 * KV hız sınırlayıcı — test ortamı KV binding'siz çalışır, dolayısıyla
 * in-memory fallback yolu test edilir. Fallback İSTEĞİ EŞDEĞERDİR: aynı
 * sayaç mantığı, `authoritative: false` farkı.
 *
 * Gerçek KV yolu production'da `getCloudflareContext()` ile açılır; aynı
 * `kvFixedWindow` fonksiyonunu kullanır.
 */
function req(ip: string): Request {
  // `cf-connecting-ip` Cloudflare'ın yazdığı güvenilir kaynak.
  return new Request('https://example.test/api/x', {
    headers: { 'cf-connecting-ip': ip },
  })
}

beforeEach(() => {
  resetLimits()
})

describe('checkLimit', () => {
  it('limitin altındaki istekleri geçirir ve kalanı bildirir', async () => {
    const r1 = await checkLimit('chat', LIMITS.chat, req('1.1.1.1'))
    expect(r1.ok).toBe(true)
    expect(r1.remaining).toBe(LIMITS.chat.limit - 1)

    const r2 = await checkLimit('chat', LIMITS.chat, req('1.1.1.1'))
    expect(r2.ok).toBe(true)
    expect(r2.remaining).toBe(LIMITS.chat.limit - 2)
  })

  it('limit aşılınca reddeder ve retryAfter döner', async () => {
    const ip = '2.2.2.2'
    for (let i = 0; i < LIMITS.chat.limit; i++) {
      const r = await checkLimit('chat', LIMITS.chat, req(ip))
      expect(r.ok, `istek ${i + 1} geçmeliydi`).toBe(true)
    }

    const over = await checkLimit('chat', LIMITS.chat, req(ip))
    expect(over.ok).toBe(false)
    expect(over.remaining).toBe(0)
    expect(over.retryAfter).toBeGreaterThan(0)
    expect(over.retryAfter).toBeLessThanOrEqual(LIMITS.chat.windowMs / 1000)
  })

  it('farklı IP birbirini etkilemez', async () => {
    for (let i = 0; i < LIMITS.chat.limit; i++) {
      await checkLimit('chat', LIMITS.chat, req('3.3.3.3'))
    }
    expect((await checkLimit('chat', LIMITS.chat, req('3.3.3.3'))).ok).toBe(false)
    // Aynı ağdaki başka kullanıcı engellenmemeli — kullanıcı isteği.
    expect((await checkLimit('chat', LIMITS.chat, req('4.4.4.4'))).ok).toBe(true)
  })

  it('farklı scope birbirini etkilemez', async () => {
    for (let i = 0; i < LIMITS.chat.limit; i++) {
      await checkLimit('chat', LIMITS.chat, req('5.5.5.5'))
    }
    expect((await checkLimit('chat', LIMITS.chat, req('5.5.5.5'))).ok).toBe(false)
    // İletişim formu kendi kotalı.
    expect((await checkLimit('contact', LIMITS.contact, req('5.5.5.5'))).ok).toBe(true)
  })

  it('extra anahtarı ayırır (sayaç: IP + proje)', async () => {
    // stars: aynı IP farklı proje için AYRI kova.
    expect((await checkLimit('stars', LIMITS.counter, req('6.6.6.6'), 'proje-a')).ok).toBe(true)
    // Aynı proje ikinci kez → sayaç kovası dolu.
    expect((await checkLimit('stars', LIMITS.counter, req('6.6.6.6'), 'proje-a')).ok).toBe(false)
    // Farklı proje → kendi kovası boş.
    expect((await checkLimit('stars', LIMITS.counter, req('6.6.6.6'), 'proje-b')).ok).toBe(true)
  })

  it('IP yoksa limiti yarıya indirir (unknown anahtarı)', async () => {
    // `req` olmadan: anahtar 'anonymous', daha sıkı sınır.
    const r = await checkLimit('chat', LIMITS.chat)
    expect(r.limit).toBe(Math.floor(LIMITS.chat.limit / 2))
  })

  it('sayfa yenilemeleri kovayı tüketmez', async () => {
    // Aynı pencere içinde 3 istek → hâlâ kalan var.
    for (let i = 0; i < 3; i++) {
      const r = await checkLimit('contact', LIMITS.contact, req('7.7.7.7'))
      expect(r.ok).toBe(true)
    }
    const last = await checkLimit('contact', LIMITS.contact, req('7.7.7.7'))
    expect(last.remaining).toBe(LIMITS.contact.limit - 4)
  })
})

describe('rateLimitResponse', () => {
  it('429 + Retry-After + X-RateLimit-* + kısa JSON döner', async () => {
    for (let i = 0; i < LIMITS.chat.limit; i++) {
      await checkLimit('chat', LIMITS.chat, req('8.8.8.8'))
    }
    const result = await checkLimit('chat', LIMITS.chat, req('8.8.8.8'))
    const res = rateLimitResponse(result)

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe(String(result.retryAfter))
    expect(res.headers.get('X-RateLimit-Limit')).toBe(String(LIMITS.chat.limit))
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(Number(res.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(0)
    // Yanıt başlıkları önbelleklenmemeli.
    expect(res.headers.get('Cache-Control')).toBe('no-store')

    await expect(res.json()).resolves.toEqual({
      error: 'rate_limited',
      retryAfter: result.retryAfter,
    })
  })

  it('gövdede stack trace veya iç detay yok', async () => {
    const res = rateLimitResponse({
      ok: false,
      authoritative: false,
      limit: 10,
      remaining: 0,
      retryAfter: 42,
      resetAt: Date.now() + 42_000,
    })
    const body = await res.text()
    expect(body).not.toMatch(/at |Error:|\.ts:\d+|node_modules/)
    expect(body.length).toBeLessThan(120)
  })
})

describe('limit tanimlari', () => {
  it('kullanici istegi degerlerini birebir uygular', () => {
    // Chat: dakikada 10, saatte 60
    expect(LIMITS.chat).toEqual({ limit: 10, windowMs: 60_000 })
    expect(LIMITS.chatHourly).toEqual({ limit: 60, windowMs: 3_600_000 })
    // İletişim: saatte 5
    expect(LIMITS.contact).toEqual({ limit: 5, windowMs: 3_600_000 })
    // Sayaç: IP + proje başına saatte 1
    expect(LIMITS.counter).toEqual({ limit: 1, windowMs: 3_600_000 })
    // Diğer yazma: dakikada 20
    expect(LIMITS.write).toEqual({ limit: 20, windowMs: 60_000 })
  })

  it('gövde sinirlari tanimli', async () => {
    const { BODY_LIMITS } = await import('@/lib/rate-limit-kv')
    expect(BODY_LIMITS.chatMessageChars).toBe(2000)
    expect(BODY_LIMITS.maxOutputTokens).toBe(500)
  })
})
