import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  aboutKeySchema,
  aboutPageErrors,
  aboutPageSchema,
  normalizeAboutPage,
  paragraphs,
  parseAboutPage,
  pickLocalized,
  slugifyKey,
  uniqueKey,
} from '@/lib/about-page'

const EMPTY = {
  title: { tr: '', en: '' },
  intro: { tr: '', en: '' },
  areas: [],
  journey: [],
  values: [],
  closing: { tr: '', en: '' },
}

function seedFromSql() {
  const sql = readFileSync(join(process.cwd(), 'supabase', 'about-page.sql'), 'utf-8')
  const json = sql.match(/\n\s*'(\{.*\})'::jsonb,/)
  if (!json?.[1])
    throw new Error('Boş aboutPage yapısı bulunamadı.')
  return JSON.parse(json[1]) as unknown
}

describe('aboutPage schema and normalization', () => {
  it('eksik veya null sayfa içeriğini boş durum için null yapar', () => {
    expect(parseAboutPage(undefined)).toBeNull()
    expect(parseAboutPage(null)).toBeNull()
  })

  it('boş başlangıç içeriğini kabul eder ve metin uydurmaz', () => {
    expect(aboutPageSchema.parse(EMPTY)).toEqual(EMPTY)
    expect(parseAboutPage(EMPTY)).toEqual(EMPTY)
  })

  it('bozuk girdiyi reddeder, sayfa oluşturmayı düşürmez', () => {
    expect(parseAboutPage({ areas: 'not a list' })).toBeNull()
    expect(parseAboutPage({ title: { tr: 42 } })).toBeNull()
  })

  it('kısmi sayfayı boş liste varsayılanlarıyla parse eder', () => {
    const parsed = parseAboutPage({ title: { tr: 'Test', en: 'Test' } })
    expect(parsed?.areas).toEqual([])
    expect(parsed?.journey).toEqual([])
    expect(parsed?.values).toEqual([])
  })

  it('eksik alanları boş değerlerle normalize eder', () => {
    expect(normalizeAboutPage({})).toEqual(EMPTY)
  })

  it('aynı listede yinelenen madde anahtarını reddeder', () => {
    const item = { key: 'one', title: { tr: 'A', en: '' }, description: { tr: '', en: '' }, period: '' }
    expect(aboutPageSchema.safeParse({ ...EMPTY, areas: [item, item] }).success).toBe(false)
  })

  it('geçersiz madde anahtarını reddeder', () => {
    const item = { key: 'Bad Key', title: { tr: 'A', en: '' }, description: { tr: '', en: '' }, period: '' }
    expect(aboutPageSchema.safeParse({ ...EMPTY, areas: [item] }).success).toBe(false)
  })

  it('madde anahtarı küçük harfli tireli biçimi kabul eder', () => {
    expect(aboutKeySchema.safeParse('sample-item').success).toBe(true)
    expect(aboutKeySchema.safeParse('Sample Item').success).toBe(false)
    expect(aboutKeySchema.safeParse('sample_item').success).toBe(false)
    expect(aboutKeySchema.safeParse('-sample').success).toBe(false)
    expect(aboutKeySchema.safeParse('').success).toBe(false)
  })

  it('farklı listelerde yinelenen anahtara izin verir', () => {
    const item = { key: 'shared', title: { tr: 'A', en: 'A' }, description: { tr: '', en: '' }, period: '' }
    expect(aboutPageSchema.safeParse({ ...EMPTY, areas: [item], values: [item] }).success).toBe(true)
  })

  it('çöp girdiyi boş değerlerle normalize eder', () => {
    expect(normalizeAboutPage('invalid')).toEqual(EMPTY)
  })

  it('eksik liste maddesi alanlarını boş metinle tamamlar', () => {
    expect(normalizeAboutPage({ areas: [{ key: 'one' }] }).areas[0]).toEqual({
      key: 'one',
      title: { tr: '', en: '' },
      description: { tr: '', en: '' },
      period: '',
    })
  })

  it('geçersiz taslak içeriğini editör için korur', () => {
    expect(normalizeAboutPage({ values: [{ key: 'one' }] }).values).toHaveLength(1)
  })

  it('tr ve en metnini seçer, en boşsa tr değerine düşer', () => {
    expect(pickLocalized({ tr: 'Türkçe', en: 'English' }, 'en')).toBe('English')
    expect(pickLocalized({ tr: 'Türkçe', en: '' }, 'en')).toBe('Türkçe')
    expect(pickLocalized({ tr: 'Türkçe', en: 'English' }, 'tr')).toBe('Türkçe')
  })

  it('paragrafları boş satırlardan ayırır', () => {
    expect(paragraphs('  Birinci  \n\n  İkinci\n\n')).toEqual(['Birinci', 'İkinci'])
  })

  it('boş metinden paragraf üretmez', () => {
    expect(paragraphs('  \n\n ')).toEqual([])
  })

  it('tanımsız yerelleştirilmiş metni boş değer olarak döndürür', () => {
    expect(pickLocalized(undefined, 'en')).toBe('')
  })

  it('bilinmeyen dili taban dil olan Türkçeye düşürür', () => {
    expect(pickLocalized({ tr: 'Türkçe', en: 'English' }, 'de')).toBe('Türkçe')
  })

  it('türkçe metni kararlı anahtara çevirir ve benzersiz anahtar üretir', () => {
    expect(slugifyKey('İlk Adım')).toBe('ilk-adim')
    expect(uniqueKey('İlk Adım', ['ilk-adim', 'ilk-adim-2'])).toBe('ilk-adim-3')
  })

  it('boş tabanda benzersiz anahtar üretir', () => {
    expect(uniqueKey('', [])).toBe('madde')
  })

  it('boş başlık, geçersiz key ve yinelenen key hatalarını verir', () => {
    const empty = normalizeAboutPage({
      ...EMPTY,
      areas: [
        { key: 'bad key', title: { tr: '', en: '' }, description: { tr: '', en: '' }, period: '' },
        { key: 'bad key', title: { tr: 'Başlık', en: '' }, description: { tr: '', en: '' }, period: '' },
      ],
    })
    expect(aboutPageErrors(empty)).toHaveLength(4)
  })

  it('boş sayfada hata üretmez', () => {
    expect(aboutPageErrors(normalizeAboutPage(EMPTY))).toEqual([])
  })

  it('boş liste maddesi başlığını hata olarak bildirir', () => {
    const page = normalizeAboutPage({
      ...EMPTY,
      values: [{ key: 'one', title: { tr: '', en: '' }, description: { tr: '', en: '' }, period: '' }],
    })
    expect(aboutPageErrors(page)).toContain('Değerler #1: başlık (TR veya EN) boş olamaz.')
  })

  it('yinelenen anahtarın satır numarasını bildirir', () => {
    const item = { key: 'same', title: { tr: 'A', en: '' }, description: { tr: '', en: '' }, period: '' }
    expect(aboutPageErrors(normalizeAboutPage({ ...EMPTY, areas: [item, item] }))).toContain(
      'Çalışma Alanları #2: "same" anahtarı zaten #1 satırında kullanılmış.',
    )
  })
})

