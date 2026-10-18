import type { AboutPage } from '@/lib/about-page'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPageView } from '@/components/about/about-page-view'
import { LocaleProvider } from '@/components/locale-provider'
import { parseAboutPage } from '@/lib/about-page'

/**
 * `/about` görünümü durum testleri (2026-10-17).
 *
 * Kanıtlanan kabul ölçütleri:
 *  · 2 — Türkçe seçiliyken TAM Türkçe metin,
 *  · 3 — İngilizce seçiliyken TAM İngilizce metin (aynı bölümde karışmaz),
 *  · 13 — veri yokken yerelleştirilmiş BOŞ DURUM (uydurma biyografi yok),
 *  · 14 — okuma hatasında HATA DURUMU (boş sanılmaz),
 *  · 16 — GitHub adresi ayardan gelir, localhost bağlantı üretilmez.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

/**
 * Lobehub `Button` `ConfigProvider`/`MotionProvider` ister ve `@lobehub/ui`
 * barrel'ı vitest'te JSON import özniteliği hatası verir (bkz.
 * `overview-panel.test.tsx`). Testin amacı Lobehub'u değil SAYFA mantığını
 * doğrulamak; buton basit bir `<a>`/`<button>`a indirilir. `href` korunur ki
 * "GitHub adresi ayardan gelir, localhost içermez" iddiası ölçülebilsin.
 */
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onPress,
    href,
    startContent,
    endContent,
  }: {
    children?: React.ReactNode
    onPress?: () => void
    href?: string
    startContent?: React.ReactNode
    endContent?: React.ReactNode
  }) =>
    href
      ? (
          <a href={href}>
            {startContent}
            {children}
            {endContent}
          </a>
        )
      : (
          <button type="button" onClick={onPress}>
            {startContent}
            {children}
            {endContent}
          </button>
        ),
}))

function testPage(): AboutPage {
  const parsed = parseAboutPage({
    title: { tr: 'HAKKIMDA', en: 'ABOUT ME' },
    intro: { tr: 'Örnek Türkçe metin.', en: 'Sample English text.' },
    areas: [{
      key: 'sample-area',
      title: { tr: 'Örnek alan', en: 'Sample area' },
      description: { tr: 'Türkçe açıklama.', en: 'English description.' },
      period: '',
    }],
    journey: [{
      key: 'sample-journey',
      title: { tr: 'Örnek adım', en: 'Sample step' },
      description: { tr: 'Türkçe adım.', en: 'English step.' },
      period: '',
    }],
    values: [{
      key: 'sample-value',
      title: { tr: 'Örnek değer', en: 'Sample value' },
      description: { tr: 'Türkçe değer.', en: 'English value.' },
      period: '',
    }],
    closing: { tr: 'Kapanış Türkçe.', en: 'Closing in English.' },
  })
  if (!parsed)
    throw new Error('test sayfası ayrıştırılamadı')
  return parsed
}

const GITHUB = 'https://github.com/tarikelertarnak'

function ciz({
  aboutPage,
  readFailed = false,
  locale = 'tr',
}: {
  aboutPage: AboutPage | null
  readFailed?: boolean
  locale?: 'tr' | 'en' | 'de'
}) {
  return render(
    <LocaleProvider detectedLocale={locale}>
      <AboutPageView
        aboutPage={aboutPage}
        readFailed={readFailed}
        githubUrl={GITHUB}
      />
    </LocaleProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('aboutPageView — boş ve hata durumları', () => {
  it('içerik yoksa Türkçe boş durum gösterir', () => {
    ciz({ aboutPage: null })
    expect(screen.getByText('Hakkımda içeriği yakında')).toBeTruthy()
    expect(
      screen.getByText('Bu bölüm için içerik henüz eklenmedi.'),
    ).toBeTruthy()
  })

  it('içerik yoksa İngilizce boş durum gösterir', () => {
    ciz({ aboutPage: null, locale: 'en' })
    expect(screen.getByText('About content coming soon')).toBeTruthy()
    expect(
      screen.getByText('Content for this section hasn\'t been added yet.'),
    ).toBeTruthy()
  })

  it('boş kayıt (tüm alanlar boş) UYDURMA metin basmaz', () => {
    const bos = parseAboutPage({
      title: { tr: '', en: '' },
      intro: { tr: '', en: '' },
      closing: { tr: '', en: '' },
      areas: [],
      journey: [],
      values: [],
    })!
    ciz({ aboutPage: bos })
    expect(screen.getByText('Hakkımda içeriği yakında')).toBeTruthy()
  })

  it('okuma hatası boş durumdan AYRI gösterilir', () => {
    ciz({ aboutPage: null, readFailed: true })
    expect(screen.getByText('İçerik yüklenemedi')).toBeTruthy()
    expect(screen.getByText('Tekrar Dene')).toBeTruthy()
    expect(screen.queryByText('Hakkımda içeriği yakında')).toBeNull()
  })

  it('hata bayrağı içerik varken de hata durumu gösterir (sessizce yutulmaz)', () => {
    ciz({ aboutPage: testPage(), readFailed: true })
    expect(screen.getByText('İçerik yüklenemedi')).toBeTruthy()
    expect(screen.getByText('Tekrar Dene')).toBeTruthy()
    // Biyografi basılmaz: okunamayan veriyi doğruymuş gibi göstermek
    // yanıltıcı olur.
    expect(screen.queryByText('Örnek alan')).toBeNull()
  })
})

describe('aboutPageView — içerik ve dil', () => {
  const page = testPage()

  it('türkçe seçiliyken Türkçe metinleri gösterir', () => {
    ciz({ aboutPage: page })
    expect(
      screen.getByText('Örnek Türkçe metin.'),
    ).toBeTruthy()
    expect(screen.getByText('Örnek alan')).toBeTruthy()
    expect(screen.getByText('Örnek adım')).toBeTruthy()
    expect(screen.getByText('Örnek değer')).toBeTruthy()
  })

  it('i̇ngilizce seçiliyken İngilizce metinleri gösterir (karışmaz)', () => {
    ciz({ aboutPage: page, locale: 'en' })
    expect(
      screen.getByText('Sample English text.'),
    ).toBeTruthy()
    expect(screen.getByText('Sample area')).toBeTruthy()
    expect(screen.getByText('Sample step')).toBeTruthy()
    expect(screen.getByText('Sample value')).toBeTruthy()
    expect(screen.queryByText('Örnek alan')).toBeNull()
  })

  it('uYDURMA YIL GÖSTERİLMEZ (dönemler boş)', () => {
    ciz({ aboutPage: page })
    expect(screen.queryByText('Örnek adım')).toBeTruthy()
    expect(screen.queryByText(/20\d{2}/)).toBeNull()
  })

  it('gitHub bağlantısı ayardan gelir, localhost içermez', () => {
    ciz({ aboutPage: page })
    const linkler = screen
      .getAllByRole('link')
      .map(a => a.getAttribute('href'))
      .filter(Boolean) as string[]
    expect(linkler).toContain(GITHUB)
    expect(linkler.every(h => !h.includes('localhost'))).toBe(true)
  })
})
