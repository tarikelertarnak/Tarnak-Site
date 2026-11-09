import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayBucket,
  fmtDate,
  isBotUA,
  isValidVisitorId,
  makeVisitorId,
  periodRange,
  resolvePersonKey,
  shouldTrackPath,
} from '@/lib/visits'

describe('isBotUA', () => {
  it('bot UA\'ları true döner', () => {
    expect(isBotUA('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
    expect(isBotUA('curl/7.68.0')).toBe(true)
    expect(isBotUA('python-requests/2.25.1')).toBe(true)
    expect(isBotUA('uptimerobot/1.0')).toBe(true)
  })
  it('gerçek tarayıcı UA\'ları false döner', () => {
    expect(isBotUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe(false)
    expect(isBotUA('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/604.1')).toBe(false)
  })
  it('boş / null UA true döner (tarayıcı değil)', () => {
    expect(isBotUA(null)).toBe(true)
    expect(isBotUA(undefined)).toBe(true)
    expect(isBotUA('')).toBe(true)
  })
})

describe('shouldTrackPath', () => {
  it('ana sayfa izlenir', () => {
    expect(shouldTrackPath('/')).toBe(true)
  })
  it('/admin ve /api hariç tutulur', () => {
    expect(shouldTrackPath('/admin')).toBe(false)
    expect(shouldTrackPath('/admin/overview')).toBe(false)
    expect(shouldTrackPath('/api/visits')).toBe(false)
    expect(shouldTrackPath('/api/admin/overview')).toBe(false)
  })
  it('static / _next hariç tutulur', () => {
    expect(shouldTrackPath('/_next/static/js/x.js')).toBe(false)
    expect(shouldTrackPath('/static/img.png')).toBe(false)
  })
  it('favicon/robots/sitemap hariç tutulur', () => {
    expect(shouldTrackPath('/favicon.ico')).toBe(false)
    expect(shouldTrackPath('/robots.txt')).toBe(false)
    expect(shouldTrackPath('/sitemap.xml')).toBe(false)
  })
  it('diğer sayfalar izlenir', () => {
    expect(shouldTrackPath('/projects')).toBe(true)
    expect(shouldTrackPath('/about')).toBe(true)
    expect(shouldTrackPath('/blog/merhaba')).toBe(true)
  })
})

describe('resolvePersonKey', () => {
  it('userId varsa userId kullanır', () => {
    expect(resolvePersonKey('user_123', 'visitor_abc')).toBe('user_123')
  })
  it('userId yoksa visitorId kullanır', () => {
    expect(resolvePersonKey(null, 'visitor_abc')).toBe('visitor_abc')
    expect(resolvePersonKey(undefined, 'visitor_abc')).toBe('visitor_abc')
    expect(resolvePersonKey('', 'visitor_abc')).toBe('visitor_abc')
  })
})

describe('dayBucket / addDays / fmtDate', () => {
  const fixed = new Date(Date.UTC(2026, 9, 15, 12, 0, 0)) // 2026-10-15
  it('dayBucket YYYY-MM-DD döner', () => {
    expect(dayBucket(fixed)).toBe('2026-10-15')
  })
  it('addDays geri/ileri doğru', () => {
    expect(fmtDate(addDays(fixed, -6))).toBe('2026-10-09')
    expect(fmtDate(addDays(fixed, 29))).toBe('2026-11-13')
  })
})

describe('periodRange', () => {
  const fixed = new Date(Date.UTC(2026, 9, 15, 12, 0, 0))
  it('today tek gün', () => {
    expect(periodRange('today', fixed)).toEqual({ label: 'Bugün', from: '2026-10-15', to: '2026-10-15' })
  })
  it('7d 7 gün', () => {
    expect(periodRange('7d', fixed)).toEqual({ label: 'Son 7 gün', from: '2026-10-09', to: '2026-10-15' })
  })
  it('30d 30 gün', () => {
    expect(periodRange('30d', fixed)).toEqual({ label: 'Son 30 gün', from: '2026-09-16', to: '2026-10-15' })
  })
  it('total geniş aralık', () => {
    const t = periodRange('total', fixed)
    expect(t.from).toBe('0001-01-01')
    expect(t.to).toBe('9999-12-31')
  })
})

describe('visitorId', () => {
  it('makeVisitorId 32 hex karakter', () => {
    expect(makeVisitorId()).toMatch(/^[0-9a-f]{32}$/)
  })
  it('iki çağrı farklı id üretir', () => {
    expect(makeVisitorId()).not.toBe(makeVisitorId())
  })
  it('isValidVisitorId geçerli/geçersiz', () => {
    expect(isValidVisitorId('a'.repeat(32))).toBe(true)
    expect(isValidVisitorId('not-valid-id')).toBe(false)
    expect(isValidVisitorId(null)).toBe(false)
  })
})
