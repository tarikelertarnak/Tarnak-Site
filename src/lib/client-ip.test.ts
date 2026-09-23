import { describe, expect, it } from 'vitest'

import { clientIp } from '@/lib/client-ip'

/**
 * Istemci IP'si testleri — GUVENLIK odakli.
 *
 * Bu mantik 4 dosyada kopyalanmisti ve ikisi YANLISTI (ILK XFF degerini
 * aliyorlardi). Sonuc: sohbet 10 sn bekleme suresi ve dosya yukleme siniri
 * `X-Forwarded-For` uydurularak atlatilabiliyordu.
 *
 * Kilit iddia: XFF'in ILK degeri ASLA kullanilmamali — Cloudflare basa
 * istemcinin gonderdigi degeri koyar, gercek IP sona eklenir.
 */

function req(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/x', { headers })
}

describe('clientIp', () => {
  it('header yoksa unknown doner', () => {
    expect(clientIp(req())).toBe('unknown')
  })

  it('tek degerli XFF kullanilir', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5')
  })

  // ------------------------------------------------------- GUVENLIK

  it('XFF cokluysa SON degeri alir (Cloudflare sona ekler) — SPOOF ENGELI', () => {
    // Saldirgan basa "9.9.9.9" koymus; gercek IP Cloudflare'in ekledigi son deger
    expect(clientIp(req({ 'x-forwarded-for': '9.9.9.9, 203.0.113.5' })))
      .toBe('203.0.113.5')
  })

  it('her istekte farkli SAHTE ilk deger gonderilse bile ayni IP doner (kilit atlatilamaz)', () => {
    const a = clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.5' }))
    const b = clientIp(req({ 'x-forwarded-for': '2.2.2.2, 203.0.113.5' }))
    const c = clientIp(req({ 'x-forwarded-for': '3.3.3.3, 203.0.113.5' }))
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a).toBe('203.0.113.5')
  })

  it('XFF varken cf-connecting-ip yok sayilir (Vercel\'de istemci uydurabilir)', () => {
    // Vercel cf-connecting-ip YAZMAZ → istemci kendisi gonderebilir.
    // XFF (platform tarafindan ezilir) daha guvenilir oldugu icin o kazanmali.
    expect(clientIp(req({
      'x-forwarded-for': '203.0.113.5',
      'cf-connecting-ip': '9.9.9.9',
    }))).toBe('203.0.113.5')
  })

  it('XFF yoksa cf-connecting-ip yedek olarak kullanilir', () => {
    expect(clientIp(req({ 'cf-connecting-ip': '198.51.100.7' }))).toBe('198.51.100.7')
  })

  it('XFF ve cf yoksa x-real-ip kullanilir', () => {
    expect(clientIp(req({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9')
  })

  it('gecersiz degerler yok sayilir', () => {
    expect(clientIp(req({ 'x-forwarded-for': 'not-an-ip' }))).toBe('unknown')
    expect(clientIp(req({ 'cf-connecting-ip': 'kotu' }))).toBe('unknown')
    // Bos XFF → sonraki kaynaga duser
    expect(clientIp(req({ 'x-forwarded-for': '', 'cf-connecting-ip': '198.51.100.7' })))
      .toBe('198.51.100.7')
  })

  it('IPv6 adresleri kabul eder', () => {
    expect(clientIp(req({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1')
  })

  it('bosluklu XFF degerlerini temizler', () => {
    expect(clientIp(req({ 'x-forwarded-for': '  9.9.9.9 ,  203.0.113.5  ' })))
      .toBe('203.0.113.5')
  })
})
