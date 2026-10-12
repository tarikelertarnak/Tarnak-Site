import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 2026-10-12 (kullanıcı): ana sayfa hero bölüm düğmelerinin SIRASI istenildiği
 * gibi olsun — "Hakkımda, Projeler, Blog, İletişim, Sohbet, CV".
 *
 * Kaynak tarama sözleşmesi (uygulamadaki diğer kaynak sözleşmeleriyle aynı
 * desen): sıra değişirse bu test kızar.
 */
describe('hero bölüm düğmesi sırası', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/components/sections/hero-section.tsx'),
    'utf8',
  )
  // Çapalar: buton kabının className'i ve FARE ikonunun JSX yorumu —
  // dosyanın BAŞINDaki açıklama bloğu aynı sözcükleri içerir, onu atla.
  const start = src.indexOf('mt-7 flex w-full flex-wrap')
  const end = src.indexOf('FARE (SCROLL)', start)
  const block = src.slice(start, end > -1 ? end : undefined)

  it('href sirasi: /about/ → /projects/ → /blog/ → /contact/ → /chat/', () => {
    const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map(m => m[1])
    expect(hrefs).toEqual([
      '/about/',
      '/projects/',
      '/blog/',
      '/contact/',
      '/chat/',
    ])
  })

  it('cv (CvPicker) en sonda', () => {
    const picker = block.indexOf('<CvPicker')
    const chatHref = block.indexOf('href="/chat/"')
    expect(chatHref).toBeGreaterThan(-1)
    expect(picker).toBeGreaterThan(chatHref)
  })

  it('sırayı açıklayan yorum yerinde (kaynak sözleşmesi ipucu)', () => {
    expect(block).toContain('Hakkımda, Projeler, Blog,')
  })
})
