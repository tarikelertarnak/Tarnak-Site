import { describe, expect, it } from 'vitest'

import { contentSchema } from '@/lib/validations'
import contentJson from '../../data/content.json'

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

  /*
    REGRESYON (2026-10-20): `socialItem` semasinda `label`/`value` YOKTU.
    `content.ts` → `SocialItem.label?/value?` alanlarini TANIMLIYOR ve
    `contact-channels.ts:158-160` bunlari override olarak kullaniyor
    (ör. Discord'un gorunen degeri "tarikeler"). Sema eksik oldugu icin
    admin panelden HERHANGI bir icerik kaydi bu alanlari sessizce siliyordu
    — kullaniciya hicbir hata gostermeden (zod4 z.object whitelist tuzagi,
    AGENTS.md §12'deki `phase6` olayi ile ayni sinif hata).
  */
  it('social[] label/value alanlarini KORUR — regresyon', () => {
    const input = realContent()
    const social = input.social as Array<Record<string, unknown>>
    social[0] = { ...social[0], label: 'GitHub Hesabim', value: 'tarikelertarnak' }

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    const first = r.data.social[0] as Record<string, unknown>
    expect(first.label).toBe('GitHub Hesabim')
    expect(first.value).toBe('tarikelertarnak')
  })

  it('gercek content.json Discord girdileri kalici (kanal + kullanici)', () => {
    const r = contentSchema.safeParse(realContent())
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    // 2026-10-31: tek girdi İKİYE ayrıldı — sunucu daveti ve kullanıcı profili.
    const discord = r.data.social.filter(s => s.icon === 'mdi:discord')
    expect(discord).toHaveLength(2)
    expect(discord.map(d => d.name)).toEqual(['Discord Channel', 'Discord User'])
    const kanal = discord.find(d => d.name === 'Discord Channel')
    const kullanici = discord.find(d => d.name === 'Discord User')
    expect(kanal?.href).toBe('https://discord.gg/UFzppNZxDw')
    expect(kanal?.value).toBe('Tarnak')
    expect(kullanici?.href).toBe('https://discord.com/users/1565472290236268605')
    expect(kullanici?.value).toBe('tarikelertarnak')
  })

  it('label/value OPSIYONEL — yoksa da gecer', () => {
    const input = realContent()
    const social = input.social as Array<Record<string, unknown>>
    social[1] = { name: 'X', href: 'https://x.com/y', icon: 'mdi:twitter' }

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    expect(r.data.social[1].label).toBeUndefined()
    expect(r.data.social[1].value).toBeUndefined()
  })

  /*
   * Hero cok dilli alanlar (2026-10-20).
   *
   * NEGATIF KONTROL: `heroI18n` semaya yazilmazsa zod bilinmeyen anahtari
   * SESSIZCE siler — admin panelde TR/EN/DE girilen metinler her kaydetmede
   * kaybolurdu (AGENTS.md §12'de `phase6` icin birebir yasandi). Bu testler
   * alanin HAYATTA KALDIGINI kanitlar.
   */
  it('hero.i18n alanini KORUR — negatif kontrollu regresyon', () => {
    const input = realContent()
    const hero = input.hero as Record<string, unknown>
    hero.i18n = {
      tagline: { tr: 'Yazilimci', en: 'Programmer', de: 'Programmierer' },
      exploreLabel: { en: 'Explore' },
      connectLabel: { en: 'Contact' },
    }

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    // Semada olmadigi icin parse sonrasi KAYBOLURDU.
    expect(r.data.hero.i18n?.tagline?.en).toBe('Programmer')
    expect(r.data.hero.i18n?.tagline?.de).toBe('Programmierer')
    expect(r.data.hero.i18n?.tagline?.tr).toBe('Yazilimci')
    expect(r.data.hero.i18n?.exploreLabel?.en).toBe('Explore')
  })

  it('hero.i18n OPSIYONEL — yoksa da gecer', () => {
    const input = realContent()
    const hero = input.hero as Record<string, unknown>
    delete hero.i18n

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    expect(r.data.hero.i18n).toBeUndefined()
  })

  it('hero.logo alanini KORUR', () => {
    const input = realContent()
    const hero = input.hero as Record<string, unknown>
    hero.logo = '/uploads/logo.png'

    const r = contentSchema.safeParse(input)
    expect(r.success).toBe(true)
    if (!r.success) {
      return
    }
    expect(r.data.hero.logo).toBe('/uploads/logo.png')
  })
})
