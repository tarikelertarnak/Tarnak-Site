import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SplitButton } from '@/components/ui/split-button'

/**
 * Split buton geometri regresyonu.
 *
 * KOK NEDEN (2026-10-05): iki kullanım yeri (CV: goz+indir, Proje: indir+menu)
 * elle `<div>` + iki `<Button>` ile yazilmis, geometri uc ayri yerde
 * sabitlenmis. Sonuc: parcalar arasinda catlak, ic koseler yuvarlak, yukseklik
 * ve padding uyumsuz. Artik geometrinin TEK sahibi `SplitButton`.
 *
 * Bu test bir DOM render'i alip kurallari dogrular:
 *  - dis sarmalayici: tek `overflow-hidden` + `rounded-xl`
 *  - parcalar: `rounded-none` (kendi radius'u YOK)
 *  - ayirici: 1px `border-l`
 *  - yukseklik: hepsi `h-10`
 *  - esneme: `shrink-0`, sarmalayici `flex-nowrap`
 *  - odak halkasi: sarmalayicida (grup), parcalarin kendisinde degil
 */
function render(parts: Parameters<typeof SplitButton>[0]['parts']) {
  return renderToStaticMarkup(<SplitButton parts={parts} />)
}

describe('SplitButton', () => {
  it('iki parcayi tek yuvarlak kutu icinde birlestirir', () => {
    const html = render([
      { href: '/cv.pdf', children: 'CV' },
      { href: '/cv.pdf', download: true, children: <span>D</span> },
    ])

    // Tek sarmalayici: overflow-hidden + KOYU 1px cerceve + rounded-md
    // 2026-10-05: canli olcumde komsu hero butonlarinin degeri
    // `radius 6px`, `border 1px`, `padding-x 14px`, `font-size 13px`,
    // `gap 6px` idi. Split eskiden `rounded-lg`(8px)/`border 0`/`px-4`/
    // `text-sm`/`gap-2` tasiyordu — kullanici "CV butonu uyumsuz" dedi.
    // Artik degerler `hero-button-style.ts`ten tek kaynaktan geliyor:
    //   rounded-md = 6px (Tailwind 4'te md = 0.375rem)
    expect(html).toContain('overflow-hidden')
    expect(html).toContain('rounded-md')
    // Komsu butonlarda 1px cerceve var; split'te de olmali.
    expect(html).toMatch(/border border-primary/)

    // Parcalar kendi radius'unu almaz — sarmalayici kirpar.
    // Kural: radius sarmalayicida VAR, parcalarda YOK.
    const partMatches = html.match(/rounded-none/g) ?? []
    expect(partMatches.length).toBe(2)
    // Her parcenin class'inda `rounded-none` ve baska radius YOK.
    for (const cls of html.match(/class="([^"]*rounded-none[^"]*)"/g) ?? []) {
      expect(cls).toMatch(/rounded-none/)
      expect(cls).not.toMatch(/rounded-(?:lg|md|full|sm|xl)/)
    }
  })

  it('iki parca arasinda 1px ayirici vardir', () => {
    const html = render([
      { href: '/x', children: 'A' },
      { onClick: () => {}, iconOnly: true, children: <span>B</span> },
    ])

    expect(html).toContain('border-l')
    // 2026-10-05: ayırıcı artık dış ÇERÇEVEYLE AYNI renk
    // (`--tprimary-fg`: light siyah, dark beyaz). Önceden bağımsız
    // `--tsplit-divider` değişkeni vardı ve çerçeve maviyken
    // "bağımsız" görünüyordu — kullanıcı "ayırıcı dış çerçeveyle uyumlu
    // renkte olsun" dedi.
    expect(html).toContain('border-l border-primary-fg')
    expect(html).not.toContain('--tsplit-divider')
  })

  it('her parca ayni yukseklikte ve esnemez', () => {
    const html = render([
      { href: '/x', children: 'A' },
      { onClick: () => {}, iconOnly: true, children: <span>B</span> },
    ])

    // 3 kez h-10: sarmalayici + iki parca
    expect(html.match(/\bh-10\b/g)?.length).toBe(3)
    // Sarmalayici flex-nowrap (mobilde kirilmaz), parcalar shrink-0
    expect(html).toContain('flex-nowrap')
    expect(html.match(/shrink-0/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('odak halkasi butun grubu cevreler, parcaya degil', () => {
    const html = render([
      { href: '/x', children: 'A' },
      { onClick: () => {}, iconOnly: true, children: <span>B</span> },
    ])

    // focus-within -> grup halkasi
    expect(html).toContain('focus-within:ring-2')
    // Parcalarda kendi halkasi YOK (iki parcaya iki cizgi olmasin)
    expect(html).not.toContain('focus-visible:ring-2')
  })

  it('indirme yarisi <a download> olarak basilir (indirme calisir)', () => {
    const html = render([
      { href: '/cv.pdf', target: '_blank', rel: 'noopener noreferrer', children: 'CV' },
      { href: '/cv.pdf', download: true, 'aria-label': 'CV Indir', children: <span>D</span> },
    ])

    expect(html).toContain('href="/cv.pdf"')
    // Ikinci parca download="true" tasiyor
    expect(html).toMatch(/<a[^>]*download(="true")?[^>]*>/)
    expect(html).toContain('aria-label="CV Indir"')
    // Ilk parca yeni sekmede
    expect(html).toContain('target="_blank"')
  })

  it('menu yarisi <button> olarak basilir ve aria ile baglanir', () => {
    const html = render([
      { href: '/z.zip', onClick: () => {}, iconOnly: true, children: <span>D</span> },
      {
        onClick: () => {},
        iconOnly: true,
        'aria-label': 'Surum sec',
        'aria-expanded': true,
        'aria-haspopup': true,
        children: <span>V</span>,
      },
    ])

    expect(html).toContain('<button')
    expect(html).toContain('aria-label="Surum sec"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toMatch(/aria-haspopup="(true|menu|listbox)"/)
  })

  it('ikon yarisi sabit kare genislikte olur', () => {
    const html = render([
      { href: '/x', children: 'CV' },
      { href: '/x', download: true, iconOnly: true, children: <span>D</span> },
    ])

    // Sabit genislik inline style ile veriliyor (w-40 px utility yerine,
    // cunku deger JSX prop'undan geliyor ve Tailwind sinif adinda gomulu)
    expect(html).toContain('width:40px')
  })

  it('yazi parcasi esnek, ikon parcasi sabittir', () => {
    const html = render([
      { href: '/x', children: 'CV' },
      { href: '/x', download: true, iconOnly: true, children: <span>D</span> },
    ])

    // Sadece ikinci parca sabit genislik alir
    expect(html.match(/width:40px/g)?.length).toBe(1)
  })

  it('bosis parca dizisi hicbir sey basmaz', () => {
    expect(render([])).toBe('')
  })
})
