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
  uniqueKey,
} from '@/lib/about-page'

/**
 * `/about` içerik şeması + seed doğrulaması (2026-10-17).
 *
 * Bu dosya özellikle ŞUNU kanıtlar: `supabase/about-page.sql` içine gömülen
 * içerik şemadan geçer ve kullanıcının verdiği TR/EN metinlerle BİREBİR
 * aynıdır. Böylece "SQL'deki içerik ile şema kodu ayrı ayrı bozulur" hatası
 * test edilir.
 */

/** SQL'deki `$about${ ... }$about$` gövdesini çıkarır (JSONB). */
function seedFromSql(): unknown {
  const sql = readFileSync(
    join(process.cwd(), 'supabase', 'about-page.sql'),
    'utf-8',
  )
  const eslesme = sql.match(/\$about\$([\s\S]*?)\$about\$/)
  if (!eslesme?.[1])
    throw new Error('about-page.sql içinde $about$ gövdesi bulunamadı')
  return JSON.parse(eslesme[1])
}

const TR_INTRO = 'Merhaba, ben Tarık Eler. Dijital dünyada TARNAK adını kullanıyorum.\n\nYazılım geliştirmeyi öğreniyor, kendi projelerimi geliştiriyor ve teknolojiyle yeni şeyler deniyorum. HTML, CSS, JavaScript, Python, C# ve SQL ile çalışıyorum.\n\nBenim için önemli olan yalnızca bir şeyin çalışması değil, onu nasıl geliştirdiğim ve üzerinde ne kadar kontrol sahibi olduğum. Ücretsiz ve açık kaynak araçları, yerel yapay zekâyı, otomasyonu, gizliliği ve dijital özgürlüğü önemsiyorum.'

const EN_INTRO = 'Hi, I\'m Tarık Eler. I go by TARNAK in the digital world.\n\nI\'m learning software development, building my own projects, and exploring new ideas through technology. I work with HTML, CSS, JavaScript, Python, C#, and SQL.\n\nFor me, it\'s not just about making something work. I also care about how it\'s built and how much control I have over it. I value free and open-source tools, local AI, automation, privacy, and digital freedom.'

const TR_CLOSING = 'Burada öğrenme sürecimi, projelerimi ve geliştirdiğim fikirleri paylaşıyorum. Neler üzerinde çalıştığımı görmek için GitHub profilime göz atabilirsin.'

const EN_CLOSING = 'This is where I share my learning journey, projects, and ideas. Visit my GitHub profile to see what I\'m working on.'

const ALANLAR = [
  {
    key: 'web-development',
    tr: 'Web geliştirme',
    en: 'Web Development',
    trDesc: 'HTML, CSS ve JavaScript ile web geliştirme; kendi web sitem ve web tabanlı projelerim üzerinde çalışma.',
    enDesc: 'Building with HTML, CSS, and JavaScript, including my personal website and web-based projects.',
  },
  {
    key: 'software-development',
    tr: 'Yazılım geliştirme',
    en: 'Software Development',
    trDesc: 'Python, C# ve SQL ile programlama öğrenme ve farklı yazılım fikirlerini uygulamaya dönüştürme.',
    enDesc: 'Learning programming with Python, C#, and SQL and turning different software ideas into practical projects.',
  },
  {
    key: 'ai-automation',
    tr: 'Yapay zekâ ve otomasyon',
    en: 'AI and Automation',
    trDesc: 'Yapay zekâ destekli araçlar, kodlama ajanları ve günlük işleri kolaylaştıran otomasyonlarla çalışma.',
    enDesc: 'Exploring AI-powered tools, coding agents, and automation that makes everyday tasks easier.',
  },
  {
    key: 'personal-projects',
    tr: 'Kendi araçlarım ve projelerim',
    en: 'My Own Tools and Projects',
    trDesc: 'Fikirlerimi kendi projelerime dönüştürme ve çalışmalarımı TARNAK kimliği altında bir araya getirme.',
    enDesc: 'Turning my ideas into projects and bringing my work together under the TARNAK identity.',
  },
]

