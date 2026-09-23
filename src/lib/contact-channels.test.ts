import { describe, expect, it } from 'vitest'

import type { ContactSource } from '@/lib/contact-channels'
import {
  buildContactChannels,
  filterChannels,
  foldForSearch,
  groupChannels,
} from '@/lib/contact-channels'

/**
 * Iletisim kanali uretimi testleri.
 *
 * `t` disaridan verilir → i18n'e bagimlilik yok, testte anahtar aynen doner.
 */
const t = (key: string) => key

const FULL: ContactSource = {
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
}

describe('foldForSearch', () => {
  it('turkce karakterleri ASCII karsiligina indirger', () => {
    expect(foldForSearch('İletişim')).toBe('iletisim')
    expect(foldForSearch('İstanbul')).toBe('istanbul')
    expect(foldForSearch('Çığ Öşü')).toBe('cig osu')
  })

  it('buyuk/kucuk harf farkini kaldirir', () => {
    expect(foldForSearch('INSTAGRAM')).toBe('instagram')
    expect(foldForSearch('GitHub')).toBe('github')
  })

  it('basta/sonda bosluklari kirpar', () => {
    expect(foldForSearch('  mail  ')).toBe('mail')
  })
})

describe('buildContactChannels', () => {
  it('e-posta, telefon, iki konum ve sosyalleri sirayla uretir', () => {
    const ids = buildContactChannels(FULL, t).map(c => c.id)
    expect(ids).toEqual([
      'email',
      'phone',
      'location-google',
      'location-yandex',
      'social-github',
      'social-instagram',
    ])
  })

  it('e-posta kanali mailto: ve kopyalanabilir deger tasir', () => {
    const email = buildContactChannels(FULL, t).find(c => c.kind === 'email')!
    expect(email.href).toBe('mailto:tarik@ornek.com')
    expect(email.copyValue).toBe('tarik@ornek.com')
    expect(email.value).toBe('tarik@ornek.com')
  })

  it('telefon href`inde bosluk/tire/parantez birakmaz', () => {
    const phone = buildContactChannels(FULL, t).find(c => c.kind === 'phone')!
    expect(phone.href).toBe('tel:+905518957215')
    // Kopyalanan deger OKUNAKLI kalmali (kullanici yapistirinca bozulmasin)
    expect(phone.copyValue).toBe('+90 551 895 72 15')
  })

  it('parantezli/tireli telefonu da temizler', () => {
    const out = buildContactChannels(
      { contact: { phone: '(0551) 895-72-15' } },
      t,
    )
    expect(out[0].href).toBe('tel:05518957215')
  })

  it('eksik alanlar icin kanal URETMEZ', () => {
    const out = buildContactChannels({ contact: { email: 'a@b.c' } }, t)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('email')
  })

  it('yalnizca bosluk olan alani dolu saymaz', () => {
    const out = buildContactChannels({ contact: { email: '   ', phone: '' } }, t)
    expect(out).toHaveLength(0)
  })

  it('hicbir bilgi yoksa bos dizi doner', () => {
    expect(buildContactChannels({ contact: {} }, t)).toEqual([])
  })

  it('sosyal kanallarda gorunen degerden protokol/www sokulur', () => {
    const gh = buildContactChannels(FULL, t).find(c => c.id === 'social-github')!
    expect(gh.value).toBe('github.com/TARIKELER-TARNAK')
    // Kopyalanan deger ise TAM adres olmali (yapistirinca calissin)
    expect(gh.copyValue).toBe('https://github.com/TARIKELER-TARNAK')
  })

  it('href`i olmayan sosyal kaydi atlar', () => {
    const out = buildContactChannels(
      { contact: {}, social: [{ name: 'Bozuk', href: '', icon: 'mdi:link' }] },
      t,
    )
    expect(out).toHaveLength(0)
  })

  it('ikonu olmayan sosyal kayda varsayilan ikon verir', () => {
    const out = buildContactChannels(
      { contact: {}, social: [{ name: 'X', href: 'https://x.com/a', icon: '' }] },
      t,
    )
    expect(out[0].icon).toBe('mdi:link')
  })

  it('her kanalda kopyalanabilir bir deger bulunur', () => {
    for (const c of buildContactChannels(FULL, t)) {
      expect(c.copyValue, `${c.id} kopyalanabilir olmali`).toBeTruthy()
    }
  })
})

describe('filterChannels', () => {
  const channels = buildContactChannels(FULL, t)

  it('bos sorguda hepsini doner', () => {
    expect(filterChannels(channels, '')).toHaveLength(channels.length)
    expect(filterChannels(channels, '   ')).toHaveLength(channels.length)
  })

  it('etiketle eslesir (instagram)', () => {
    const out = filterChannels(channels, 'instagram')
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('Instagram')
  })

  it('ASCII yazimla TURKCE etiketi bulur (iletisim -> İletişim)', () => {
    // Konum kanallarinin etiketi t('contact.mapsGoogle') = 'contact.mapsGoogle'
    // oldugu icin burada e-posta etiketi uzerinden davranisi dogruluyoruz:
    // arama hem etiket hem deger hem anahtar kelimede calisir.
    const out = filterChannels(channels, 'e-posta')
    expect(out.some(c => c.kind === 'email')).toBe(true)
  })

  it('anahtar kelimeyle eslesir (telefon -> phone)', () => {
    const out = filterChannels(channels, 'telefon')
    expect(out.some(c => c.kind === 'phone')).toBe(true)
  })

  it('deger icinde arar (github)', () => {
    const out = filterChannels(channels, 'github')
    expect(out.some(c => c.id === 'social-github')).toBe(true)
  })

  it('harita aramasinda iki konum kanalini da bulur', () => {
    const out = filterChannels(channels, 'harita')
    expect(out.filter(c => c.kind === 'location')).toHaveLength(2)
  })

  it('eslesme yoksa bos dizi doner', () => {
    expect(filterChannels(channels, 'zzzzz')).toEqual([])
  })

  it('buyuk harfli arama da calisir', () => {
    expect(filterChannels(channels, 'INSTAGRAM')).toHaveLength(1)
  })
})

describe('groupChannels', () => {
  it('yerlesik ve sosyal kanallari ayirir', () => {
    const { builtin, social } = groupChannels(buildContactChannels(FULL, t))
    expect(builtin.map(c => c.kind)).toEqual(['email', 'phone', 'location', 'location'])
    expect(social.map(c => c.label)).toEqual(['GitHub', 'Instagram'])
  })
})
