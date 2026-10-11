import { describe, expect, it } from 'vitest'
import {
  peerRank,
  PRESENCE_ACTIVE_MS,
  PRESENCE_ONLINE_MS,
  presenceOf,
  sortPeers,
} from './chat-peers'

/**
 * Çevrimiçi/kırmızı/sarı nokta + kişi listesi hiyerarşisi (2026-10-11
 * kullanıcı isteği). SAF fonksiyonlar — Supabase importu YOKTUR (istemcide de
 * çalışır).
 */

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0)

describe('presenceOf (nokta rengi)', () => {
  it('nabız yoksa veya geçersizse KIRMIZI (çevrimdışı)', () => {
    expect(presenceOf(null, null, NOW)).toBe('offline')
    expect(presenceOf(undefined, null, NOW)).toBe('offline')
    expect(presenceOf('geçersiz-tarih', null, NOW)).toBe('offline')
  })

  it('ileri tarihli damga (saat kayması) KIRMIZI sayılır — yanlış \"çevrimiçi\" göstermekten kötü', () => {
    const future = new Date(NOW + PRESENCE_ONLINE_MS * 2).toISOString()
    expect(presenceOf(future, null, NOW)).toBe('offline')
  })

  it('taze nabız + durum yok → YEŞİL (çevrimiçi)', () => {
    const fresh = new Date(NOW - 10_000).toISOString()
    expect(presenceOf(fresh, null, NOW)).toBe('online')
  })

  it('taze nabız + durum → SARİ (aktif: bana bir şey gönderecek)', () => {
    const fresh = new Date(NOW - 5_000).toISOString()
    expect(presenceOf(fresh, 'typing', NOW)).toBe('active')
    expect(presenceOf(fresh, 'uploading', NOW)).toBe('active')
    expect(presenceOf(fresh, 'recording', NOW)).toBe('active')
  })

  it('eskiyen durum sarı kalmaz: nabız taze ama `PRESENCE_ACTIVE_MS` geçmişse YEŞİL', () => {
    const seen = new Date(NOW - PRESENCE_ACTIVE_MS - 1_000).toISOString()
    expect(presenceOf(seen, 'typing', NOW)).toBe('online')
  })

  it('nabız `PRESENCE_ONLINE_MS`den eskiyse KIRMIZI (durum olsa bile)', () => {
    const old = new Date(NOW - PRESENCE_ONLINE_MS - 1_000).toISOString()
    expect(presenceOf(old, 'typing', NOW)).toBe('offline')
    expect(presenceOf(old, null, NOW)).toBe('offline')
  })

  it('tam eşikler yeşil taraftadır (sınırda nabız kaybı yok)', () => {
    const atLimit = new Date(NOW - PRESENCE_ONLINE_MS).toISOString()
    expect(presenceOf(atLimit, null, NOW)).toBe('online')
  })
})

function row(partial: Partial<Parameters<typeof peerRank>[0]>) {
  return {
    name: 'X',
    blocked: false,
    pinned: false,
    favorite: false,
    presence: 'offline' as const,
    lastMessageAt: null,
    ...partial,
  }
}

describe('peerRank (hiyerarşi kovası)', () => {
  it('sabitleme en üstte, engellenen en altta', () => {
    expect(peerRank(row({ pinned: true }))).toBe(0)
    expect(peerRank(row({ blocked: true }))).toBe(6)
  })

  it('sarı (aktif) konuşmanın üstünde — şu an aksiyon bekleyen tek durum', () => {
    expect(peerRank(row({ presence: 'active' }))).toBe(1)
    expect(peerRank(row({ lastMessageAt: '2026-10-11T00:00:00Z' }))).toBe(2)
  })

  it('favori > çevrimiçi > diğerleri', () => {
    expect(peerRank(row({ favorite: true }))).toBe(3)
    expect(peerRank(row({ presence: 'online' }))).toBe(4)
    expect(peerRank(row({}))).toBe(5)
  })
})

describe('sortPeers (liste sırası)', () => {
  it('pinlenen → sarı → konuşulanlar → favoriler → çevrimiçiler → diğer → engellenen', () => {
    const list = [
      row({ name: 'Diğer' }),
      row({ name: 'Engelli', blocked: true }),
      row({ name: 'Konuşma2', lastMessageAt: '2026-10-10T00:00:00Z' }),
      row({ name: 'Favori', favorite: true }),
      row({ name: 'Sabit', pinned: true }),
      row({ name: 'Sarı', presence: 'active' }),
      row({ name: 'Online', presence: 'online' }),
      row({ name: 'Konuşma1', lastMessageAt: '2026-10-11T00:00:00Z' }),
    ]
    expect(sortPeers(list).map(p => p.name)).toEqual([
      'Sabit', 'Sarı', 'Konuşma1', 'Konuşma2', 'Favori', 'Online', 'Diğer', 'Engelli',
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
