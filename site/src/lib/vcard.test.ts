import { describe, expect, it } from 'vitest'
import { buildVCard, vcardFilename } from '@/lib/vcard'

/**
 * vCard 3.0 üretimi (dijital kartvizit).
 *
 * Buradaki testler özellikle KAÇIŞ kurallarını ölçer: virgül, noktalı
 * virgül, ters eğik çizgi ve satır sonu vCard'da özel anlam taşır ve
 * kaçırılmazsa kart görüntüleyicide bozuk parçalara ayrılır.
 */
describe('buildVCard', () => {
  const TAM = {
    firstName: 'TARIK',
    lastName: 'ELER',
    displayName: 'Tarik Eler',
    nickname: 'Tarnak',
    title: 'Yazılımcı',
    organization: 'TARIKELER',
    email: 'ornek@site.com',
    phone: '+90 555 000 00 00',
    url: 'https://site.com',
    social: 'https://github.com/kullanici',
  }

  it('gecerli bir vCard 3.0 belgesi uretir', () => {
    const v = buildVCard(TAM)
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0')).toBe(true)
    expect(v.endsWith('END:VCARD')).toBe(true)
  })

  it('satir sonu CRLF (RFC 6350 zorunlu)', () => {
    const v = buildVCard(TAM)
    expect(v).toContain('\r\n')
    // Sadece CRLF olmalı: tek başına LF bulunmamalı.
    expect(v.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('fN (goruntulenen ad) alani var', () => {
    expect(buildVCard(TAM)).toContain('FN:TARIK ELER')
  })

  it('n (yapilandirilmis ad) soyad;ad sirasiyla', () => {
    expect(buildVCard(TAM)).toContain('N:ELER;TARIK;;;')
  })

  it('isim varsa displayName olmasa da N uretilir (regresyon)', () => {
    // `N:` displayName'e bagliydi; ad/soyad doluysa her zaman uretilmeli.
    const v = buildVCard({ firstName: 'TARIK', lastName: 'ELER' })
    expect(v).toContain('FN:TARIK ELER')
    expect(v, 'N alani isimlerden uretilmeli').toContain('N:ELER;TARIK;;;')
  })

  it('displayName varsa ama isim yoksa bos N uretmez', () => {
    // Bos `N:;;;;` gecersizdir — uretilmemeli.
    const v = buildVCard({ displayName: 'Sadece Goruntulenen Ad' })
    expect(v).toContain('FN:Sadece Goruntulenen Ad')
    expect(v.startsWith('N:'), 'bos N uretilmemeli').toBe(false)
  })

  it('virgul ve noktali virgul kacirilir', () => {
    const v = buildVCard({ ...TAM, organization: 'ACME, Inc.; TR' })
    expect(v).toContain('ORG:ACME\\, Inc.\\; TR')
  })

  it('ters egik cizgi ve satir sonu kacirilir', () => {
    const v = buildVCard({ ...TAM, note: 'satir1\nsatir2 \\ son' })
    expect(v).toContain('NOTE:satir1\\nsatir2 \\\\ son')
  })

  it('kacis siralamasi dogru (once ters egik)', () => {
    // Ters eger \\ yazilirsa, sonraki kacislar bozulur.
    const v = buildVCard({ ...TAM, note: 'a\\,b' })
    expect(v).toContain('NOTE:a\\\\\\,b')
  })

  it('iletisim alanlari tip etiketiyle gelir', () => {
    const v = buildVCard(TAM)
    expect(v).toContain('EMAIL;TYPE=INTERNET:ornek@site.com')
    expect(v).toContain('TEL;TYPE=CELL:+90 555 000 00 00')
    expect(v).toContain('URL:https://site.com')
    expect(v).toContain('X-SOCIALPROFILE:https://github.com/kullanici')
  })

  it('bos alanlar hic uretilmez', () => {
    const v = buildVCard({ firstName: 'TARIK' })
    expect(v).not.toContain('EMAIL')
    expect(v).not.toContain('TEL')
    expect(v).not.toContain('URL:')
    expect(v).not.toContain('NOTE')
  })

  it('tamamen bos veri bile gecerli bir kabuk uretir', () => {
    const v = buildVCard({})
    expect(v).toBe('BEGIN:VCARD\r\nVERSION:3.0\r\nEND:VCARD')
  })
})

describe('vcardFilename', () => {
  it('bosluklari alt cizgiye cevirir', () => {
    expect(vcardFilename('Tarik Eler')).toBe('tarik_eler.vcf')
  })

  it('guvenli karakter disinda her seyi temizler', () => {
    expect(vcardFilename('../../etc/passwd')).toBe('etc_passwd.vcf')
    expect(vcardFilename('a/b\\c:d*e?f"g<h>i|j')).toBe(
      'a_b_c_d_e_f_g_h_i_j.vcf',
    )
  })

  it('turkce karakterler ASCII guvenli ada indirgenir', () => {
    // Sözleşme: dosya adı ASCII'ye indirgenir (dosya sistemi/header
    // uyumluluğu). Türkçe harf KAYBOLUR — kasıtlı, kod yorumunda da yazılı.
    expect(vcardFilename('Şükrü Çağlar')).toBe('kr_a_lar.vcf')
  })

  it('bol girdi guvenli ad dondurur', () => {
    expect(vcardFilename('')).toBe('kisi.vcf')
    expect(vcardFilename('!!!')).toBe('kisi.vcf')
  })
})
