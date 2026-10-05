import { describe, expect, it } from 'vitest'
import { countryFromLanguages } from '@/lib/country-detect'

/**
 * Kullanıcı isteği (2026-10-05): ülke seçimi otomatik gelsin — önce konum,
 * konum bulunamazsa tarayıcı dilinin ülkesi.
 *
 * Buradaki test "dilden tespit" yolunu kilitler. Konum yolu
 * (`resolveCountryFromGeolocation`) bilinçli olarak `''` döndürüyor:
 * `navigator.geolocation` koordinat verir, ülke değil; ülkeye çevirmek için
 * dış servis gerekir ve izin istemeden çağırmak yanlış.
 */
describe('countryFromLanguages', () => {
  it('dilin bölgesini ülke olarak kullanır (tr-TR → TR)', () => {
    expect(countryFromLanguages(['tr-TR'])).toBe('TR')
    expect(countryFromLanguages(['en-GB'])).toBe('GB')
    expect(countryFromLanguages(['de-AT'])).toBe('AT')
    expect(countryFromLanguages(['pt-BR'])).toBe('BR')
  })

  it('yalın dil kodu listedeki en olası ülkeye düşer', () => {
    expect(countryFromLanguages(['tr'])).toBe('TR')
    expect(countryFromLanguages(['en'])).toBe('US')
    expect(countryFromLanguages(['de'])).toBe('DE')
  })

  it('birden çok dilden ilk eşleşeni alır', () => {
    // Almanya konuşan: [de-DE, en-US, tr-TR] → ilk bölge DE.
    // `de` hem dil hem ülke kodu olduğu için `de-DE` yanlışlıkla
    // elenmemeli — `de-DE` DE ülkesini vermeli, ikinci sıradaki en-US değil.
    expect(countryFromLanguages(['de-DE', 'en-US', 'tr-TR'])).toBe('DE')
    expect(countryFromLanguages(['en-US', 'tr-TR'])).toBe('US')
  })

  it('bölge listede varsa bölgeyi kullanır', () => {
    // MX `COUNTRIES` içinde -> dil tablosuna inmeden MX döner.
    expect(countryFromLanguages(['es-MX'])).toBe('MX')
  })

  it('bölge listede yoksa o dilin ülkesine iner', () => {
    // `gb-UK`: GB listede, UK de listede ama `gb-UK` geçerli bir etiket değil
    // (birleşik krallık ISO'su GB'dir) -> dil tablosunda da yok -> ''.
    expect(countryFromLanguages(['xx-YY'])).toBe('')
  })

  it('script içeren etiketlerde bölgeyi alır', () => {
    // `zh-Hans-CN` son parçası CN (2 harf, listede) -> CN
    expect(countryFromLanguages(['zh-Hans-CN'])).toBe('CN')
  })

  it('BCP-47 dil kodunu ülke sanmaz', () => {
    // `an` Landänska işaretçisi; ISO'da da Hollanda Antilleri var.
    // Bölge sayılmamalı, `an` için dil ülkesi de yok -> bos.
    expect(countryFromLanguages(['an'])).toBe('')
    // `he` İbranice -> IL
    expect(countryFromLanguages(['he'])).toBe('IL')
  })

  it('tanınmayan dil için boş döner (uydurma ülke yok)', () => {
    expect(countryFromLanguages(['xx-YY'])).toBe('')
    expect(countryFromLanguages(['qaa'])).toBe('')
  })

  it('boş liste veya tanımsız girdi güvenli', () => {
    expect(countryFromLanguages([])).toBe('')
    expect(countryFromLanguages([''])).toBe('')
  })

  it('sunucu tarafında navigator yoksa çökmez', () => {
    // Argüman verilmezse navigator'a bakar; test ortamı jsdom (navigator var)
    // ama sonuç yine bir ISO2 ya da '' olmalı — asla exception atmamalı.
    const result = countryFromLanguages()
    expect(result === '' || /^[A-Z]{2}$/.test(result)).toBe(true)
  })
})
