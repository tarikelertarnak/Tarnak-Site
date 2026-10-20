import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/locale-provider'
import { Phase6EmptyI18n, Phase6Title } from '@/components/phase6-client'

/**
 * Ek bölüm sayfalarının (uses/now/changelog) boş durum metinleri.
 *
 * REGRESYON (2026-10-20): bu metinler sunucuda HARDCODE Türkçeydi
 * (`phase6-server.tsx` içindeki `Phase6Empty`). Kök layout `force-static` +
 * `getStaticLocale()` sabit 'tr' olduğu için EN ziyaretçi kalıcı Türkçe
 * görüyordu — canlıda ölçüldü:
 *   /uses/  → "Kullandıklarım listesi henüz eklenmedi."
 *   /now/   → "Şu an listesi henüz güncellenmedi."
 * Metinler istemciye (`phase6-client.tsx`) taşındı ve sözlükten okunuyor.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

function setNavigatorLanguage(value: string) {
  Object.defineProperty(navigator, 'language', { value, configurable: true })
}

afterEach(cleanup)

function renderWith(locale: 'en' | 'tr', node: React.ReactNode) {
  setNavigatorLanguage(locale === 'en' ? 'en-US' : 'tr-TR')
  return render(<LocaleProvider detectedLocale={locale}>{node}</LocaleProvider>)
}

describe('Phase6EmptyI18n', () => {
  it('EN: uses bos durumu Ingilizce', () => {
    renderWith('en', <Phase6EmptyI18n kind="uses" />)
    expect(screen.getByText('The list of things I use has not been added yet.')).toBeDefined()
  })

  it('TR: uses bos durumu Turkce', () => {
    renderWith('tr', <Phase6EmptyI18n kind="uses" />)
    expect(screen.getByText('Kullandıklarım listesi henüz eklenmedi.')).toBeDefined()
  })

  it('EN: now ve changelog Ingilizce', () => {
    renderWith('en', <Phase6EmptyI18n kind="now" />)
    expect(screen.getByText('The now list has not been updated yet.')).toBeDefined()
    cleanup()
    renderWith('en', <Phase6EmptyI18n kind="changelog" />)
    expect(screen.getByText('No changelog entries yet.')).toBeDefined()
  })

  /* Cevrilmemis TR metin EN modda GORUNMEMELI — asil sikayet buydu. */
  it('EN modda hicbir TR bos-durum metni sizmaz', () => {
    const trMetinler = ['listesi henüz', 'güncellenmedi', 'kaydı yok', 'Admin panelinden']
    for (const kind of ['uses', 'now', 'changelog'] as const) {
      renderWith('en', <Phase6EmptyI18n kind={kind} />)
      for (const t of trMetinler) {
        expect(document.body.textContent).not.toContain(t)
      }
      cleanup()
    }
  })
})

describe('Phase6Title', () => {
  it('veri varsa onu gosterir (sozluge bakmaz)', () => {
    renderWith('en', <Phase6Title value="Benim Listem" kind="uses" />)
    expect(screen.getByText('Benim Listem')).toBeDefined()
  })

  it('veri yoksa sozlukten varsayilan', () => {
    renderWith('en', <Phase6Title kind="uses" />)
    expect(screen.getByText('Things I Use')).toBeDefined()
  })

  it('labelKey ile now alt grubu cevrilir', () => {
    renderWith('en', <Phase6Title labelKey="now.learning" />)
    expect(screen.getByText('Learning')).toBeDefined()
  })
})
