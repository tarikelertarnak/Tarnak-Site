import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HEADER_HEIGHT,
  prefersReducedMotion,
  SCROLL_GAP,
  SCROLL_OFFSET,
  scrollToElement,
  scrollToTop,
  scrollToY,
} from '@/lib/scroll'

/**
 * Kaydırma yardımcısı testleri (2026-10-17).
 *
 * Kanıtlanan sözleşmeler:
 *  · ofset TEK yerden türer (80 + 16 = 96) ve CSS `scroll-margin-top` ile
 *    aynı toplamdır,
 *  · hareket azaltma tercihinde ANINDA (`auto`), yoksa yumuşak (`smooth`),
 *  · sayfa içi kaydırmalar kopyala-yapıştır değil bu yardımcıdan geçer
 *    (yapısal regresyon: elle `window.scrollTo({top:0,behavior:'smooth'})`).
 */

const scrollToSpy = vi.fn()

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  scrollToSpy.mockClear()
  window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo
  delete document.documentElement.dataset.reduceMotion
  setMatchMedia(false)
})

afterEach(() => {
  delete document.documentElement.dataset.reduceMotion
})

describe('ofset sözleşmesi', () => {
  it('sCROLL_OFFSET = header + nefes payı (96px)', () => {
    expect(HEADER_HEIGHT).toBe(80)
    expect(SCROLL_GAP).toBe(16)
    expect(SCROLL_OFFSET).toBe(96)
  })

  it('cSS `scroll-margin-top` aynı toplamı kullanır', () => {
    const css = readFileSync(
      join(process.cwd(), 'src', 'app', 'globals.css'),
      'utf-8',
    )
    expect(css).toContain('--header-height: 80px')
    expect(css).toContain('--scroll-offset: 16px')
    expect(css).toContain(
      'scroll-margin-top: calc(var(--header-height) + var(--scroll-offset))',
    )
    // Eski elle yazılmış 88px kalmadı (ofset ikiye bölünmüştü).
    expect(css).not.toContain('scroll-margin-top: 88px')
  })
})

describe('hareket azaltma tercihi', () => {
  it('işletim sistemi tercihi açıkken anında kaydırır', () => {
    setMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
    scrollToTop()
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('site içi "Animasyonları azalt" anahtarı da anında kaydırır', () => {
    document.documentElement.dataset.reduceMotion = 'true'
    expect(prefersReducedMotion()).toBe(true)
    scrollToY(500)
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 500, behavior: 'auto' })
  })

  it('tercih yoksa yumuşak kaydırır', () => {
    expect(prefersReducedMotion()).toBe(false)
    scrollToY(500)
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' })
  })
})

describe('scrollToY / scrollToTop / scrollToElement', () => {
  it('negatif konumu 0a kırpar, ondalığı yuvarlar', () => {
    scrollToY(-120)
    expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
    scrollToY(120.6)
    expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 121, behavior: 'smooth' })
  })

  it('elemanı üst çubuğun 96px altına getirir', () => {
    const el = {
      getBoundingClientRect: () => ({ top: 400 }),
    } as unknown as HTMLElement
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1000,
    })
    scrollToElement(el)
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 1000 + 400 - SCROLL_OFFSET,
      behavior: 'smooth',
    })
  })

  it('özel ofset verilebilir', () => {
    const el = {
      getBoundingClientRect: () => ({ top: 100 }),
    } as unknown as HTMLElement
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    scrollToElement(el, 0)
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' })
  })

  it('eleman yoksa hiç kaydırmaz', () => {
    scrollToElement(null)
    expect(scrollToSpy).not.toHaveBeenCalled()
    scrollToElement(undefined)
    expect(scrollToSpy).not.toHaveBeenCalled()
  })
})

describe('yapısal regresyon: sayfa kaydırması tek yardımcıdan geçer', () => {
  /** src/ altındaki .ts/.tsx dosyaları. */
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name)
      if (statSync(full).isDirectory())
        return walk(full)
      return /\.tsx?$/.test(name) ? [full] : []
    })
  }

  it('elle `window.scrollTo({ top: 0, behavior: ... })` kalmadı', () => {
    const ihlaller: string[] = []
    for (const file of walk(join(process.cwd(), 'src'))) {
      const rel = file.replace(process.cwd(), '')
      // Yardımcının kendisi ve testleri hariç.
      if (rel.includes(`${join('src', 'lib', 'scroll')}.`))
        continue
      if (rel.includes('.test.'))
        continue
      const src = readFileSync(file, 'utf-8')
      if (/window\.scrollTo\(\{\s*top:\s*0/.test(src))
        ihlaller.push(rel)
    }
    expect(ihlaller).toEqual([])
  })

  it('`lib/scroll` dışında ham `behavior:` seçimi kalmaz (sohbet/sekme hariç)', () => {
    const izinli = ['chat.tsx', 'chat-window.tsx', 'chat-panel.tsx', 'scrollable-tabs.tsx', 'use-scroll-state.ts']
    const ihlaller: string[] = []
    for (const file of walk(join(process.cwd(), 'src'))) {
      const rel = file.replace(process.cwd(), '')
      if (rel.includes(`${join('src', 'lib', 'scroll')}.`) || rel.includes('.test.'))
        continue
      if (izinli.some(k => rel.endsWith(k)))
        continue
      const src = readFileSync(file, 'utf-8')
      if (/behavior:\s*'smooth'|behavior:\s*'auto'/.test(src))
        ihlaller.push(rel)
    }
    expect(ihlaller).toEqual([])
  })
})
