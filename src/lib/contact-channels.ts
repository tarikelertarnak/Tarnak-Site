/**
 * Iletisim kanallari — saf veri uretimi (arayuzden bagimsiz, test edilebilir).
 *
 * Amac: e-posta / telefon / konum / sosyal medya gibi TUM iletisim
 * yollarini tek bir listede toplamak. Arayuz bu listeden beslenir; yeni bir
 * kanal tipi eklemek icin buraya bir blok eklemek yeterli.
 *
 * `t` fonksiyonu DISARIDAN verilir: bu dosya i18n bilmez, boylece test
 * edilebilir kalir (testte `t = key => key` gecilebilir).
 */

export type ChannelKind = 'email' | 'phone' | 'location' | 'social'

export interface ContactChannel {
  /** Kararli kimlik (React `key`) */
  id: string
  kind: ChannelKind
  /** Gorunen ad — or. "E-posta", "Instagram" */
  label: string
  /** Gorunen deger — or. "tarik@ornek.com" */
  value: string
  /** Tiklayinca acilacak adres (mailto:/tel:/https:) */
  href?: string
  /** Kopyalanacak metin. Bos/undefined ise kopyala butonu CIZILMEZ. */
  copyValue?: string
  /** Sosyal kanallarda mdi ikon adi; yerlesik kanallarda 'email'|'phone'|'location' */
  icon: string
  /** Aramada etiket/deger disinda eslesecek ek kelimeler */
  keywords: string[]
}

/** Ihtiyac duyulan icerik parcasi (SiteContent'un tamami gerekmez). */
export interface ContactSource {
  contact: {
    email?: string
    phone?: string
    location?: string
    locationYandex?: string
  }
  social?: { name: string, href: string, icon: string }[]
}

/**
 * Turkce'ye duyarli arama normalizasyonu.
 *
 * Neden: JS'te `'İ'.toLowerCase()` tek `i` DEGIL, `i` + U+0307 (birlesik
 * nokta) uretir. Kullanici "iletisim" yazinca "İletişim" bulunmazdi.
 * NFD ile ayirip birlesik isaretleri silmek `ş/ğ/ü/ö/ç/ı/İ` hepsini cozer.
 */
export function foldForSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .trim()
}

/** `tel:` icin bosluk/tire/parantez temizligi. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[\s\-()]/g, '')}`
}

export function buildContactChannels(
  content: ContactSource,
  t: (key: string) => string,
): ContactChannel[] {
  const channels: ContactChannel[] = []
  const email = content.contact.email?.trim()
  const phone = content.contact.phone?.trim()

  if (email) {
    channels.push({
      id: 'email',
      kind: 'email',
      label: t('contact.cardEmail'),
      value: email,
      href: `mailto:${email}`,
      copyValue: email,
      icon: 'email',
      keywords: ['mail', 'e-posta', 'eposta', 'email', 'gmail'],
    })
  }

  if (phone) {
    channels.push({
      id: 'phone',
      kind: 'phone',
      label: t('contact.cardPhone'),
      value: phone,
      href: telHref(phone),
      copyValue: phone,
      icon: 'phone',
      keywords: ['tel', 'telefon', 'phone', 'ara', 'call'],
    })
  }

  // Konum iki harita saglayicisi olarak ayri kanallar (biri Google, biri Yandex).
  if (content.contact.location?.trim()) {
    channels.push({
      id: 'location-google',
      kind: 'location',
      label: t('contact.mapsGoogle'),
      value: t('contact.cardLocation'),
      href: content.contact.location.trim(),
      copyValue: content.contact.location.trim(),
      icon: 'location',
      keywords: ['konum', 'harita', 'adres', 'location', 'map', 'google', 'nerede'],
    })
  }

  if (content.contact.locationYandex?.trim()) {
    channels.push({
      id: 'location-yandex',
      kind: 'location',
      label: t('contact.mapsYandex'),
      value: t('contact.cardLocation'),
      href: content.contact.locationYandex.trim(),
      copyValue: content.contact.locationYandex.trim(),
      icon: 'location',
      keywords: ['konum', 'harita', 'adres', 'location', 'map', 'yandex', 'nerede'],
    })
  }

  for (const item of content.social ?? []) {
    if (!item?.href) {
      continue
    }
    channels.push({
      id: `social-${item.name.toLowerCase()}`,
      kind: 'social',
      label: item.name,
      value: item.href.replace(/^https?:\/\/(www\.)?/, ''),
      href: item.href,
      copyValue: item.href,
      icon: item.icon || 'mdi:link',
      keywords: ['sosyal', 'social', 'profil', 'profile', item.name.toLowerCase()],
    })
  }

  return channels
}

/** Kanallari arama terimine gore suzer (etiket + deger + anahtar kelime). */
export function filterChannels(
  channels: readonly ContactChannel[],
  query: string,
): ContactChannel[] {
  const needle = foldForSearch(query)
  if (!needle) {
    return [...channels]
  }
  return channels.filter((c) => {
    const haystack = [c.label, c.value, ...c.keywords].map(foldForSearch).join(' ')
    return haystack.includes(needle)
  })
}

/** Kanallari gruplayarak sirala: once yerlesik kanallar, sonra sosyal. */
export function groupChannels(channels: readonly ContactChannel[]): {
  builtin: ContactChannel[]
  social: ContactChannel[]
} {
  return {
    builtin: channels.filter(c => c.kind !== 'social'),
    social: channels.filter(c => c.kind === 'social'),
  }
}
