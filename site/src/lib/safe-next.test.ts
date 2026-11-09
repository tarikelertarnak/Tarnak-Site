import { describe, expect, it } from 'vitest'
import { safeNext } from './safe-next'

/**
 * `?next=` güvenli hedef çözümleyici (2026-10-11).
 *
 * Kullanıcı isteği: "giriş yaptımda otomatik chat url'ine dönmeli". `next`
 * kullanıcıdan geldiği için açık yönlendirme (open redirect) saldırı yüzeyidir:
 * `?next=https://kotu-site` ile giriş sonrası kullanıcı phishing'e atılırdı.
 * Bu test REDDEDİLMESİ gereken girdileri sabitler.
 */
describe('safeNext', () => {
  it('site içi kök-relative yolu kabul eder', () => {
    expect(safeNext('/chat')).toBe('/chat')
    expect(safeNext('/admin')).toBe('/admin')
    expect(safeNext('/chat?tab=1')).toBe('/chat?tab=1')
  })

  it('girdi yoksa geri düşüş değerini döner', () => {
    expect(safeNext(null, '/')).toBe('/')
    expect(safeNext(undefined, '/')).toBe('/')
    expect(safeNext('', '/')).toBe('/')
  })

  it('protokol-göreli adresi reddeder (//kotu-site)', () => {
    // Tarayıcıda // = "şema + host": sessizce dış siteye götürürdü.
    expect(safeNext('//evil.example')).toBe('/')
    expect(safeNext('//evil.example/chat')).toBe('/')
  })

  it('ters eğik çizgi kaçışını reddeder (/\\evil.example)', () => {
    expect(safeNext('/\\evil.example')).toBe('/')
  })

  it('şema içeren mutlak adresi reddeder', () => {
    expect(safeNext('https://evil.example')).toBe('/')
    expect(safeNext('http://evil.example')).toBe('/')
    expect(safeNext('javascript:alert(1)')).toBe('/')
    expect(safeNext('data:text/html,<script>')).toBe('/')
  })

  it('göreli (kök-relative olmayan) yolu reddeder', () => {
    expect(safeNext('chat')).toBe('/')
    expect(safeNext('../admin')).toBe('/')
  })

  it('özel geri düşüş değerini kullanır', () => {
    expect(safeNext('https://evil.example', '/chat')).toBe('/chat')
    expect(safeNext(undefined, '/chat')).toBe('/chat')
  })
})
