import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider, useLocale } from '@/components/locale-provider'

/**
 * LocaleProvider testleri — SUNUCU/ISTEMCI UYUSMAZLIGI regresyonu icin.
 *
 * Gercek hata: sunucu `accept-language` basligina, istemci `navigator.language`
 * degerine bakiyordu. Tarayici arayuz dili ile isletim sistemi dili ayrisinca
 * sayfa **Ingilizce icerik + Turkce arayuz** olarak cikiyordu (olculdu:
 * html lang="en", ama "Gezinme"/"Takip Et" Turkce). Cozum: otomatik algilama
 * icin TEK kaynak sunucunun karari (`detectedLocale` prop'u).
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

function Probe() {
  const { locale, detected } = useLocale()
  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span data-testid="detected">{detected}</span>
    </>
  )
}

function setNavigatorLanguage(value: string) {
  Object.defineProperty(navigator, 'language', { value, configurable: true })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('LocaleProvider', () => {
  it('detectedLocale VERILIRSE onu kullanir (sunucu karari kazanir)', () => {
    // Istemci "tr" diyor ama sunucu "en" demis → sunucu kazanmali
    setNavigatorLanguage('tr-TR')
    render(
      <LocaleProvider detectedLocale="en">
        <Probe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(screen.getByTestId('detected').textContent).toBe('en')
  })

  it('detectedLocale VERILMEZSE navigator.language`a duser', () => {
    setNavigatorLanguage('de-DE')
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('de')
  })

  it('detectedLocale="tr" iken arayuz Turkce kalir', () => {
    setNavigatorLanguage('en-US')
    render(
      <LocaleProvider detectedLocale="tr">
        <Probe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('tr')
  })

  it('taninmayan navigator dili varsayilan olarak `en` verir', () => {
    setNavigatorLanguage('xx-YY')
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('locale').textContent).toBe('en')
  })
})