const YOLCULUK = [
  {
    key: 'early-beginnings',
    tr: 'İlk adımlar',
    en: 'The Beginning',
    trDesc: 'Yazılıma ortaokulda, Scratch benzeri bloklarla programlama yaparak başladım.',
    enDesc: 'I started exploring programming in middle school with block-based tools similar to Scratch.',
  },
  {
    key: 'high-school',
    tr: 'Lise dönemi',
    en: 'High School',
    trDesc: 'Bilişim alanını seçerek yazılım öğrenmeye devam ettim. 9. ve 10. sınıflarda edindiğim temelin üzerine bu yıl da yeni şeyler öğreniyorum.',
    enDesc: 'I chose an IT-focused education and continued learning software development. I built my foundations in grades 9 and 10, and I\'m continuing to learn this year.',
  },
  {
    key: 'present',
    tr: 'Şimdi',
    en: 'Today',
    trDesc: 'Web geliştirme, Python, C#, SQL ve yapay zekâ araçlarıyla kendi projelerimi geliştirmeye devam ediyorum.',
    enDesc: 'I\'m continuing to build my own projects while learning web development, Python, C#, SQL, and AI tools.',
  },
]

const DEGERLER = [
  {
    key: 'freedom',
    tr: 'Özgürlük',
    en: 'Freedom',
    trDesc: 'Kullandığım araçlar ve geliştirdiğim sistemler üzerinde mümkün olduğunca söz sahibi olmak istiyorum.',
    enDesc: 'I want to have as much control as possible over the tools I use and the systems I build.',
  },
  {
    key: 'privacy',
    tr: 'Gizlilik',
    en: 'Privacy',
    trDesc: 'Verilerimin nasıl kullanıldığına ve kontrolün kimde olduğuna önem veriyorum.',
    enDesc: 'I care about how my data is used and who has control over it.',
  },
  {
    key: 'open-source',
    tr: 'Açık kaynak',
    en: 'Open Source',
    trDesc: 'Ücretsiz ve açık kaynaklı araçları tercih ediyor, bunların sunduğu özgürlüğü önemsiyorum.',
    enDesc: 'I prefer free and open-source tools and value the freedom they offer.',
  },
  {
    key: 'automation-simplicity',
    tr: 'Otomasyon ve sadelik',
    en: 'Automation and Simplicity',
    trDesc: 'Gereksiz karmaşıklık yerine işi kolaylaştıran, anlaşılır çözümler arıyorum.',
    enDesc: 'I look for clear, practical solutions instead of unnecessary complexity.',
  },
  {
    key: 'follow-through',
    tr: 'İşi yarım bırakmamak',
    en: 'Following Through',
    trDesc: 'Bir fikir üzerinde çalışırken onu geliştirmeye ve mümkün olduğunca tamamlamaya önem veriyorum.',
    enDesc: 'When I work on an idea, I aim to keep improving it and bring it to completion whenever possible.',
  },
]

describe('aboutPage şeması', () => {
  it('boş girdi null döner (boş durum çağıranın işi)', () => {
    expect(parseAboutPage(undefined)).toBeNull()
    expect(parseAboutPage(null)).toBeNull()
  })

  it('bozuk içerik null döner — build düşmez', () => {
    expect(parseAboutPage({ areas: 'dizi değil' })).toBeNull()
    expect(parseAboutPage({ title: { tr: 42 } })).toBeNull()
  })

  it('kısmi içerik varsayılanlarla geçerli sayılır', () => {
    const parsed = parseAboutPage({ title: { tr: 'HAKKIMDA', en: 'ABOUT ME' } })
    expect(parsed?.areas).toEqual([])
    expect(parsed?.journey).toEqual([])
    expect(parsed?.values).toEqual([])
  })

  it('madde anahtarı kebab-case olmalı', () => {
    expect(aboutKeySchema.safeParse('web-development').success).toBe(true)
    expect(aboutKeySchema.safeParse('Web Development').success).toBe(false)
    expect(aboutKeySchema.safeParse('web_development').success).toBe(false)
    expect(aboutKeySchema.safeParse('-web').success).toBe(false)
    expect(aboutKeySchema.safeParse('').success).toBe(false)
  })

  it('aynı listede TEKRARLANAN anahtar reddedilir', () => {
    const madde = {
      key: 'web-development',
      title: { tr: 'A', en: 'A' },
      description: { tr: '', en: '' },
    }
    const sonuc = aboutPageSchema.safeParse({
      areas: [madde, { ...madde, title: { tr: 'B', en: 'B' } }],
    })
    expect(sonuc.success).toBe(false)
    if (!sonuc.success) {
      expect(
        sonuc.error.issues.some(i => i.message.includes('iki kez')),
      ).toBe(true)
    }
  })

  it('farklı listelerde aynı anahtar sorun değil', () => {
    const madde = {
      key: 'ortak',
      title: { tr: 'A', en: 'A' },
      description: { tr: '', en: '' },
    }
    expect(
      aboutPageSchema.safeParse({ areas: [madde], values: [madde] }).success,
    ).toBe(true)
  })
})

