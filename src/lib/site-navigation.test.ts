import { describe, expect, it } from 'vitest'

import { buildSiteNavigation } from '@/lib/site-navigation'

/** Test icin: anahtari oldugu gibi dondurur (ceviri icerigi onemli degil). */
const t = (key: string) => key

describe('buildSiteNavigation', () => {
  const groups = buildSiteNavigation(t)
  const all = groups.flatMap(g => g.entries)
  const hrefs = all.map(e => e.href)

  it('uc grup uretir: Sayfalar / Bolumler / Hesap', () => {
    expect(groups.map(g => g.id)).toEqual(['pages', 'sections', 'account'])
  })

  // ---- KULLANICI ISTEGI: "butun sayfalar, bolumler, ozel sayfa ve alt sayfa"
  const REQUIRED_PAGES = [
    '/',
    '/about',
    '/projects',
    '/blog',
    '/chat',
    '/github',
    '/search',
    '/donate',
    '/credits',
  ]

  it.each(REQUIRED_PAGES)('sayfa listede: %s', (href) => {
    expect(hrefs).toContain(href)
  })

  // ---- Kaldirilan reklam akisi: /reklam sayfasi silindi, link de olmamali.
  it('silinen reklam sayfasi listede YOK', () => {
    expect(hrefs).not.toContain('/reklam')
  })

  // 2026-10-04: `/#bolum` capalari gercek sayfalara cevrildi (kullanici:
  // "butun # leri sil, normal olsun hep").
  const REQUIRED_SECTIONS = ['/about/', '/projects/', '/blog/', '/contact/']

  it.each(REQUIRED_SECTIONS)('bolum listede gercek rota olarak: %s', (href) => {
    expect(hrefs).toContain(href)
  })

  // REGRESYON: capali href geri gelirse yakala. Ayri sayfaIci `#main` (atlama
  // linki) bu listede degil — gezinme girdileri dis sayfa olmali.
  it('hicbir gezinme linki capa (#) icermez', () => {
    const hashed = hrefs.filter(h => h.includes('#'))
    expect(hashed).toEqual([])
  })

  it('hesap baglantilari listede (giris, panel, editor)', () => {
    expect(hrefs).toContain('/login')
    expect(hrefs).toContain('/admin')
    expect(hrefs).toContain('/puck')
  })

  it('9 sayfa + 4 bolum + 3 hesap = 16 baglanti', () => {
    expect(all.length).toBe(16)
  })

  it('tekrar eden href YOK', () => {
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('her baglantinin etiketi ve kimligi var', () => {
    for (const e of all) {
      expect(e.label.length).toBeGreaterThan(0)
      expect(e.id.length).toBeGreaterThan(0)
    }
  })

  // ---- Panelden eklenen ozel sayfalar
  it('content.nav.items icindeki YENI baglanti eklenir', () => {
    const g = buildSiteNavigation(t, [{ title: 'Ozel Sayfa', href: '/ozel' }])
    const list = g.flatMap(x => x.entries).map(e => e.href)
    expect(list).toContain('/ozel')
  })

  it('content.nav.items ZATEN VAR olan baglantiyı TEKRAR eklemez', () => {
    const g = buildSiteNavigation(t, [{ title: 'Projeler', href: '/projects' }])
    const list = g.flatMap(x => x.entries).map(e => e.href)
    expect(list.filter(h => h === '/projects').length).toBe(1)
  })

  it('eksik/bozuk kayitlar atlanir (kirilgan olmasin)', () => {
    const g = buildSiteNavigation(t, [
      { title: '', href: '/bos' },
      { title: 'Adsiz', href: '' },
      {},
    ])
    const list = g.flatMap(x => x.entries).map(e => e.href)
    expect(list).not.toContain('/bos')
    expect(list).not.toContain('')
  })

  it('nav.items verilmezse sabit liste bozulmaz', () => {
    const g = buildSiteNavigation(t, undefined)
    expect(g.flatMap(x => x.entries).length).toBe(16)
  })
})