describe('about page SQL migration seed', () => {
  it('seed sayfası şemadan geçer', () => {
    expect(aboutPageSchema.safeParse(seedFromSql()).success).toBe(true)
  })

  it('yalnızca boş metin ve boş listelerle başlar', () => {
    expect(parseAboutPage(seedFromSql())).toEqual(EMPTY)
  })

  it('boş başlık, giriş ve kapanış alanları bırakır', () => {
    const page = parseAboutPage(seedFromSql())!
    expect(page.title).toEqual({ tr: '', en: '' })
    expect(page.intro).toEqual({ tr: '', en: '' })
    expect(page.closing).toEqual({ tr: '', en: '' })
  })

  it('alan, yolculuk ve değer listelerini boş bırakır', () => {
    const page = parseAboutPage(seedFromSql())!
    expect(page.areas).toEqual([])
    expect(page.journey).toEqual([])
    expect(page.values).toEqual([])
  })

  it('seed yolculuğunda tarih veya dönem üretmez', () => {
    expect(parseAboutPage(seedFromSql())?.journey.every(item => !item.period)).toBe(true)
  })

  it('sql yalnız aboutPage alanı yokken boş kayıt yazar', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase', 'about-page.sql'), 'utf-8')
    const update = sql.slice(sql.indexOf('UPDATE public.site_content'))
    expect(update).toContain('content -> \'aboutPage\' IS NULL')
    expect(update).not.toMatch(/^\s*DELETE /m)
  })

  it('eski doğrulanmamış biyografi metnini seed etmez', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase', 'about-page.sql'), 'utf-8')
    expect(sql).not.toContain('Merhaba, ben Tarık')
    expect(sql).not.toContain('İlk adımlar')
    expect(sql).not.toContain('Açık kaynak')
  })

  it('mevcut veriyi temizlemeden önce özel arşive alır ve RLS açar', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '202610180001_clear_unverified_about_page.sql'),
      'utf-8',
    )
    expect(migration).toContain('INSERT INTO public.about_page_archive')
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('REVOKE ALL ON public.about_page_archive FROM anon, authenticated')
  })

  it('boş seed için anahtarlar benzersiz kalır', () => {
    const page = parseAboutPage(seedFromSql())!
    for (const list of [page.areas, page.journey, page.values]) {
      const keys = list.map(item => item.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})
