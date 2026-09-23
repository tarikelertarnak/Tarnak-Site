import type { SiteContent } from '@/lib/content'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContactQuickMenu } from '@/components/contact-quick-menu'

// jsdom'da `window.scrollBy` uygulanmadi — panel yer yoksa sayfayi asagi
// kaydirmak icin cagriliyor; testte sessiz bir kopya koy.
window.scrollBy = () => {}

/**
 * Iletisim hizli menu testleri.
 *
 * `useT` mock'lanir: gercek LocaleProvider saglayici gerektirir ve bu test
 * i18n altyapisini degil MENU davranisini dogruluyor.
 */
const TR: Record<string, string> = {
  'contact.quickMenu': 'İletişim Bilgileri',
  'contact.searchPlaceholder': 'Ara...',
  'contact.clearSearch': 'Aramayı temizle',
  'contact.copy': 'Kopyala',
  'contact.copied': 'Kopyalandı',
  'contact.copyFailed': 'Panoya kopyalanamadı. Değeri elle seçip kopyalayın.',
  'contact.noResults': 'Sonuç bulunamadı',
  'contact.empty': 'Kayıtlı iletişim bilgisi yok.',
  'contact.socials': 'Sosyal Medya',
  'contact.cardEmail': 'E-posta',
  'contact.cardPhone': 'Telefon',
  'contact.cardLocation': 'Konum',
  'contact.mapsGoogle': 'Google Haritalar',
  'contact.mapsYandex': 'Yandex Haritalar',
}

vi.mock('@/components/locale-provider', () => ({
  useT: () => ({ t: (key: string) => TR[key] ?? key, locale: 'tr' }),
}))

const CONTENT = {
  contact: {
    email: 'tarik@ornek.com',
    phone: '+90 551 895 72 15',
    location: 'https://maps.google.com/?q=konya',
    locationYandex: 'https://yandex.com.tr/maps/konya',
  },
  social: [
    { name: 'GitHub', href: 'https://github.com/TARIKELER-TARNAK', icon: 'mdi:github' },
    { name: 'Instagram', href: 'https://www.instagram.com/tarikeler_tarnak/', icon: 'mdi:instagram' },
  ],
} as unknown as SiteContent

const EMPTY_CONTENT = { contact: {}, social: [] } as unknown as SiteContent

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true })
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'clipboard')
  vi.restoreAllMocks()
})

function open() {
  fireEvent.click(screen.getByRole('button', { name: /İletişim Bilgileri/ }))
}

