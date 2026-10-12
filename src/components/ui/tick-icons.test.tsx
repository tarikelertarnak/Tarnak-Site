import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TickReadIcon, TickSentIcon } from './icons'

/**
 * Tik ikonları (2026-10-12): sohbette metin glifi (✓ / ✓✓) yerine INLINE SVG.
 *
 * Neden inline: Iconify CDN'i beklendiğinde boş ikon çıkıyor (bkz. icons.tsx
 * başı) ve tik her mesajda tekrar ağdan çekilirdi.
 *
 * Kritik nokta RENK: `fill="currentColor"` olmalı — rengi `text-amber-400` /
 * `text-green-400` sınıfı verir. Sabit bir renk gömülürse kullanıcının
 * "sarı/yeşil olsun" kuralı çalışmaz.
 */

afterEach(cleanup)

function svgOf(ui: React.ReactElement): SVGElement {
  const { container } = render(ui)
  const svg = container.querySelector('svg')
  if (!svg)
throw new Error('svg render edilmedi')
  return svg as SVGElement
}

function dOf(svg: SVGElement): string {
  return svg.querySelector('path')?.getAttribute('d') ?? ''
}

describe('tick ikonları (inline SVG)', () => {
  it('tek tik: 24×24 kutuda, dolu ve rengi currentColor', () => {
    const svg = svgOf(<TickSentIcon size={14} />)
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('width')).toBe('14')
    expect(svg.getAttribute('height')).toBe('14')
    expect(svg.getAttribute('fill')).toBe('currentColor')
    // Sabit renk gömülü DEĞİL (renk sınıftan gelir).
    expect(svg.getAttribute('fill')).not.toMatch(/#|rgb/i)
    expect(dOf(svg)).not.toMatch(/#|rgb/i)
  })

  it('çift tik: tek tikten farklı çizim, birden çok tik parçası', () => {
    const one = dOf(svgOf(<TickSentIcon />))
    const two = dOf(svgOf(<TickReadIcon />))
    expect(two).not.toBe(one)
    // Material "done-all": iki tik + kuyruk → birden fazla alt yol.
    expect(two.match(/M/gi)?.length ?? 0).toBeGreaterThan(1)
    expect(one.match(/M/gi)?.length ?? 0).toBe(1)
  })

  it('ikisi de dolu stil kullanır (stroke değil) — 14 px\'te okunur', () => {
    for (const svg of [svgOf(<TickSentIcon />), svgOf(<TickReadIcon />)]) {
      expect(svg.getAttribute('fill')).toBe('currentColor')
      expect(svg.getAttribute('stroke')).toBeNull()
    }
  })
})
