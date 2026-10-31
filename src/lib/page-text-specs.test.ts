import { describe, expect, it } from 'vitest'
import {
  asText,
  coerceFieldValue,
  deletePath,
  findPage,
  getPath,
  isListField,
  parsePastedText,
  parseTextFieldKey,
  setPath,
} from '@/lib/page-text-specs'

/**
 * Sayfa metin anahtarları + içe aktarma ayrıştırıcısı (2026-10-30).
 *
 * Akış: admin Türkçe metni kopyalar → yapay zekâya çevirtir → çıkan
 * `anahtar: değer` listesini yapıştırır. Ayrıştırıcı yanlış bölerse çeviri
 * YANLIŞ ALANA yazılır ve kullanıcı bunu ancak yayında görür; bu yüzden
 * biçimler burada kilitli.
 */

describe('parseTextFieldKey', () => {
  it('kaynak önekini ayırır', () => {
    expect(parseTextFieldKey('content:hero.name')).toEqual({ source: 'content', path: 'hero.name' })
    expect(parseTextFieldKey('dict:nav.home')).toEqual({ source: 'dict', path: 'nav.home' })
  })

  it('önek yoksa content sayar', () => {
    expect(parseTextFieldKey('hero.name')).toEqual({ source: 'content', path: 'hero.name' })
  })
})

describe('getPath / setPath / deletePath', () => {
  it('nokta yoluyla okur, dizi indeksini destekler', () => {
    const source = { hero: { stats: [{ label: 'Proje' }] } }
    expect(getPath(source, 'hero.stats.0.label')).toBe('Proje')
    expect(getPath(source, 'hero.yok')).toBeUndefined()
  })

  it('ara nesneyi kurar, kaynağı değiştirmez', () => {
    const source = { about: { title: 'Eski' } }
    const next = setPath(source, 'about.subtitle', 'Yeni')
    expect(getPath(next, 'about.subtitle')).toBe('Yeni')
    expect(getPath(next, 'about.title')).toBe('Eski')
    expect(source).toEqual({ about: { title: 'Eski' } })
  })

  it('dizi indeksi için dizi kurar', () => {
    const next = setPath({}, 'hero.stats.0.label', 'x')
    expect(getPath(next, 'hero.stats.0.label')).toBe('x')
    expect(Array.isArray(getPath(next, 'hero.stats'))).toBe(true)
  })

  it('silinen yol değeri kaldırır, kardeşleri korur', () => {
    const source = { about: { title: 'A', subtitle: 'B' } }
    const next = deletePath(source, 'about.subtitle')
    expect(getPath(next, 'about.subtitle')).toBeUndefined()
    expect(getPath(next, 'about.title')).toBe('A')
    expect(getPath(source, 'about.subtitle')).toBe('B')
  })
})

describe('asText', () => {
  it('diziyi satır satır yazar', () => {
    expect(asText(['a', 'b'])).toBe('a\nb')
    expect(asText(null)).toBe('')
    expect(asText(42)).toBe('42')
  })
})

describe('parsePastedText', () => {
  it('satır başına `anahtar: değer` okur', () => {
    expect(parsePastedText('content:about.title: Hakkımda\ndict:nav.home: Ana Sayfa')).toEqual({
      'content:about.title': 'Hakkımda',
      'dict:nav.home': 'Ana Sayfa',
    })
  })

  it('`=` ayırıcısını da kabul eder', () => {
    expect(parsePastedText('content:about.title = Hakkımda')).toEqual({
      'content:about.title': 'Hakkımda',
    })
  })

  it('jSON biçimini okur, diziyi satırlara böler', () => {
    expect(parsePastedText('{"content:about.title":"Hakkımda","dict:now.learning":["a","b"]}')).toEqual({
      'content:about.title': 'Hakkımda',
      'dict:now.learning': 'a\nb',
    })
  })

  it('çok satırlı değeri bir önceki anahtara ekler', () => {
    const parsed = parsePastedText('content:about.bio: İlk satır\nİkinci satır')
    expect(parsed['content:about.bio']).toBe('İlk satır\nİkinci satır')
  })

  it('anahtarsız serbest metni yok sayar', () => {
    expect(parsePastedText('sadece düz metin')).toEqual({})
    expect(parsePastedText('   ')).toEqual({})
  })
})

describe('isListField / coerceFieldValue', () => {
  it('now listelerini satır dizisine çevirir', () => {
    expect(isListField('content:phase6.now.learning')).toBe(true)
    expect(isListField('content:about.title')).toBe(false)
    expect(coerceFieldValue('content:phase6.now.learning', 'a\n b \n')).toEqual(['a', 'b'])
  })

  it('düz metin alanı metin kalır, boş değer boş metindir', () => {
    expect(coerceFieldValue('content:about.title', ' Hakkımda ')).toBe('Hakkımda')
    expect(coerceFieldValue('content:about.title', '   ')).toBe('')
  })
})

describe('pAGE_SPECS', () => {
  it('istenen her sayfa için ayrı spec var', () => {
    for (const id of ['home', 'about', 'projects', 'blog', 'chat', 'contact', 'donate', 'now', 'credits', 'privacy', 'kvkk', 'github']) {
      expect(findPage(id), `${id} spec'i yok`).toBeTruthy()
    }
  })
})