describe('ContactQuickMenu', () => {
  it('kapaliyken yalnizca tetikleyici butonu gosterir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    expect(screen.getByRole('button', { name: /İletişim Bilgileri/ })).toBeTruthy()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('tiklaninca tum iletisim yollarini acar', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const menu = within(screen.getByRole('menu'))
    expect(menu.getByText('E-posta')).toBeTruthy()
    expect(menu.getByText('Telefon')).toBeTruthy()
    expect(menu.getByText('Google Haritalar')).toBeTruthy()
    expect(menu.getByText('Yandex Haritalar')).toBeTruthy()
    expect(menu.getByText('GitHub')).toBeTruthy()
    expect(menu.getByText('Instagram')).toBeTruthy()
  })

  it('sosyal bolum basligini gosterir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    expect(within(screen.getByRole('menu')).getByText('Sosyal Medya')).toBeTruthy()
  })

  it('e-posta satiri mailto baglantisi, telefon tel baglantisi olur', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const menu = within(screen.getByRole('menu'))

    expect(menu.getByText('tarik@ornek.com').closest('a')?.getAttribute('href'))
      .toBe('mailto:tarik@ornek.com')
    expect(menu.getByText('+90 551 895 72 15').closest('a')?.getAttribute('href'))
      .toBe('tel:+905518957215')
  })

  it('harita baglantilari yeni sekmede acilir ve noopener icerir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const link = within(screen.getByRole('menu')).getByText('Google Haritalar').closest('a')!
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  // ------------------------------------------------------------------ ARAMA

  it('arama yazinca listeyi suzer', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    fireEvent.change(screen.getByPlaceholderText('Ara...'), { target: { value: 'instagram' } })

    const menu = within(screen.getByRole('menu'))
    expect(menu.getByText('Instagram')).toBeTruthy()
    expect(menu.queryByText('GitHub')).toBeNull()
    expect(menu.queryByText('E-posta')).toBeNull()
  })

  it('arama buyuk harfle de calisir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    fireEvent.change(screen.getByPlaceholderText('Ara...'), { target: { value: 'INSTAGRAM' } })
    expect(within(screen.getByRole('menu')).getByText('Instagram')).toBeTruthy()
  })

  it('sonuc yoksa "Sonuç bulunamadı" gosterir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    fireEvent.change(screen.getByPlaceholderText('Ara...'), { target: { value: 'zzzz' } })
    expect(within(screen.getByRole('menu')).getByText('Sonuç bulunamadı')).toBeTruthy()
  })

  it('arama temizle butonu aramayi sifirlar', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const input = screen.getByPlaceholderText('Ara...') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'instagram' } })
    expect(input.value).toBe('instagram')

    fireEvent.click(screen.getByRole('button', { name: 'Aramayı temizle' }))
    expect(input.value).toBe('')
    expect(within(screen.getByRole('menu')).getByText('GitHub')).toBeTruthy()
  })

  // --------------------------------------------------------------- KOPYALAMA

  it('kopyala butonu dogru degeri panoya yazar ve basari geri bildirimi verir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const button = screen.getByRole('button', { name: 'E-posta — Kopyala' })
    // Baslangicta "Kopyala" ipucu ve notr stil
    expect(button.getAttribute('title')).toBe('Kopyala')
    expect(button.className).not.toContain('text-success')

    fireEvent.click(button)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('tarik@ornek.com'))
    // Basari geri bildirimi: ipucu metni + yesil stil (ikon tik isaretine doner)
    await waitFor(() => expect(button.getAttribute('title')).toBe('Kopyalandı'))
    expect(button.className).toContain('text-success')
  })

  it('telefon kopyalanirken okunakli deger kopyalanir (tel: degil)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<ContactQuickMenu content={CONTENT} />)
    open()

    fireEvent.click(screen.getByRole('button', { name: 'Telefon — Kopyala' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('+90 551 895 72 15'))
  })

  it('sosyal kanalda TAM adres kopyalanir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<ContactQuickMenu content={CONTENT} />)
    open()

    fireEvent.click(screen.getByRole('button', { name: 'Instagram — Kopyala' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://www.instagram.com/tarikeler_tarnak/'))
  })

  it('kopyalama basarisizsa kullaniciyi UYARIR (sessiz basari yok)', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('izin yok')) })
    // fallback de basarisiz olsun
    Object.defineProperty(document, 'execCommand', { value: undefined, configurable: true })

    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const button = screen.getByRole('button', { name: 'E-posta — Kopyala' })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByText(/Panoya kopyalanamadı/)).toBeTruthy())
    // Basari geri bildirimi GOSTERILMEMELI
    expect(button.getAttribute('title')).toBe('Kopyala')
    expect(button.className).not.toContain('text-success')

    Reflect.deleteProperty(document as unknown as Record<string, unknown>, 'execCommand')
  })

  // ------------------------------------------------------------- BOS / KAPATMA

  it('iletisim bilgisi yoksa bilgilendirir', () => {
    render(<ContactQuickMenu content={EMPTY_CONTENT} />)
    open()
    expect(within(screen.getByRole('menu')).getByText('Kayıtlı iletişim bilgisi yok.')).toBeTruthy()
  })

  it('Escape ile kapanir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    expect(screen.getByRole('menu')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('disari tiklayinca kapanir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    expect(screen.getByRole('menu')).toBeTruthy()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('panel icinde tiklayinca KAPANMAZ (kopyalamaya devam edilebilsin)', () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    fireEvent.mouseDown(screen.getByRole('menu'))
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  // ------------------------------------------------------- YON: HER ZAMAN ASAGI
  // Kullanici geri bildirimi: "combobox asagi dogru acilmali". Onceki surum
  // altta yer yoksa YUKARI aciyordu; bu degisti. Panel artik her kosulda
  // `top-full` ile asagi acilir.

  it('panel ASAGI konumlanir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    expect(screen.getByRole('menu').className).toContain('top-full')
  })

  function stubTriggerRect(top: number, bottom: number) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom,
      left: 0,
      right: 0,
      width: 320,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect)
  }

  it('altta yer OLSUN ya da OLMASIN asagi acilir (yukari asla)', () => {
    // jsdom pencere yuksekligi 768; tetikleyici ekranin EN ALTINDA
    stubTriggerRect(660, 700)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const cls = screen.getByRole('menu').className
    expect(cls).toContain('top-full')
    expect(cls).not.toContain('bottom-full')
  })

  // ------------------------------------------------------- KAYDIRMA REGRESYONU
  // `autoFocus` tarayicinin odaklanan elemani gorunur alana kaydirmasina
  // yol aciyordu → sayfa EN USTE zipliyordu. Artik odak elle veriliyor.
  it('arama alaninda autoFocus YOK (sayfa uste kaymasin)', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const input = screen.getByLabelText('Ara...')
    expect(input.hasAttribute('autofocus')).toBe(false)
  })

  // ------------------------------------------------------- BOYUT: ALANA GORE
  it('panel yuksekligi alttaki bosluga gore olculur', () => {
    // 768 - 700 (tetikleyici alti) - 24 pay = 44 → asgari 240'a dusmeli
    stubTriggerRect(660, 700)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const list = screen.getByRole('menu').querySelector<HTMLElement>('[class*="overflow-y-auto"]')
    expect(list?.style.maxHeight).toBe('240px')
  })

  it('altta cok yer varsa panel buyur', () => {
    // 768 - 100 (tetikleyici alti) - 80 (panel arama kutusu payi) = 588
    stubTriggerRect(60, 100)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const list = screen.getByRole('menu').querySelector<HTMLElement>('[class*="overflow-y-auto"]')
    expect(list?.style.maxHeight).toBe('588px')
  })

  it('panel TOPLAM yuksekligi ekrani asmaz (arama kutusu dahil)', () => {
    // Regresyon: yukseklik yalnizca listeye uygulaniyordu, arama kutusu
    // hesaba katilmiyordu → panel ekranin altindan tasiyordu.
    stubTriggerRect(60, 100)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const list = screen.getByRole('menu').querySelector<HTMLElement>('[class*="overflow-y-auto"]')
    const h = Number.parseInt(list?.style.maxHeight ?? '0', 10)
    // liste + PANEL_CHROME(80) tetikleyicinin altindaki boslugu asmamali
    expect(100 + h + 80).toBeLessThanOrEqual(768)
  })

  // ------------------------------------------------------- KLAVYE GEZINMESI
  it('ArrowDown aktif satiri ilerletir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const rows = () => [...screen.getByRole('menu').querySelectorAll<HTMLElement>('li[data-index]')]
    const activeIdx = () =>
      rows().findIndex(r => r.className.includes('bg-foreground-200/15'))

    expect(activeIdx()).toBe(0)

    fireEvent.keyDown(screen.getByLabelText('Ara...'), { key: 'ArrowDown' })
    expect(activeIdx()).toBe(1)
  })

  it('ArrowUp son satirdan ilk satira doner (basa sarmali)', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const rows = () => [...screen.getByRole('menu').querySelectorAll<HTMLElement>('li[data-index]')]
    const activeIdx = () =>
      rows().findIndex(r => r.className.includes('bg-foreground-200/15'))

    const input = screen.getByLabelText('Ara...')
    fireEvent.keyDown(input, { key: 'End' })
    const last = rows().length - 1
    expect(activeIdx()).toBe(last)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(activeIdx()).toBe(0)
  })
})
