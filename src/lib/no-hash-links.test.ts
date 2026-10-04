import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 2026-10-04 — kullanicinin istegi: "#projects gibi butun # leri sil, normal
 * olsun hep". Bu test, `href` niteliginde capali (`#`) baglanti kalmadigini
 * garanti eder.
 *
 * KOK NEDEN: capalar iki farkli yerde gizliydi —
 *   1) `hero-section.tsx` icinde dogrudan (`href="#projects"`)
 *   2) `lib/site-navigation.ts` icinde VERI olarak (`href: '/#contact'`)
 * Bilesen duzeltmek yetmiyordu; nav linkleri icerik listesinden uretiliyor.
 * Bu yuzden kaynak geneli tarama ile tek bir regresyon noktasi birakildi.
 *
 * Muaf: `#main` — erisilebilirlik "icerige atla" baglantisi (skip link).
 * Ayni sayfada hedeflenen, gezinme degil; kaldirilirsa klavye/kaynak okuyucu
 * kullanicilari sayfa basindan gezinmee atlayamaz. Bu bir istisnadir.
 */
const SKIP_LINK = '#main'

/** src/ altindaki tum .ts/.tsx dosyalari (fs.globSync @types/node'da yok). */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory())
      return walk(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

describe('capa (#) iceren gezinme linki yok', () => {
  // Kendini tarama: bu dosyanin YORUMUNDA ornek olarak `href="#projects"`
  // yaziyor (root nedeni anlatmak icin) — tarama onu da gorecekti.
  const SELF = 'no-hash-links.test.ts'
  const root = process.cwd()
  const files = [
    ...walk(join(root, 'src')).filter(f => !f.endsWith(SELF)),
    // src/ disinda: `data/content.json` da ayni `/#contact` degerini tasiyordu
    ...(existsSync(join(root, 'data/content.json')) ? [join(root, 'data/content.json')] : []),
  ]

  /**
   * IKI bicim de gezinme linki tanimlar ve IKISI DE hataydi:
   *   JSX/HTML :  href="#projects"        (hero-section)
   *   obje      :  href: '/#contact'      (i18n-content-*.ts, content.json)
   * Ilk surum yalnizca JSX bicimini taridi ve 9 i18n dosyasini kacirdi —
   * canli HTML'de `/#contact` oldugu icin fark edildi.
   */
  const JSX_HREF = /href\s*=\s*["'{`]\s*([^"'`}]*)["'`]/g
  const OBJ_HREF = /\bhref\s*:\s*["'`]([^"'`]*)["'`]/g

  const offenders = files.flatMap((file) => {
    const src = readFileSync(file, 'utf8')
    const hits: string[] = []
    for (const re of [JSX_HREF, OBJ_HREF]) {
      for (const m of src.matchAll(re)) {
        const href = m[1]
        if (!href || !href.includes('#') || href === SKIP_LINK || href === '#')
          continue
        hits.push(`${file.replace(/\\/g, '/')}: ${href}`)
      }
    }
    return hits
  })

  it('taranan dosya sayisi sifirdan buyuk (tarama gercekten calisiyor)', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('kaynaklarda capali href bulunmuyor', () => {
    expect(offenders).toEqual([])
  })
})