import { describe, expect, it } from 'vitest'

import {
  isViewComplete,
  issueViewToken,
  requiredWatchSeconds,
  verifyViewToken,
  viewTokenState,
} from '@/lib/ads'

/**
 * Reklam token'larinin guvenlik davranisi.
 *
 * Neden onemli: izlenme sayaci para/destek mantigina bagli. Istemci "izledim"
 * dediginde buna guvenilirse `curl` ile saniyeler icinde binlerce sahte izlenme
 * yazilabilir. Bu testler o kapinin kapali oldugunu kanitlar.
 */

const DURATION = 15

describe('issueViewToken / verifyViewToken', () => {
  it('uretilen token dogrulanabiliyor ve alanlari koruyor', () => {
    const token = issueViewToken('pixelshield', DURATION, 'image')
    const payload = verifyViewToken(token)

    expect(payload).not.toBeNull()
    expect(payload?.slotId).toBe('pixelshield')
    expect(payload?.durationSeconds).toBe(DURATION)
    expect(payload?.kind).toBe('image')
    expect(typeof payload?.nonce).toBe('string')
    expect(payload?.nonce.length).toBeGreaterThan(0)
  })

  it('her token icin farkli nonce uretiyor (tekrar oynatma korumasinin temeli)', () => {
    const a = verifyViewToken(issueViewToken('pixelshield', DURATION, 'image'))
    const b = verifyViewToken(issueViewToken('pixelshield', DURATION, 'image'))
    expect(a?.nonce).not.toBe(b?.nonce)
  })

  it('imzasi kurcalanmis token REDDEDILIYOR', () => {
    const token = issueViewToken('pixelshield', DURATION, 'image')
    const [body, sig] = token.split('.')
    const tampered = `${body}.${sig.slice(0, -4)}AAAA`
    expect(verifyViewToken(tampered)).toBeNull()
  })

  it('govdesi degistirilmis token REDDEDILIYOR (sure uzatma denemesi)', () => {
    const token = issueViewToken('pixelshield', DURATION, 'image')
    const sig = token.split('.')[1]

    // Saldirgan suresi 15 sn yerine 0 sn yapip imzayi yeniden kullanmayi dener
    const forgedBody = Buffer.from(JSON.stringify({
      s: 'pixelshield', d: 0, k: 'image', t: Date.now(), n: 'sahte',
    })).toString('base64url')

    expect(verifyViewToken(`${forgedBody}.${sig}`)).toBeNull()
  })

  it('gecersiz girdiler REDDEDILIYOR', () => {
    expect(verifyViewToken(undefined)).toBeNull()
    expect(verifyViewToken(null)).toBeNull()
    expect(verifyViewToken('')).toBeNull()
    expect(verifyViewToken(12345)).toBeNull()
    expect(verifyViewToken('noktasiz-token')).toBeNull()
    expect(verifyViewToken('.sadeceimza')).toBeNull()
    expect(verifyViewToken('govde.')).toBeNull()
    expect(verifyViewToken('a'.repeat(600))).toBeNull()
  })
})

describe('requiredWatchSeconds', () => {
  it('gorsel/sureli reklamda tam sure ister', () => {
    const payload = verifyViewToken(issueViewToken('x', 30, 'image'))
    expect(payload && requiredWatchSeconds(payload)).toBe(30)
  })

  it('link reklaminda destek tiklaminin kendisidir — 2 sn yeter', () => {
    const payload = verifyViewToken(issueViewToken('x', 10, 'link'))
    expect(payload && requiredWatchSeconds(payload)).toBe(2)
  })
})

describe('isViewComplete', () => {
  it('ANINDA tamamlama REDDEDILIYOR', () => {
    const token = issueViewToken('x', DURATION, 'image')
    const payload = verifyViewToken(token)!
    expect(isViewComplete(payload, payload.issuedAt)).toBe(false)
    expect(isViewComplete(payload, payload.issuedAt + 1000)).toBe(false)
    expect(isViewComplete(payload, payload.issuedAt + 10_000)).toBe(false)
  })

  it('sure doldugunda KABUL ediliyor', () => {
    const token = issueViewToken('x', DURATION, 'image')
    const payload = verifyViewToken(token)!
    expect(isViewComplete(payload, payload.issuedAt + DURATION * 1000)).toBe(true)
    expect(isViewComplete(payload, payload.issuedAt + DURATION * 1000 + 5000)).toBe(true)
  })

  it('kucuk bir guvenlik payi var (250 ms), fazlasi yok', () => {
    const token = issueViewToken('x', DURATION, 'image')
    const payload = verifyViewToken(token)!
    // 14.0 sn -> reddet (15 - 0.25 = 14.75 sinirinin altinda)
    expect(isViewComplete(payload, payload.issuedAt + 14_000)).toBe(false)
    // 14.75 sn -> sinirda kabul
    expect(isViewComplete(payload, payload.issuedAt + 14_750)).toBe(true)
  })

  it('bayat token (30 dk TTL) REDDEDILIYOR', () => {
    const token = issueViewToken('x', DURATION, 'image')
    const payload = verifyViewToken(token)!
    const thirtyOneMinutes = 31 * 60 * 1000
    expect(isViewComplete(payload, payload.issuedAt + thirtyOneMinutes)).toBe(false)
  })

  it('saat geri alinmissa REDDEDILIYOR', () => {
    const token = issueViewToken('x', DURATION, 'image')
    const payload = verifyViewToken(token)!
    expect(isViewComplete(payload, payload.issuedAt - 60_000)).toBe(false)
  })

  it('link reklami 2 sn sonra tamamlanmis sayilir', () => {
    const token = issueViewToken('x', 10, 'link')
    const payload = verifyViewToken(token)!
    expect(isViewComplete(payload, payload.issuedAt + 1000)).toBe(false)
    expect(isViewComplete(payload, payload.issuedAt + 2500)).toBe(true)
  })
})

describe('viewTokenState — istemciye NEDEN reddedildigi soylenebilsin', () => {
  it('erken istek too_early', () => {
    const payload = verifyViewToken(issueViewToken('x', DURATION, 'image'))!
    expect(viewTokenState(payload, payload.issuedAt + 1000)).toBe('too_early')
  })

  it('suresi dolmus token expired (kullaniciya "izlemedin" demek yanlis olurdu)', () => {
    const payload = verifyViewToken(issueViewToken('x', DURATION, 'image'))!
    expect(viewTokenState(payload, payload.issuedAt + 31 * 60 * 1000)).toBe('expired')
  })

  it('saat geri alinmissa bad_clock', () => {
    const payload = verifyViewToken(issueViewToken('x', DURATION, 'image'))!
    expect(viewTokenState(payload, payload.issuedAt - 60_000)).toBe('bad_clock')
  })

  it('yeterli sure gectiyse ok', () => {
    const payload = verifyViewToken(issueViewToken('x', DURATION, 'image'))!
    expect(viewTokenState(payload, payload.issuedAt + DURATION * 1000)).toBe('ok')
  })
})
