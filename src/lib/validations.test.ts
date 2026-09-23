import { describe, expect, it } from 'vitest'

import contentJson from '../../data/content.json'
import { contentSchema } from '@/lib/validations'

/**
 * Icerik semasi testleri.
 *
 * REGRESYON: `about.cv` semasinda `href` alani YOKTU. Zod tanimadigi alanlari
 * parse sirasinda SESSIZCE SILER, bu yuzden admin panelinden CV linki
 * degistirilip kaydedilse bile deger `/cv/tarikeler-cv.pdf` varsayilanina
 * geri donuyordu — kullaniciya hicbir hata gostermeden.
 *
 * Fixture olarak GERCEK `data/content.json` kullanilir: sema cok genis,
 * elle uydurma nesne kirilgan olurdu. Gercek icerik daima gecerli olmali.
 */

/** Gercek icerigin derin kopyasi (testler arasi kirlenme olmasin). */
function realContent(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(contentJson))
}

describe('contentSchema', () => {
  it('gercek data/content.json semayi GECER', () => {
    const r = contentSchema.safeParse(realContent())
    if (!r.success) {
      const lines = r.error.issues.slice(0, 10).map(i => `${i.path.join('.')} -> ${i.message}`)
      expect.fail(`Gercek icerik semayi gecmedi:\n${lines.join('\n')}`)
    }
    expect(r.success).toBe(true)
  })

  it('about.cv.href alanini KORUR — regresyon', () => {
    const input = realContent()
    const about = input.about as Record<string, unknown>
    about.cv = {
      href: '/cv/yeni-cv.pdf',
      summary: 'ozet',
      experience: [],
      education: [],
    }

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    // Eskiden bu alan semada olmadigi icin parse sonrasi KAYBOLUYORDU.
    expect(r.data.about.cv?.href).toBe('/cv/yeni-cv.pdf')
  })

  it('cv.href gonderilmezse undefined kalir (varsayilana zorlamaz)', () => {
    const input = realContent()
    const about = input.about as Record<string, unknown>
    about.cv = { summary: 'ozet', experience: [], education: [] }

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    expect(r.data.about.cv?.href).toBeUndefined()
  })

  it('cv deneyim girdilerini korur', () => {
    const input = realContent()
    const about = input.about as Record<string, unknown>
    about.cv = {
      href: '/cv/x.pdf',
      summary: 'ozet',
      experience: [{ role: 'Gelistirici', company: 'Fruity Dev', period: '2024', description: 'is' }],
      education: [],
    }

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    expect(r.data.about.cv?.experience).toHaveLength(1)
    expect(r.data.about.cv?.experience[0].company).toBe('Fruity Dev')
  })

  it('cok uzun cv.href reddedilir', () => {
    const input = realContent()
    const about = input.about as Record<string, unknown>
    about.cv = { href: `/${'a'.repeat(600)}`, summary: 'o', experience: [], education: [] }
    expect(contentSchema.safeParse(input).success).toBe(false)
  })

  it('bilinmeyen alanlari sessizce dusurur (whitelist davranisi)', () => {
    const input = realContent()
    input.kotuAlan = 'zararli'
    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    expect(r.data).not.toHaveProperty('kotuAlan')
  })

  it('gecersiz govde reddedilir', () => {
    expect(contentSchema.safeParse({ tamamen: 'yanlis' }).success).toBe(false)
    expect(contentSchema.safeParse(null).success).toBe(false)
    expect(contentSchema.safeParse('metin').success).toBe(false)
  })
})
