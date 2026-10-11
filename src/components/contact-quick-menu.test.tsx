import type { SiteContent } from '@/lib/content'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
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
    {
      name: 'GitHub',
      href: 'https://github.com/tarikelertarnak',
      icon: 'mdi:github',
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/tarikeler_tarnak/',
      icon: 'mdi:instagram',
    },
  ],
} as unknown as SiteContent

const EMPTY_CONTENT = { contact: {}, social: [] } as unknown as SiteContent

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(
    navigator as unknown as Record<string, unknown>,
    'clipboard',
  )
  vi.restoreAllMocks()
})

function open() {
  fireEvent.click(screen.getByRole('button', { name: /İletişim Bilgileri/ }))
}

describe('contactQuickMenu', () => {
  it('kapaliyken yalnizca tetikleyici butonu gosterir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    expect(
      screen.getByRole('button', { name: /İletişim Bilgileri/ }),
    ).toBeTruthy()
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
    expect(
      within(screen.getByRole('menu')).getByText('Sosyal Medya'),
    ).toBeTruthy()
  })

  it('e-posta satiri mailto baglantisi, telefon tel baglantisi olur', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const menu = within(screen.getByRole('menu'))

    expect(
      menu.getByText('tarik@ornek.com').closest('a')?.getAttribute('href'),
    ).toBe('mailto:tarik@ornek.com')
    expect(
      menu.getByText('+90 551 895 72 15').closest('a')?.getAttribute('href'),
    ).toBe('tel:+905518957215')
  })

  it('harita baglantilari yeni sekmede acilir ve noopener icerir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const link = within(screen.getByRole('menu'))
      .getByText('Google Haritalar')
      .closest('a')!
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  // ------------------------------------------------------------------ ARAMA

  it('arama yazinca listeyi suzer', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    fireEvent.change(screen.getByPlaceholderText('Ara...'), {
      target: { value: 'instagram' },
    })

    const menu = within(screen.getByRole('menu'))
    expect(menu.getByText('Instagram')).toBeTruthy()
    expect(menu.queryByText('GitHub')).toBeNull()
    expect(menu.queryByText('E-posta')).toBeNull()
  })

  it('arama buyuk harfle de calisir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    fireEvent.change(screen.getByPlaceholderText('Ara...'), {
      target: { value: 'INSTAGRAM' },
    })
    expect(within(screen.getByRole('menu')).getByText('Instagram')).toBeTruthy()
  })

  it('sonuc yoksa "Sonuç bulunamadı" gosterir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    fireEvent.change(screen.getByPlaceholderText('Ara...'), {
      target: { value: 'zzzz' },
    })
    expect(
      within(screen.getByRole('menu')).getByText('Sonuç bulunamadı'),
    ).toBeTruthy()
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

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('tarik@ornek.com'),
    )
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

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('+90 551 895 72 15'),
    )
  })

  it('sosyal kanalda TAM adres kopyalanir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    render(<ContactQuickMenu content={CONTENT} />)
    open()

    fireEvent.click(screen.getByRole('button', { name: 'Instagram — Kopyala' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'https://www.instagram.com/tarikeler_tarnak/',
      ),
    )
  })

  it('kopyalama basarisizsa kullaniciyi UYARIR (sessiz basari yok)', async () => {
    setClipboard({
      writeText: vi.fn().mockRejectedValue(new Error('izin yok')),
    })
    // fallback de basarisiz olsun
    Object.defineProperty(document, 'execCommand', {
      value: undefined,
      configurable: true,
    })

    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const button = screen.getByRole('button', { name: 'E-posta — Kopyala' })
    fireEvent.click(button)

    await waitFor(() =>
      expect(screen.getByText(/Panoya kopyalanamadı/)).toBeTruthy(),
    )
    // Basari geri bildirimi GOSTERILMEMELI
    expect(button.getAttribute('title')).toBe('Kopyala')
    expect(button.className).not.toContain('text-success')

    Reflect.deleteProperty(
      document as unknown as Record<string, unknown>,
      'execCommand',
    )
  })

  // ------------------------------------------------------------- BOS / KAPATMA

  it('iletisim bilgisi yoksa bilgilendirir', () => {
    render(<ContactQuickMenu content={EMPTY_CONTENT} />)
    open()
    expect(
      within(screen.getByRole('menu')).getByText(
        'Kayıtlı iletişim bilgisi yok.',
      ),
    ).toBeTruthy()
  })

  it('escape ile kapanir', () => {
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

  // ------------------------------------------------------- KONUM
  //
  // 2026-10-06 (kullanıcı): "butonun hemen altında çok az boşlukla
  // açılsın; altına açılamazsa üste, sağa, sola; garanti görünsün, yani
  // içi ve butonun üstüne gelmesin."
  //
  // ESKİ KURAL: "her zaman aşağı (`top-full`), asla yukarı". Kullanıcı
  // bunu DEĞİŞTİRDİ — alt→üst→sağ→sol sırası yeni kuraldır. Artık
  // konum sınıfla değil, `usePopoverPosition`'ın hesapladığı inline
  // `style` (position:fixed) ile uygulanır; portaldan dolayı panel
  // `body` altındadır, tetikleyicinin `relative` kapsayıcısında değil.

  it('panel tetikleyicinin ALTINDA, 6px boslukla konumlanir', () => {
    stubRect(60, 100)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const menu = screen.getByRole('menu')
    const style = menu.getAttribute('style') ?? ''
    expect(style).toContain('position: fixed')
    // tetikleyici alt kenarı 100 + gap 6 = 106
    expect(style).toContain('top: 106px')
    expect(style).not.toContain('visibility: hidden')
  })

  it('panel portal ile body altina tasinir (tetikleyicinin icinde degil)', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    expect(screen.getByRole('menu').parentElement).toBe(document.body)
  })

  /*
    Ölçüm stub'ı — TETİKLEYİCİ ve PANEL ayrı boyutlarda.

    Önceki tek mockReturnValue her element için AYNI rect'i döndürüyordu,
    yani panel de 320x40 ölçülüyordu; testler 415px'lik gerçek paneli
    varsayınca hesap tutmuyordu (top: 706px çıkıyordu, 239px bekleniyordu).
    Şimdi BUTTON = tetikleyici, diğerleri = 256x415 panel.
  */
  function stubRect(top: number, bottom: number) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        const isTrigger = this.tagName === 'BUTTON'
        return {
          top: isTrigger ? top : 0,
          bottom: isTrigger ? bottom : 415,
          left: isTrigger ? 100 : 0,
          right: isTrigger ? 260 : 256,
          width: isTrigger ? 160 : 256,
          height: isTrigger ? bottom - top : 415,
          x: isTrigger ? 100 : 0,
          y: isTrigger ? top : 0,
          toJSON: () => ({}),
        } as DOMRect
      },
    )
  }

  it('altta yer YOKSA ustune gecer (yeni kural: alt -> ust -> sag -> sol)', () => {
    // jsdom viewport 768; tetikleyici ekranin altina yakin (alt kenar 700)
    // -> altta 768-700-6-8 = 54px kaldi, panel 415px -> sigmaz
    // -> ustune gecmeli; panelin ust kenari tetikleyicinin 6px USTUNDE
    stubRect(660, 700)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const style = screen.getByRole('menu').getAttribute('style') ?? ''
    // tetikleyici ust kenari 660 - gap 6 - panel 415 = 239
    expect(style).toContain('top: 239px')
  })

  it('hicbir dikey yon sigmazsa yana duser ve gorunur kalir', () => {
    // tetikleyici tam orta: ust ~330px, alt ~330px; panel 415px
    // sag: jsdom innerWidth 1024, tetikleyici sag kenar 260 -> 750px yer var
    stubRect(344, 384)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const style = screen.getByRole('menu').getAttribute('style') ?? ''
    expect(style).not.toContain('visibility: hidden')
    // saga: tetikleyici sag kenari 260 + gap 6 = 266
    // sag: tetikleyici sag kenari 260 + gap 6 = 266
    expect(style).toContain('left: 266px')
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
  // 2026-10-06: maxHeight artik LISTEDE degil PANELDE (portalStyle).
  // Eski 'measureHeight()' + PANEL_CHROME(80) tahmini silindi; yukseklik
  // panelin kendi olcumunden geliyor. Liste kendi maxHeight'ini tasimaz.
  it('maxHeight PANELDE uygulanir, listede degil (tek kaynak)', () => {
    stubRect(60, 100)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const menu = screen.getByRole('menu')
    expect(menu.getAttribute('style')).toMatch(/max-height: \d+px/)
    const list = menu.querySelector<HTMLElement>('[class*="overflow-y-auto"]')
    expect(list?.style.maxHeight).toBe('')
  })

  it('altta cok yer varsa panel ekrana sigacak kadar buyur', () => {
    stubRect(60, 100)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const style = screen.getByRole('menu').getAttribute('style') ?? ''
    const m = style.match(/max-height: (\d+)px/)
    expect(m).not.toBeNull()
    // 768 - 2*8 (padding) = 752 tavan; asla ekrani asamaz
    expect(Number(m?.[1])).toBeLessThanOrEqual(752)
  })

  it('panel TOPLAM yuksekligi ekrani asmaz (arama kutusu dahil)', () => {
    // Regresyon: yukseklik yalnizca listeye uygulaniyordu, arama kutusu
    // hesaba katilmiyordu -> panel ekranin altindan tasiyordu.
    // Artik maxHeight PANELDE oldugu icin arama kutusu otomatik sayilir.
    stubRect(60, 100)
    render(<ContactQuickMenu content={CONTENT} />)
    open()
    const style = screen.getByRole('menu').getAttribute('style') ?? ''
    const h = Number(style.match(/max-height: (\d+)px/)?.[1] ?? '0')
    expect(100 + h).toBeLessThanOrEqual(768)
  })

  // ------------------------------------------------------- KLAVYE GEZINMESI
  it('arrowDown aktif satiri ilerletir', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const rows = () => [
      ...screen
        .getByRole('menu')
        .querySelectorAll<HTMLElement>('li[data-index]'),
    ]
    const activeIdx = () =>
      rows().findIndex(r => r.className.includes('bg-foreground-200/15'))

    expect(activeIdx()).toBe(0)

    fireEvent.keyDown(screen.getByLabelText('Ara...'), { key: 'ArrowDown' })
    expect(activeIdx()).toBe(1)
  })

  it('arrowUp son satirdan ilk satira doner (basa sarmali)', () => {
    render(<ContactQuickMenu content={CONTENT} />)
    open()

    const rows = () => [
      ...screen
        .getByRole('menu')
        .querySelectorAll<HTMLElement>('li[data-index]'),
    ]
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

/* ----------------------------------------------------------------- Discord
 * 2026-10-10 — Discord "Kişisel Bilgiler"den "İletişim Bilgileri"ne taşındı
 * ve `label`/`value` override'ıyla "Discord Grubu: Tarnak" gösteriliyor.
 */
const DISCORD_CONTENT = {
  contact: {},
  social: [
    {
      name: 'Tarnak',
      href: 'https://discord.gg/s5B53SgMM',
      icon: 'mdi:discord',
      label: 'Discord Grubu',
      value: 'Tarnak',
    },
  ],
} as unknown as SiteContent

describe('contactQuickMenu — discord kanalı', () => {
  const open = () => {
    render(<ContactQuickMenu content={DISCORD_CONTENT} />)
    fireEvent.click(screen.getByRole('button', { name: /İletişim Bilgileri/ }))
  }

  it('etiket "Discord Grubu", değer "Tarnak" olarak gösterilir', () => {
    open()
    const menu = within(screen.getByRole('menu'))
    expect(menu.getByText('Discord Grubu')).toBeTruthy()
    expect(menu.getByText('Tarnak')).toBeTruthy()
  })

  it('satır sosyal grup altında, tiklandığında davet bağlantısına gider', () => {
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null)
    open()
    const link = within(screen.getByRole('menu'))
      .getByText('Tarnak')
      .closest('a')!
    expect(link.getAttribute('href')).toBe('https://discord.gg/s5B53SgMM')
    fireEvent.click(link)
    expect(spy).toHaveBeenCalledWith(
      'https://discord.gg/s5B53SgMM',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
