import { describe, expect, it } from 'vitest'
import {
  isTyping,
  peerRank,
  PRESENCE_ONLINE_MS,
  PRESENCE_UI,
  presenceOf,
  sortPeers,
  TYPING_TTL_MS,
  typingLabel,
} from './chat-peers'

/**
 * Çevrimiçi/çevrimdışı nokta, "yazıyor" METNİ ve kişi listesi hiyerarşisi.
 * 2026-10-12: sarı nokta kaldırıldı — "yazıyor" artık nokta değil, mavi metin.
 * SAF fonksiyonlar (Supabase importu YOK).
 */

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0)

describe('presenceOf (nokta rengi)', () => {
  it('nabız yoksa veya geçersizse KIRMIZI (çevrimdışı)', () => {
    expect(presenceOf(null, NOW)).toBe('offline')
    expect(presenceOf(undefined, NOW)).toBe('offline')
    expect(presenceOf('geçersiz-tarih', NOW)).toBe('offline')
  })

  it('ileri tarihli damga (saat kayması) KIRMIZI sayılır — yanlış "çevrimiçi" göstermekten kötü', () => {
    const future = new Date(NOW + PRESENCE_ONLINE_MS * 2).toISOString()
    expect(presenceOf(future, NOW)).toBe('offline')
  })

  it('taze nabız → YEŞİL (çevrimiçi)', () => {
    const fresh = new Date(NOW - 10_000).toISOString()
    expect(presenceOf(fresh, NOW)).toBe('online')
  })

  it('nabız `PRESENCE_ONLINE_MS`den eskiyse KIRMIZI', () => {
    const old = new Date(NOW - PRESENCE_ONLINE_MS - 1_000).toISOString()
    expect(presenceOf(old, NOW)).toBe('offline')
  })

  it('tam eşikler yeşil taraftadır (sınırda nabız kaybı yok)', () => {
    const atLimit = new Date(NOW - PRESENCE_ONLINE_MS).toISOString()
    expect(presenceOf(atLimit, NOW)).toBe('online')
  })

  it('nokta artık SARI OLMAZ: durum ne olursa olsun yalnız yeşil/kırmızı', () => {
    const fresh = new Date(NOW - 1_000).toISOString()
    expect(presenceOf(fresh, NOW)).toBe('online')
    expect(presenceOf(fresh, NOW)).not.toBe('active')
  })
})

describe('isTyping ("@kullanıcı yazıyor…" metni)', () => {
  it('durum `typing` ve sinyal TTL içindeyse true', () => {
    const fresh = new Date(NOW - 1_000).toISOString()
    expect(isTyping(fresh, 'typing', NOW)).toBe(true)
    // tam TTL sınırı da taze sayılır
    expect(isTyping(new Date(NOW - TYPING_TTL_MS).toISOString(), 'typing', NOW)).toBe(true)
  })

  it('sinyal TTL dolunca metin söner (eski "yazıyor" sonsuz kalmaz)', () => {
    const old = new Date(NOW - TYPING_TTL_MS - 1).toISOString()
    expect(isTyping(old, 'typing', NOW)).toBe(false)
  })

  it('durum `typing` değilse (uploading/recording/null/çöp) metin çıkmaz', () => {
    const fresh = new Date(NOW - 1_000).toISOString()
    expect(isTyping(fresh, 'uploading', NOW)).toBe(false)
    expect(isTyping(fresh, 'recording', NOW)).toBe(false)
    expect(isTyping(fresh, null, NOW)).toBe(false)
    expect(isTyping(fresh, 'SALDIRGAN', NOW)).toBe(false)
  })

  it('nabız yoksa/geçersizse veya ileri tarihliyse metin çıkmaz', () => {
    expect(isTyping(null, 'typing', NOW)).toBe(false)
    expect(isTyping('geçersiz', 'typing', NOW)).toBe(false)
    expect(isTyping(new Date(NOW + 60_000).toISOString(), 'typing', NOW)).toBe(false)
  })
})

