import { describe, expect, it } from 'vitest'
import {
  contributionLevel,
  dayLabel,
  formatActivityDate,
  formatHoverDate,
  maxDayCount,
  monthSegments,
  normalizeActivity,
  normalizeContributions,
  ordinalDay,
} from '@/lib/github-contributions'

/**
 * GitHub katkı takvimi (2026-10-31).
 *
 * REGRESYON KİLİDİ: `/now` sayfası `public/github-contributions.json` dosyasını
 * doğrudan okur. Bu dosya `public/` altında durduğu için elle bozulabilir;
 * doğrulama geçmezse bölüm çizilmemeli (uydurma sayı göstermek yasak).
 * Ay etiketleri hücrelerle hizalanmak zorunda: segment genişliklerinin toplamı
 * hafta sayısına EŞİT olmazsa şerit kayar.
 */

function day(date: string, count: number) {
  return { date, count }
}

describe('normalizeContributions', () => {
  it('geçerli takvimi normalize eder', () => {
    const result = normalizeContributions({
      total: 5,
      weeks: [[day('2026-01-04', 2), day('2026-01-05', 3)]],
    })
    expect(result).toEqual({
      total: 5,
      weeks: [[day('2026-01-04', 2), day('2026-01-05', 3)]],
      activity: {},
      from: '2026-01-04',
      to: '2026-01-05',
    })
  })

  it('toplam yoksa günlerden hesaplar', () => {
    const result = normalizeContributions({
      weeks: [[day('2026-01-04', 2), day('2026-01-05', 4)]],
    })
    expect(result?.total).toBe(6)
  })

  it('bozuk şekillerde null döner (sayfa çökmez, bölüm çizilmez)', () => {
    expect(normalizeContributions(null)).toBeNull()
    expect(normalizeContributions({})).toBeNull()
    expect(normalizeContributions({ weeks: [] })).toBeNull()
    expect(normalizeContributions({ weeks: [[]] })).toBeNull()
    expect(normalizeContributions({ weeks: [[day('2026/01/04', 1)]] })).toBeNull()
    expect(normalizeContributions({ weeks: [[{ date: '2026-01-04', count: -1 }]] })).toBeNull()
    expect(normalizeContributions({ weeks: [[{ date: '2026-01-04', count: 'x' }]] })).toBeNull()
  })
})

describe('maxDayCount', () => {
  it('en yoğun günü bulur, boşta 0 verir', () => {
    expect(maxDayCount([[day('2026-01-04', 1)], [day('2026-01-05', 9), day('2026-01-06', 3)]])).toBe(9)
    expect(maxDayCount([])).toBe(0)
  })
})

describe('contributionLevel', () => {
  it('sıfır katkı en alt seviye', () => {
    expect(contributionLevel(0, 40)).toBe(0)
  })

  it('en yoğun güne göre dört dilime böler', () => {
    expect(contributionLevel(5, 40)).toBe(1)
    expect(contributionLevel(10, 40)).toBe(1)
    expect(contributionLevel(15, 40)).toBe(2)
    expect(contributionLevel(25, 40)).toBe(3)
    expect(contributionLevel(40, 40)).toBe(4)
  })

  it('max 0 ise (bozuk veri) en az bir seviye verir', () => {
    expect(contributionLevel(3, 0)).toBe(1)
  })
})

describe('monthSegments', () => {
  const weeks = [
    [day('2025-12-28', 0)],
    [day('2026-01-04', 1)],
    [day('2026-01-11', 0)],
    [day('2026-02-01', 2)],
  ]

  it('genişlikler toplamı hafta sayısına eşit (şerit kaymaz)', () => {
    const segments = monthSegments(weeks, 'tr')
    expect(segments.reduce((sum, s) => sum + s.span, 0)).toBe(weeks.length)
  })

  it('ay değişince yeni segment açar', () => {
    const segments = monthSegments(weeks, 'tr')
    expect(segments.map(s => s.span)).toEqual([1, 2, 1])
    expect(segments.map(s => s.label)).toEqual(['Ara', 'Oca', 'Şub'])
  })
})

describe('dayLabel', () => {
  it('tarih + katkı sayısını tek satırda verir', () => {
    const label = dayLabel('2026-01-04', 3, 'tr', 'katkı')
    expect(label).toContain('2026')
    expect(label).toContain('3 katkı')
  })
})

describe('gün kırılımı (activity)', () => {
  it('takvimle birlikte normalize edilir, depoya göre azalan sıralanır', () => {
    const result = normalizeContributions({
      total: 12,
      weeks: [[day('2026-06-05', 10), day('2026-06-06', 2)]],
      activity: {
        '2026-06-05': [
          { repo: 'tarikelertarnak/Player', url: 'https://github.com/tarikelertarnak/Player', count: 3 },
          { repo: 'tarikelertarnak/Tarnak-Site', url: 'https://github.com/tarikelertarnak/Tarnak-Site', count: 10 },
        ],
      },
    })
    expect(result?.activity['2026-06-05'].map(r => r.repo)).toEqual([
      'tarikelertarnak/Tarnak-Site',
      'tarikelertarnak/Player',
    ])
  })

  it('bozuk kayıtları SESSİZCE atar (uydurma depo yok)', () => {
    const activity = normalizeActivity({
      '2026-06-05': [
        { repo: 'a/b', count: 2 },
        { repo: 'a/b2', count: 0 },
        { repo: 'a/b3', count: -4 },
        { count: 5 },
        'çöp',
      ],
      'bozuk-tarih': [{ repo: 'x/y', count: 1 }],
      '2026-06-06': [],
    })
    expect(Object.keys(activity)).toEqual(['2026-06-05'])
    expect(activity['2026-06-05']).toEqual([
      { repo: 'a/b', url: 'https://github.com/a/b', count: 2 },
    ])
  })

  it('activity alanı yoksa boş nesne döner (eski snapshot)', () => {
    const result = normalizeContributions({ weeks: [[day('2026-01-04', 1)]] })
    expect(result?.activity).toEqual({})
  })
})

describe('tarih biçimleri (GitHub ipucu/panel)', () => {
  it('i̇ngilizce ipucu sıra sayısı ekiyle: "June 5th"', () => {
    expect(ordinalDay(1)).toBe('1st')
    expect(ordinalDay(2)).toBe('2nd')
    expect(ordinalDay(3)).toBe('3rd')
    expect(ordinalDay(11)).toBe('11th')
    expect(ordinalDay(12)).toBe('12th')
    expect(ordinalDay(13)).toBe('13th')
    expect(ordinalDay(21)).toBe('21st')
    expect(ordinalDay(22)).toBe('22nd')
    expect(formatHoverDate('2026-06-05', 'en')).toBe('June 5th')
  })

  it('türkçe ipucu yıl içermez, panel başlığı tam tarih verir', () => {
    expect(formatHoverDate('2026-06-05', 'tr')).toBe('5 Haziran')
    expect(formatActivityDate('2026-06-05', 'tr')).toBe('5 Haziran 2026')
    expect(formatActivityDate('2026-06-05', 'en')).toBe('June 5, 2026')
  })
})
