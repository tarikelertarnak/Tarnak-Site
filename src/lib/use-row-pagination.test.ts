import { describe, expect, it } from 'vitest'
import { computeNextRows, computeNextVisibleCount, computeVisibleCount } from '@/lib/use-row-pagination'

/*
  2026-10-06 — kullanıcının istediği senaryolar.
  Boş hücre kuralı: son satırda boşluk varsa ve kalan kartlar oraya
  SIĞIYORSA buton çıkmadan hepsi görünmeli.
*/
describe('computeVisibleCount', () => {
  describe('n = 3', () => {
    it('4 kart: 2 satır ister ama toplam 4 → hepsi görünür, buton yok', () => {
      expect(computeVisibleCount(4, 3, 2)).toBe(4)
    })
    it('6 kart: 2×3 = 6 → hepsi görünür, buton yok', () => {
      expect(computeVisibleCount(6, 3, 2)).toBe(6)
    })
    it('7 kart: 6 görünür, 1 gizli', () => {
      expect(computeVisibleCount(7, 3, 2)).toBe(6)
    })
    it('8 kart: 6 görünür, 2 gizli', () => {
      expect(computeVisibleCount(8, 3, 2)).toBe(6)
    })
    it('10 kart: 6 görünür, 4 gizli', () => {
      expect(computeVisibleCount(10, 3, 2)).toBe(6)
    })
    it('20 kart: 6 görünür, 14 gizli', () => {
      expect(computeVisibleCount(20, 3, 2)).toBe(6)
    })
    it('bOŞ HÜCRE: 5 kart, N=3 → 1 satırda 2 boş hücre var, 2 kart sığıyor → hepsi görünür', () => {
      // 2 satır ister = 6, ama total 5 → görünen 5, son satırda 1 boş hücre
      expect(computeVisibleCount(5, 3, 2)).toBe(5)
    })
    it('bOŞ HÜCRE: 2 satır = 5 kart, N=4, kalan 2 boş hücreye sığıyor → buton yok', () => {
      // 2 satır ister = 8, total 5 → görünen 5, son satırda 3 boş hücre
      expect(computeVisibleCount(5, 4, 2)).toBe(5)
    })
  })

  describe('n = 2', () => {
    it('10 kart: 2×2 = 4 görünür, 6 gizli', () => {
      expect(computeVisibleCount(10, 2, 2)).toBe(4)
    })
    it('4 kart → hepsi görünür', () => {
      expect(computeVisibleCount(4, 2, 2)).toBe(4)
    })
    it('bOŞ HÜCRE kuralı tam satır durumunda tetiklenmez (N=2, 1 satır = 2 kart = dolu satır)', () => {
      // 1 satır × 2 sütun = 2 kart → satır TAM. Boş hücre yok, 3. kart
      // yeni satır gerektirir. (Testi yazarken "1 boş hücre" sanılmıştı;
      // olamaz — tam satır.)
      expect(computeVisibleCount(3, 2, 1)).toBe(2)
    })
  })

  describe('n = 1 (mobil)', () => {
    it('10 kart: 2 satır = 2 görünür', () => {
      expect(computeVisibleCount(10, 1, 2)).toBe(2)
    })
    it('2 kart → hepsi görünür', () => {
      expect(computeVisibleCount(2, 1, 2)).toBe(2)
    })
  })

  it('pencere genişleyince N değişse de düzen bozulmaz (satır sayısı sabit)', () => {
    // Aynı veri, farklı N: görünen kart sayısı N ile orantılı
    const veri = Array.from({ length: 10 }, (_, i) => i)
    expect(veri.slice(0, computeVisibleCount(10, 3, 2))).toHaveLength(6) // 2 satır × 3
    expect(veri.slice(0, computeVisibleCount(10, 2, 2))).toHaveLength(4) // 2 satır × 2
    expect(veri.slice(0, computeVisibleCount(10, 1, 2))).toHaveLength(2) // 2 satır × 1
  })

  it('n ölçülmeden (0) en az 1 sütun sayılır — NaN/0 üretmez', () => {
    expect(computeVisibleCount(10, 0, 2)).toBe(2)
  })

  it('total 0 → 0 döner, buton çıkmaz', () => {
    expect(computeVisibleCount(0, 3, 2)).toBe(0)
  })
})

describe('computeNextRows', () => {
  it('10 kart, N=3, 2 satır → 2 satır daha (en fazla 2)', () => {
    expect(computeNextRows(10, 3, 2)).toBe(2)
  })
  it('7 kart, N=3, 2 satır → 1 kart kaldı, 1 satır yeter', () => {
    expect(computeNextRows(7, 3, 2)).toBe(1)
  })
  it('8 kart, N=3, 2 satır → 2 kart kaldı, 1 satır yeter', () => {
    expect(computeNextRows(8, 3, 2)).toBe(1)
  })
  it('hepsi görünürse 0 döner (buton gizlenir)', () => {
    expect(computeNextRows(6, 3, 2)).toBe(0)
    expect(computeNextRows(4, 2, 2)).toBe(0)
    expect(computeNextRows(2, 1, 2)).toBe(0)
  })
  it('kalan kartlar boş hücrelere sığdıysa 0 döner (toplam zaten 2×N içindeyse)', () => {
    expect(computeNextRows(5, 3, 2)).toBe(0)
    expect(computeNextRows(6, 3, 2)).toBe(0)
  })
  it('20 kart, N=3: her adımda EN FAZLA 2 satır, kalan kadar', () => {
    // 6 görünür → 14 kaldı → 2 satır daha
    expect(computeNextRows(20, 3, 2)).toBe(2)
    expect(computeNextRows(20, 3, 4)).toBe(2)
    // 6 satır = 18 görünür, sadece 2 kaldı → 1 satır yeter
    expect(computeNextRows(20, 3, 6)).toBe(1)
    // 7 satır = 21 ≥ 20 → hepsi bitti
    expect(computeNextRows(20, 3, 7)).toBe(0)
  })
})

describe('computeNextVisibleCount ("+N · −M" rozeti, 2026-10-11 kullanıcı isteği)', () => {
  it('288 kart, N=3, 2 satır: şimdi 6 görünür → +6 açılır, 282 gizli kalır', () => {
    // next = visibleRows+2 = 4 satır = 12 kart → willOpen = 12 − 6 = 6
    expect(computeNextVisibleCount(288, 3, 2)).toBe(12)
  })

  it('açılacak sayı hiçbir zaman kalandan büyük olmaz (kalan kadar)', () => {
    // 8 kart: 6 görünür, 2 kaldı → 1 satır (3) değil, sadece 8 (1 fazla satır açılmaz)
    expect(computeNextVisibleCount(8, 3, 2)).toBe(8)
    // 7 kart: 6 görünür, 1 kaldı
    expect(computeNextVisibleCount(7, 3, 2)).toBe(7)
  })

  it('kalan boş hücrelere sığıyorsa buton yok → toplam DEĞİŞMEZ', () => {
    expect(computeNextVisibleCount(5, 3, 2)).toBe(5)
    expect(computeNextVisibleCount(6, 3, 2)).toBe(6)
  })

  it('total 0 → 0', () => {
    expect(computeNextVisibleCount(0, 3, 2)).toBe(0)
  })
})
