import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Favicon · HER temada aynı marka mavisi (2026-10-12).
 *
 * KÖK NEDEN (ölçüldü, sharp+rsvg): ikon dosyaları `<g ... fill="#000000"
 * stroke="#ffffff" strokeWidth="420">` ile geliyordu.
 *   1) `strokeWidth` camelCase — SVG özniteliği `stroke-width` olmalı; geçersiz
 *      yazım yüzünden "beyaz halka" HİÇ çizilmiyordu (eski dosyada 0 beyaz
 *      piksel). Yani tasarımın halkası ölü koddu.
 *   2) Kalan siyah glif, koyu sekme çubuğunda kayboluyordu (kullanıcı:
 *      "koyu tema olsun açık tema olsun HER ZAMAN mavi görünsün").
 *
 * ÇÖZÜM: dolgu VE halka sabit `#2563eb` (= tprimary, koyu tema jetonu),
 * `stroke-width` geçerli yazım, arka plan şeffaf, tema varyantı YOK.
 * Mavi halka 16px'te glifi kalınlaştırır (mürekkep %14.5 → %19.1).
 *
 * Bu test dosyaların GÖVDESİNE bakar: XML yorumları (kök nedeni anlatan metin)
 * ayıklanır, yoksa açıklamadaki örnek yazımlar yanlış pozitif üretir.
 */

const ROOT = process.cwd()
const BLUE = '#2563eb'
const SVG_SOURCES = ['public/favicon.svg', 'src/app/icon.svg']

/** XML yorumlarını at — sözleşme koda bakar, açıklamasına değil. */
function body(file: string): string {
  return readFileSync(join(ROOT, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
}

describe('favicon · sabit marka mavisi (2026-10-12)', () => {
  it('iki SVG kaynağı (public + app) mavi dolgu ve GEÇERLİ mavi halka taşır', () => {
    for (const f of SVG_SOURCES) {
      const svg = body(f)
      expect(svg, f).toContain(`fill="${BLUE}"`)
      expect(svg, f).toContain(`stroke="${BLUE}"`)
      // Geçerli yazım: halka bu yüzden artık gerçekten çiziliyor.
      expect(svg, f).toContain('stroke-width="420"')
      // Ölü camelCase varyant geri gelmesin.
      expect(svg, f).not.toContain('strokeWidth')
    }
  })

  it('tema bağımlı renk kalmadı (siyah/beyaz/media/currentColor YOK)', () => {
    for (const f of SVG_SOURCES) {
      const svg = body(f)
      expect(svg, f).not.toContain('#000000')
      expect(svg, f).not.toContain('#ffffff')
      expect(svg, f).not.toMatch(/prefers-color-scheme|currentColor/)
      expect(svg, f).not.toContain('<style')
    }
  })

  it('iki kaynak birbirinin aynısı (public ile app/icon.svg kaymasın)', () => {
    const [a, b] = SVG_SOURCES.map(f => body(f))
    expect(a).toBe(b)
  })

  it('favicon.ico 16/32/48 PNG girdileri taşır', () => {
    const ico = readFileSync(join(ROOT, 'public/favicon.ico'))
    expect(ico.readUInt16LE(0), 'reserved').toBe(0)
    expect(ico.readUInt16LE(2), 'type=1 (icon)').toBe(1)
    const count = ico.readUInt16LE(4)
    const sizes: string[] = []
    for (let i = 0; i < count; i++) {
      const o = 6 + i * 16
      sizes.push(`${ico.readUInt8(o)}x${ico.readUInt8(o + 1)}`)
      const off = ico.readUInt32LE(o + 12)
      // Girdi PNG olmalı (BMP değil) — üretici betik PNG gömüyor.
      expect(ico.subarray(off, off + 4), `girdi ${i}`).toEqual(
        Buffer.from([0x89, 0x50, 0x4E, 0x47]),
      )
    }
    expect(sizes).toEqual(['16x16', '32x32', '48x48'])
  })

  it('png seti boyutları IHDR ile doğru ve RGBA (şeffaflık mümkün)', () => {
    const pngs: Array<[string, number]> = [
      ['favicon-16x16.png', 16],
      ['favicon-32x32.png', 32],
      ['favicon-48x48.png', 48],
      ['favicon-96x96.png', 96],
      ['apple-touch-icon.png', 180],
      ['icon-192x192.png', 192],
      ['icon-512x512.png', 512],
      ['icon-1024x1024.png', 1024],
    ]
    for (const [f, size] of pngs) {
      const png = readFileSync(join(ROOT, 'public', f))
      expect(png.subarray(1, 4).toString('ascii'), f).toBe('PNG')
      expect(png.readUInt32BE(16), `${f} genişlik`).toBe(size)
      expect(png.readUInt32BE(20), `${f} yükseklik`).toBe(size)
      // colorType 6 = RGBA (alfa kanalı var → şeffaf arka plan)
      expect(png.readUInt8(25), `${f} colorType`).toBe(6)
    }
  })

  it('metadata tek set: media varyantı yok, sürüm parametresi var', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8')
    const start = layout.indexOf('icons: {')
    // Blok sınırı: `icons` → bir sonraki kardeş anahtar (`manifest`).
    // (Yorumlar blok DIŞINDA kalır; sözleşme koda bakar.)
    const block = layout.slice(start, layout.indexOf('manifest:', start))
    expect(block, 'açık/koyu ayrı <link> kalmadı').not.toMatch(/media:/)
    expect(block, 'silinmiş dosyalara işaret etmiyor').not.toMatch(/android-chrome|logo\.png/)
    const urls = [...block.matchAll(/url: '([^']+)'/g)].map(m => m[1])
    expect(urls.length).toBeGreaterThanOrEqual(9)
    for (const u of urls) expect(u, u).toMatch(/\?v=5$/)
    // Tarayıcı agresif önbelleğe alır: sürüm parametresi şart.
    expect(layout).not.toContain('?v=4')
  })
})
