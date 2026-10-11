import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 2026-10-10 — Dijital kartvizit yalnızca QR kod olarak kaldı.
 *
 * Kullanıcı: "`/api/vcard` endpointsini ve 'Kartvisiti indir' metnini kaldır;
 * yalnızca vCard'ı içeren QR kod kalsın."
 *
 * Neden kaynak geneli tarama: indirme yolu üç ayrı katmanda yaşıyordu —
 *   1) route: `src/app/api/vcard/route.ts`
 *   2) tüketici: `about-section.tsx` → `vcardUrl = siteUrl('/api/vcard')`
 *   3) metin: `i18n` `about.vcardDownload`
 * Birini düzeltmek yetmez; bu test ÜÇÜNÜN de geri gelmediğini kanıtlar.
 *
 * Muaf: bu dosyanın kendisi (yorumunda örnek olarak yolu anar).
 */
const SELF = 'vcard-qr-only.test.ts'

/** src/ altındaki tüm .ts/.tsx dosyaları. */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

describe('kaldırılan vCard indirme yolu geri gelmedi', () => {
  const root = process.cwd()
  const srcFiles = walk(join(root, 'src')).filter((f) => !f.endsWith(SELF))

  it('route dosyası silinmiş', () => {
    expect(existsSync(join(root, 'src/app/api/vcard/route.ts'))).toBe(false)
  })

  it('src/ altında kalan `/api/vcard` referansı yok', () => {
    const offenders = srcFiles.filter((f) =>
      readFileSync(f, 'utf8').includes('api/vcard'),
    )
    expect(offenders.map((f) => f.replace(/\\/g, '/'))).toEqual([])
  })

  it('i18n sözlüklerinde `vcardDownload` ("Kartvisiti indir") yok', () => {
    const i18nDir = join(root, 'src/i18n')
    const offenders = readdirSync(i18nDir)
      .filter((n) => n.endsWith('.json') || n.endsWith('.ts'))
      .filter((n) =>
        readFileSync(join(i18nDir, n), 'utf8').includes('vcardDownload'),
      )
    expect(offenders).toEqual([])
  })

  it('tarama gerçekten çalışıyor (dosya sayısı > 20)', () => {
    expect(srcFiles.length).toBeGreaterThan(20)
  })
})

/**
 * 2026-10-10 — "Kişisel Bilgiler" kartı düzeni (kullanıcı isteği):
 *   1) Discord satırı karttan ÇIKTI → "İletişim Bilgileri" menüsüne taşındı.
 *   2) InfoRow değerleri SOLA yaslı ve etiketin HEMEN yanında ("Ad: TARIK");
 *      eski sabit sütunlu/`justify-between` düzen geri gelmesin.
 *
 * Bölümü render etmek bir düzine sağlayıcı mock'u gerektirdiği için (Popover,
 * motion, ikonlar, CvPicker…) kaynak sözleşmesi doğrulanır — yukarıdaki
 * aynı desen. Discord'un menüde göründüğü zaten
 * `contact-quick-menu.test.tsx` ile render edilerek kanıtlanıyor.
 */
describe('about "Kişisel Bilgiler" kartı', () => {
  const about = readFileSync(
    join(process.cwd(), 'src/components/sections/about-section.tsx'),
    'utf8',
  )

  it('discord satırı kartta kalmadı (`infoDiscord` kullanılmıyor)', () => {
    expect(about).not.toMatch(/infoDiscord/)
  })

  it('infoRow değeri sola yaslı, etiketle bitişik ("Ad: TARIK")', () => {
    const start = about.indexOf('function InfoRow')
    const end = about.indexOf('function CopyValueButton')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const infoRow = about.slice(start, end)
    expect(infoRow).toContain('text-left')
    expect(infoRow).not.toContain('justify-between')
    // Biçimden bağımsız: prettier/eslint JSX'i satıra bölebilir
    // (`{label}` / `:` ayrı satır). Önemli olan render edilen metnin
    // "etiket + iki nokta" olması — yani ikisi aynı öğede bulunması.
    expect(infoRow.replace(/\s+/g, '')).toMatch(/\{label\}:/)
  })
})