describe('normalizeAboutPage', () => {
  it('çöp girdide bile çalışır ve İÇERİK UYDURMAZ', () => {
    const page = normalizeAboutPage('bozuk')
    expect(page).toEqual({
      title: { tr: '', en: '' },
      intro: { tr: '', en: '' },
      areas: [],
      journey: [],
      values: [],
      closing: { tr: '', en: '' },
    })
  })

  it('eksik madde alanlarını boş metinle tamamlar', () => {
    const page = normalizeAboutPage({ areas: [{ key: 'a-b' }] })
    expect(page.areas[0]).toEqual({
      key: 'a-b',
      title: { tr: '', en: '' },
      description: { tr: '', en: '' },
      period: '',
    })
  })

  it('geçici geçersiz durumu (boş başlık) korur — editör kilitlenmez', () => {
    const page = normalizeAboutPage({ values: [{ key: 'a' }] })
    expect(page.values).toHaveLength(1)
  })
})

describe('aboutPageErrors', () => {
  const bos = normalizeAboutPage({})

  it('boş başlığı bildirir', () => {
    const page = { ...bos, values: [{ key: 'freedom', title: { tr: '', en: '' }, description: { tr: '', en: '' }, period: '' }] }
    expect(aboutPageErrors(page)).toEqual([
      'Değerler #1: başlık (TR veya EN) boş olamaz.',
    ])
  })

  it('çift anahtarı satır numarasıyla bildirir', () => {
    const madde = { key: 'a', title: { tr: 'x', en: '' }, description: { tr: '', en: '' }, period: '' }
    const page = { ...bos, areas: [madde, { ...madde }] }
    expect(aboutPageErrors(page)).toEqual([
      'Çalışma Alanları #2: "a" anahtarı zaten #1 satırında kullanılmış.',
    ])
  })

  it('geçersiz anahtarı bildirir', () => {
    const page = {
      ...bos,
      journey: [{ key: 'Bad Key', title: { tr: 'x', en: '' }, description: { tr: '', en: '' }, period: '' }],
    }
    expect(aboutPageErrors(page)[0]).toContain('anahtar geçersiz')
  })

  it('temiz içerikte hata yok', () => {
    const page = normalizeAboutPage(seedFromSql())
    expect(aboutPageErrors(page)).toEqual([])
  })
})

