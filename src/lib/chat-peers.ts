/**
 * Sohbet kişi listesi — SAF mantık, `sendMessage`/çevrimiçi durumu ve sıralama.
 *
 * 2026-10-11 (kullanıcı isteği):
 *   · "profil fotoğrafın yanına yeşil ve kırmızı yuvarlaklar ekle ... sarı da
 *     ola bilsin. Sarı şu anlama gelir: bana bişey gönderecek — yazıyor
 *     olabilir, dosya yüklüyor olabilir, ses gönderiyor olabilir."
 *   · "hirarşi pinlenen, konuşulanlar (kendi içinde konuştumuz zamana göre),
 *     favoriler, sarı bişey gönderenler, çevrim içiler ... sen mantığa oturt."
 *
 * ⚠️ Bu dosya İSTEMCİDE çalışır: Supabase/service-role importu YOKTUR. Veri
 * katmanı `lib/chat-v2.ts` içindedir ve oraya yalnız sunucu dokunur.
 */

/** Kişinin ŞU AN ne yaptığı (sarı nokta). */
export type PresenceState = 'typing' | 'uploading' | 'recording'

/** Nokta rengi. */
export type Presence = 'online' | 'active' | 'offline'

/**
 * Yeşil sayılma eşiği. İstemci 20 sn'de bir nabız atar; 3 nabız kaçarsa
 * (ağ/sleep) kişi çevrimdışı sayılır.
 */
export const PRESENCE_ONLINE_MS = 60_000

/** Sarı sayılma eşiği — nabız aralığıyla aynı; eskiyen "yazıyor" sarı kalmaz. */
export const PRESENCE_ACTIVE_MS = 20_000

/**
 * Nabız + durumdan nokta rengini hesaplar.
 *
 * Kurallar (kullanıcı isteği):
 *   · sarı  → durum taze (`typing|uploading|recording` ve nabız taze)
 *   · yeşil → nabız taze, durum yok
 *   · kırmızı → nabız eski (çevrimdışı)
 *
 * Geçersiz/ileri tarihli damga ("clock skew", sunucu-istemci farkı) kırmızı
 * sayılır: yanlışlıkla "çevrimiçi" göstermek, "çevrimdışı" göstermekten kötü.
 */
export function presenceOf(
  lastSeenAt: string | null | undefined,
  state: PresenceState | null | undefined,
  now: number = Date.now(),
): Presence {
  if (!lastSeenAt) {
    return 'offline'
  }
  const seen = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(seen)) {
    return 'offline'
  }
  const age = now - seen
  if (age < 0 || age > PRESENCE_ONLINE_MS) {
    return 'offline'
  }
  return state && age <= PRESENCE_ACTIVE_MS ? 'active' : 'online'
}

/** Geçersiz `presence_state` değerleri yok sayılır (dış girdi). */
export function isPresenceState(value: unknown): value is PresenceState {
  return value === 'typing' || value === 'uploading' || value === 'recording'
}

/** Sıralama girdisi — kişi + sohbet işaretleri + çevrimiçi durumu. */
export interface PeerOrderInput {
  /** Görünen ad (takma ad > tam ad > kullanıcı adı) */
  name: string
  /** Admin engelledi → listenin EN ALTINA düşer */
  blocked?: boolean
  /** Sohbet sabitlendi (admin "Sohbeti sabitle" = conversations.important) */
  pinned?: boolean
  favorite?: boolean
  presence: Presence
  /** Sohbetin son hareket zamanı (yoksa hiç konuşulmamış) */
  lastMessageAt?: string | null
}

/**
 * Sıralama kovası.
 *
 * Kullanıcının saydığı sıra: pinlenen → konuşulanlar (zamanla) → favoriler →
 * sarı gönderenler → çevrimiçiler. "Bu nihai sıralama değil, sen mantığa
 * oturt" dedi; **sarıyı konuşmaların ÜSTÜNE aldım**: sarı "şu an bana bir şey
 * yazıyor/gönderiyor" demektir, yani şu anda aksiyon bekleyen tek durum; eski
 * bir sohbetin altında kalırsa hiç fark edilmez. Engellenen en altta kalır.
 */
export function peerRank(peer: PeerOrderInput): number {
  if (peer.blocked) {
    return 6
  }
  if (peer.pinned) {
    return 0
  }
  if (peer.presence === 'active') {
    return 1
  }
  if (peer.lastMessageAt) {
    return 2
  }
  if (peer.favorite) {
    return 3
  }
  if (peer.presence === 'online') {
    return 4
  }
  return 5
}

/**
 * Kişileri hiyerarşiye dizer (yeni dizi döner, girdi değişmez).
 * Kova 1 ve 2'de kendi içinde "en son konuşulan önce" → "konuştumuz zamana göre".
 */
export function sortPeers<T extends PeerOrderInput>(
  peers: T[],
  locale?: string,
): T[] {
  return [...peers].sort((a, b) => {
    const ra = peerRank(a)
    const rb = peerRank(b)
    if (ra !== rb) {
      return ra - rb
    }
    if (ra <= 2) {
      const ta = a.lastMessageAt ?? ''
      const tb = b.lastMessageAt ?? ''
      if (ta !== tb) {
        return tb.localeCompare(ta)
      }
    }
    return a.name.localeCompare(b.name, locale)
  })
}

/** Nokta rengi → Tailwind sınıfı + i18n etiket anahtarı (tek kaynak). */
export const PRESENCE_UI: Record<Presence, { dot: string, labelKey: string }> = {
  active: { dot: 'bg-amber-400', labelKey: 'chat.presenceActive' },
  online: { dot: 'bg-green-500', labelKey: 'chat.presenceOnline' },
  offline: { dot: 'bg-red-500', labelKey: 'chat.presenceOffline' },
}

/** Sarı noktanın ipucu metni: tam olarak NE yapıyor. */
export const PRESENCE_STATE_LABEL_KEY: Record<PresenceState, string> = {
  typing: 'chat.presenceTyping',
  uploading: 'chat.presenceUploading',
  recording: 'chat.presenceRecording',
}
