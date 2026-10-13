/**
 * vCard 3.0 üretimi (dijital kartvizit)
 *
 * Neden elle yazıyoruz: hazır `vcard` paketi yok, elle yazmak 30 satır.
 *
 * vCard 3.0 seçildi (4.0 değil): iOS/Android/Outlook/Thunderbird
 * hepsini destekler; 4.0'ü yalnızca yeni uygulamalar okuyor.
 *
 * Kaçış kuralları (RFC 6350 §3.4): virgül, noktalı virgül, satır sonu
 * ve `\` özel anlam taşır → ters eğik çizgiyle kaçırılır. Adres alanında
 * ayrıca virgül → `\;` yapılır.
 */

export interface VCardData {
  firstName?: string
  lastName?: string
  displayName?: string
  /** Takma ad / marka — NICKNAME olarak */
  nickname?: string
  title?: string
  organization?: string
  email?: string
  phone?: string
  url?: string
  /** Discord gibi profil bağlantısı */
  social?: string
  address?: string
  note?: string
}

/** Bir alanı vCard kaçışıyla hazırlar. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/**
 * vCard metnini üretir.
 * `BEGIN:VCARD` … `END:VCARD` — RFC 6350 gereği CRLF satır sonu şart.
 */
export function buildVCard(data: VCardData): string {
  const satirlar: string[] = ['BEGIN:VCARD', 'VERSION:3.0']

  const ad = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
  // FN = görüntülenen ad. Ad/soyad yoksa `displayName`'e düşer; ikisi de
  // yoksa alan hiç üretilmez (boş FN, kart görüntüleyicide satır adı yapar).
  const goruntulenen = ad || data.displayName || ''
  if (goruntulenen) {
    satirlar.push(`FN:${esc(goruntulenen)}`)
  }
  // N = yapılandırılmış ad (soyad;ad). Yalnızca gerçek bir ad/soyad
  // varsa üretilir: boş `N:;;;;` geçersizdir. (Önceden `displayName`'e
  // bağlıydı — ad/soyad dolu ama displayName boşken N kayboluyordu.)
  if (data.firstName || data.lastName) {
    satirlar.push(
      `N:${esc(data.lastName ?? '')};${esc(data.firstName ?? '')};;;`,
    )
  }
  if (data.nickname)
satirlar.push(`NICKNAME:${esc(data.nickname)}`)
  if (data.title)
satirlar.push(`TITLE:${esc(data.title)}`)
  if (data.organization)
satirlar.push(`ORG:${esc(data.organization)}`)
  if (data.email)
satirlar.push(`EMAIL;TYPE=INTERNET:${esc(data.email)}`)
  if (data.phone)
satirlar.push(`TEL;TYPE=CELL:${esc(data.phone)}`)
  if (data.url)
satirlar.push(`URL:${esc(data.url)}`)
  // Sosyal profiller için standart alan yok; X- ile özel alan kullanılır.
  if (data.social)
satirlar.push(`X-SOCIALPROFILE:${esc(data.social)}`)
  if (data.address)
satirlar.push(`ADR;TYPE=WORK:;;${esc(data.address)};;;;`)
  if (data.note)
satirlar.push(`NOTE:${esc(data.note)}`)

  satirlar.push('END:VCARD')
  return satirlar.join('\r\n')
}

/** Dosya adı — boşlukları alt çizgiye çevirir. */
export function vcardFilename(displayName: string): string {
  const temiz = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${temiz || 'kisi'}.vcf`
}