describe('seed (supabase/about-page.sql)', () => {
  const seed = seedFromSql()
  const page = parseAboutPage(seed)

  it('şemadan geçer', () => {
    expect(page).not.toBeNull()
  })

  it('başlık HAKKIMDA / ABOUT ME', () => {
    expect(page?.title).toEqual({ tr: 'HAKKIMDA', en: 'ABOUT ME' })
  })

  it('giriş ve kapanış metinleri BİREBİR', () => {
    expect(page?.intro.tr).toBe(TR_INTRO)
    expect(page?.intro.en).toBe(EN_INTRO)
    expect(page?.closing.tr).toBe(TR_CLOSING)
    expect(page?.closing.en).toBe(EN_CLOSING)
  })

  it('çalışma alanları tam ve sıralı (4 madde)', () => {
    expect(page?.areas.map(a => a.key)).toEqual(ALANLAR.map(a => a.key))
    ALANLAR.forEach((beklenen, i) => {
      expect(page?.areas[i]?.title.tr).toBe(beklenen.tr)
      expect(page?.areas[i]?.title.en).toBe(beklenen.en)
      expect(page?.areas[i]?.description.tr).toBe(beklenen.trDesc)
      expect(page?.areas[i]?.description.en).toBe(beklenen.enDesc)
    })
  })

  it('yolculuk maddeleri tam ve sıralı (3 madde)', () => {
    expect(page?.journey.map(a => a.key)).toEqual(YOLCULUK.map(a => a.key))
    YOLCULUK.forEach((beklenen, i) => {
      expect(page?.journey[i]?.title.tr).toBe(beklenen.tr)
      expect(page?.journey[i]?.title.en).toBe(beklenen.en)
      expect(page?.journey[i]?.description.tr).toBe(beklenen.trDesc)
      expect(page?.journey[i]?.description.en).toBe(beklenen.enDesc)
    })
  })

  it('uYDURMA TARİH YOK — tüm dönemler boş', () => {
    expect(page?.journey.every(j => j.period === '')).toBe(true)
  })

  it('değerler tam ve sıralı (5 madde)', () => {
    expect(page?.values.map(a => a.key)).toEqual(DEGERLER.map(a => a.key))
    DEGERLER.forEach((beklenen, i) => {
      expect(page?.values[i]?.title.tr).toBe(beklenen.tr)
      expect(page?.values[i]?.title.en).toBe(beklenen.en)
      expect(page?.values[i]?.description.tr).toBe(beklenen.trDesc)
      expect(page?.values[i]?.description.en).toBe(beklenen.enDesc)
    })
  })

  it('anahtarlar listede benzersiz', () => {
    for (const liste of [page!.areas, page!.journey, page!.values]) {
      const keys = liste.map(i => i.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('sQL var olan içeriği EZMEZ (yalnız aboutPage yoksa yazar)', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase', 'about-page.sql'),
      'utf-8',
    )
    // Yorumlanmış örnekleri hariç tut: gerçek UPDATE bloğunu ara.
    const guncelleme = sql.slice(sql.indexOf('UPDATE public.site_content'))
    expect(guncelleme).toContain('content -> \'aboutPage\' IS NULL')
    expect(guncelleme).not.toMatch(/^\s*DELETE /m)
  })
})

describe('pickLocalized', () => {
  const metin = { tr: 'Türkçe', en: 'English' }

  it('tr → Türkçe, en → İngilizce', () => {
    expect(pickLocalized(metin, 'tr')).toBe('Türkçe')
    expect(pickLocalized(metin, 'en')).toBe('English')
  })

  it('diğer diller taban dili (tr) gösterir — iç içe dil olmaz', () => {
    expect(pickLocalized(metin, 'de')).toBe('Türkçe')
    expect(pickLocalized(metin, 'ja')).toBe('Türkçe')
  })

  it('en boşsa tr gösterilir (boş alan bırakılmaz)', () => {
    expect(pickLocalized({ tr: 'Türkçe', en: '   ' }, 'en')).toBe('Türkçe')
  })

  it('tanımsız girdide boş string', () => {
    expect(pickLocalized(undefined, 'en')).toBe('')
  })
})

describe('paragraphs', () => {
  it('boş satırla ayırır, tek satırları birleştirir', () => {
    expect(paragraphs('bir\niki\n\nüç\n\n\n dört ')).toEqual([
      'bir\niki',
      'üç',
      'dört',
    ])
  })

  it('boş metinde boş dizi', () => {
    expect(paragraphs('   \n\n  ')).toEqual([])
  })

  it('seed girişi üç paragraf', () => {
    expect(paragraphs(TR_INTRO)).toHaveLength(3)
  })
})

describe('uniqueKey', () => {
  it('boş tabanda madde üretir', () => {
    expect(uniqueKey('', [])).toBe('madde')
  })

  it('türkçe karakterleri sadeleştirir', () => {
    expect(uniqueKey('Yapay zekâ ve otomasyon', [])).toBe(
      'yapay-zeka-ve-otomasyon',
    )
  })

  it('çakışmada son ek ekler', () => {
    expect(uniqueKey('web', ['web'])).toBe('web-2')
    expect(uniqueKey('web', ['web', 'web-2'])).toBe('web-3')
  })
})
