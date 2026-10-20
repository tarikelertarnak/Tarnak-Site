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

describe('localeProvider', () => {
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

  /*
    `<html lang>`/`dir` senkronu (2026-10-20).

    REGRESYON: kök layout `force-static` → sunucu HTML'i HER ZAMAN
    `lang="tr"` basar. İstemci metni EN'e çevirince `lang` "tr" kalıyordu,
    ve CSS `text-transform: uppercase` + `lang="tr"` birlikte TÜRKÇE
    büyük-harf kuralını uyguluyordu: `i` → `İ`. Canlıda ölçüldü:
    `/donate` EN modda tablo başlığı "LİNK" (doğrusu "LINK").
  */
  it('<html lang>`i aktif dile gore gunceller — "LİNK" regresyonu', () => {
    setNavigatorLanguage('en-US')
    document.documentElement.lang = 'tr' // sunucunun sabit bastigi deger

    render(
      <LocaleProvider detectedLocale="en">
        <Probe />
      </LocaleProvider>,
    )

    expect(document.documentElement.lang).toBe('en')
  })

  it('<html dir>`i RTL dillerde rtl yapar (ar/fa/he)', () => {
    setNavigatorLanguage('ar-SA')
    render(
      <LocaleProvider detectedLocale="ar">
        <Probe />
      </LocaleProvider>,
    )

    expect(document.documentElement.dir).toBe('rtl')
  })

  it('<html dir>`i LTR dillerde ltr yapar', () => {
    setNavigatorLanguage('en-US')
    document.documentElement.dir = 'rtl' // onceki sayfadan kalinti

    render(
      <LocaleProvider detectedLocale="de">
        <Probe />
      </LocaleProvider>,
    )

    expect(document.documentElement.dir).toBe('ltr')
  })
})
