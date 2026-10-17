import type { AboutPage } from '@/lib/about-page'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

function seedPage(): AboutPage {
  const sql = readFileSync(
    join(process.cwd(), 'supabase', 'about-page.sql'),
    'utf-8',
  )
  const govde = sql.match(/\$about\$([\s\S]*?)\$about\$/)![1]!
  const parsed = parseAboutPage(JSON.parse(govde))
  if (!parsed)
    throw new Error('seed ayrıştırılamadı')
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
    ciz({ aboutPage: seedPage(), readFailed: true })
    expect(screen.getByText('İçerik yüklenemedi')).toBeTruthy()
    expect(screen.getByText('Tekrar Dene')).toBeTruthy()
    // Biyografi basılmaz: okunamayan veriyi doğruymuş gibi göstermek
    // yanıltıcı olur.
    expect(screen.queryByText('Web geliştirme')).toBeNull()
  })
})

describe('aboutPageView — içerik ve dil', () => {
  const page = seedPage()

  it('türkçe seçiliyken Türkçe metinleri gösterir', () => {
    ciz({ aboutPage: page })
    expect(
      screen.getByText('Merhaba, ben Tarık Eler. Dijital dünyada TARNAK adını kullanıyorum.'),
    ).toBeTruthy()
    expect(screen.getByText('Web geliştirme')).toBeTruthy()
    expect(screen.getByText('Üzerinde Çalıştığım Alanlar')).toBeTruthy()
    expect(screen.getByText('Yolculuğum')).toBeTruthy()
    expect(screen.getByText('Değerlerim')).toBeTruthy()
    expect(screen.getByText('Açık kaynak')).toBeTruthy()
  })

  it('i̇ngilizce seçiliyken İngilizce metinleri gösterir (karışmaz)', () => {
    ciz({ aboutPage: page, locale: 'en' })
    expect(
      screen.getByText('Hi, I\'m Tarık Eler. I go by TARNAK in the digital world.'),
    ).toBeTruthy()
    expect(screen.getByText('Areas I Focus On')).toBeTruthy()
    expect(screen.getByText('My Journey')).toBeTruthy()
    expect(screen.getByText('My Values')).toBeTruthy()
    expect(screen.queryByText('Web geliştirme')).toBeNull()
  })

  it('uYDURMA YIL GÖSTERİLMEZ (dönemler boş)', () => {
    ciz({ aboutPage: page })
    for (const yil of ['2019', '2020', '2021', '2022', '2023', '2024'])
      expect(screen.queryByText(yil)).toBeNull()
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
