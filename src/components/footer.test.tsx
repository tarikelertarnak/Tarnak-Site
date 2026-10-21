import type { SiteContent } from '@/lib/content'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Footer } from '@/components/footer'

/**
 * Alt bilgi (footer) regresyon testleri — UX-007 (2026-10-10).
 *
 * "Başa dön" düğmesi `text-xs` + çıplak `<button>` idi: dolgusuz olduğu için
 * tıklama hedefi ~16px yüksekliğindeydi. WCAG 2.5.8 (Target Size, AA) 24×24 CSS
 * px minimum istiyor; mobilde bu pratikte dokunulamaz.
 *
 * Ayrıca landmark'lar (`<footer>`, `<nav>`) ve marka metni seçilebilirliği
 * kontrol edilir — bunlar kırılırsa ekran okuyucu gezinmesi bozulur.
 *
 * NOT: Renk/kontrast ölçümü burada DEĞİL — `theme-contrast.test.ts` kapsıyor.
 */

const TR: Record<string, string> = {
  'footer.backToTop': 'Başa dön',
  'footer.navigate': 'Gezinme',
  'footer.rights': 'Tüm hakları saklıdır.',
  'search.navigate': 'gezin',
}

vi.mock('@/components/locale-provider', () => ({
  useT: () => ({ t: (key: string) => TR[key] ?? key, locale: 'tr' }),
  // Footer artık veriyi istemcide yerelleştirir (`useLocalizedContent`);
  // testte TR taban içerik verildiği için kimlik dönüşü yeterli.
  useLocalizedContent: (content: unknown) => content,
}))

const CONTENT = {
  profile: {
    firstName: 'TARIK',
    lastName: 'ELER',
    nickname: 'Tarnak',
  },
  hero: { tagline: 'Kodun ötesinde.' },
  nav: { items: [] },
  footer: { copyright: 'Tüm hakları saklıdır.' },
  settings: { musicSrc: null },
  // `ContactQuickMenu` footer içinde de render ediliyor ve `contact`'a okuyor.
  contact: {
    email: 'tarik@ornek.com',
    phone: '+90 551 895 72 15',
    location: '',
    locationYandex: '',
  },
  social: [],
} as unknown as SiteContent

afterEach(() => {
  cleanup()
})

describe('footer', () => {
  it('"Başa dön" düğmesi WCAG 2.5.8 uyumlu dokunma hedefine sahip (min-h-11 = 44px)', () => {
    render(<Footer content={CONTENT} />)
    const btn = screen.getByRole('button', { name: /başa dön/i })
    // 24px minimum → 44px sınıfı (`min-h-11`). Kaldırılırsa bu test kırılır.
    expect(btn.className).toContain('min-h-11')
    expect(btn.className).toContain('inline-flex')
  })

  it('"Başa dön" düğmesi form tetiklemez (type=button) ve erişilebilir ada sahip', () => {
    render(<Footer content={CONTENT} />)
    const btn = screen.getByRole('button', { name: /başa dön/i })
    expect(btn.getAttribute('type')).toBe('button')
    // Görünür metin veya aria-label → ekran okuyucu erişimi.
    expect(btn.getAttribute('aria-label') ?? btn.textContent ?? '').toMatch(
      /başa dön/i,
    )
  })

  it('landmark rolleri mevcut (<footer> + <nav aria-label>)', () => {
    render(<Footer content={CONTENT} />)
    expect(screen.getByRole('contentinfo')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: /gezinme/i })).toBeTruthy()
  })

  it('marka metni "AD SOYAD (TAKMAAD)" biçiminde ve seçilebilir', () => {
    render(<Footer content={CONTENT} />)
    const brand = screen.getByText(/TARIK ELER \(TARNAK\)/)
    expect(brand.className).toContain('select-text')
  })
})