describe('typingLabel (satır metni)', () => {
  const t = (key: string) => (key === 'chat.typingMany' ? 'Birkaç kişi yazıyor…' : 'yazıyor…')

  it('tek kişi: "@ad yazıyor…"', () => {
    expect(typingLabel(['tarikelertr'], t)).toBe('@tarikelertr yazıyor…')
  })

  it('iki kişi: "@a, @b yazıyor…"', () => {
    expect(typingLabel(['ayse', 'mehmet'], t)).toBe('@ayse, @mehmet yazıyor…')
  })

  it('üç ve üstü: "Birkaç kişi yazıyor…" (adlar sayılmaz)', () => {
    expect(typingLabel(['a', 'b', 'c'], t)).toBe('Birkaç kişi yazıyor…')
    expect(typingLabel(['a', 'b', 'c', 'd'], t)).toBe('Birkaç kişi yazıyor…')
  })

  it('kimse yazmıyorsa null (satır son mesaja döner)', () => {
    expect(typingLabel([], t)).toBeNull()
  })
})

function row(partial: Partial<Parameters<typeof peerRank>[0]>) {
  return {
    name: 'X',
    blocked: false,
    pinned: false,
    favorite: false,
    presence: 'offline' as const,
    typing: false,
    lastMessageAt: null,
    ...partial,
  }
}

describe('peerRank (hiyerarşi kovası)', () => {
  it('sabitleme en üstte, engellenen en altta', () => {
    expect(peerRank(row({ pinned: true }))).toBe(0)
    expect(peerRank(row({ blocked: true }))).toBe(6)
  })

  it('yazan kişi konuşmanın üstünde — şu an aksiyon bekleyen tek durum', () => {
    expect(peerRank(row({ typing: true }))).toBe(1)
    expect(peerRank(row({ lastMessageAt: '2026-10-11T00:00:00Z' }))).toBe(2)
  })

  it('sabitlenen, yazanın da önünde kalır', () => {
    expect(peerRank(row({ pinned: true, typing: true }))).toBe(0)
  })

  it('favori > çevrimiçi > diğerleri', () => {
    expect(peerRank(row({ favorite: true }))).toBe(3)
    expect(peerRank(row({ presence: 'online' }))).toBe(4)
    expect(peerRank(row({}))).toBe(5)
  })
})

describe('sortPeers (liste sırası)', () => {
  it('pinlenen → yazan → konuşulanlar → favoriler → çevrimiçiler → diğer → engellenen', () => {
    const list = [
      row({ name: 'Diğer' }),
      row({ name: 'Engelli', blocked: true }),
      row({ name: 'Konuşma2', lastMessageAt: '2026-10-10T00:00:00Z' }),
      row({ name: 'Favori', favorite: true }),
      row({ name: 'Sabit', pinned: true }),
      row({ name: 'Yazan', typing: true }),
      row({ name: 'Online', presence: 'online' }),
      row({ name: 'Konuşma1', lastMessageAt: '2026-10-11T00:00:00Z' }),
    ]
    expect(sortPeers(list).map(p => p.name)).toEqual([
      'Sabit', 'Yazan', 'Konuşma1', 'Konuşma2', 'Favori', 'Online', 'Diğer', 'Engelli',
    ])
  })

  it('konuşulanlar kendi içinde EN YENİ önce (zaman azalan)', () => {
    const list = [
      row({ name: 'Eski', lastMessageAt: '2026-10-01T00:00:00Z' }),
      row({ name: 'Yeni', lastMessageAt: '2026-10-11T00:00:00Z' }),
      row({ name: 'Orta', lastMessageAt: '2026-10-05T00:00:00Z' }),
    ]
    expect(sortPeers(list).map(p => p.name)).toEqual(['Yeni', 'Orta', 'Eski'])
  })

  it('girdi dizisi DEĞİŞMEZ (yeni dizi döner)', () => {
    const list = [row({ name: 'B' }), row({ name: 'A' })]
    const out = sortPeers(list)
    expect(list.map(p => p.name)).toEqual(['B', 'A'])
    expect(out).not.toBe(list)
  })

  it('çevrimiçiler olmayanların önünde, kendi içinde ad sırası', () => {
    const list = [
      row({ name: 'Zeynep' }),
      row({ name: 'Ayşe', presence: 'online' }),
    ]
    expect(sortPeers(list).map(p => p.name)).toEqual(['Ayşe', 'Zeynep'])
  })
})

describe('nokta stilleri (PRESENCE_UI)', () => {
  it('yalnız yeşil ve kırmıza var — SARI NOKTA TAMAMEN KALDIRILDI', () => {
    expect(Object.keys(PRESENCE_UI).sort()).toEqual(['offline', 'online'])
    const classes = Object.values(PRESENCE_UI).map(u => u.dot).join(' ')
    expect(classes).not.toMatch(/amber|yellow/)
  })
})
