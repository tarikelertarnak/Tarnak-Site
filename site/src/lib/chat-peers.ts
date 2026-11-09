/**
 * Sohbet kişi listesi — SAF mantık, çevrimiçi durumu ve sıralama.
 *
 * 2026-10-11 (kullanıcı isteği): "profil fotoğrafın yanına yeşil ve kırmızı
 * yuvarlaklar ekle ... sarı da ola bilsin. Sarı şu anlama gelir: bana bişey
 * gönderecek."
 *
 * 2026-10-12 (kullanıcı isteği): SARİ NOKTA KALDIRILDI. "Yazıyor" durumu artık
 * nokta değil METİN: listede ve başlıkta mavi "@kullanıcı yazıyor…" satırı
 * (bkz. `typingLabel`). Nokta yalnız
 *   · yeşil → çevrimiçi (nabız taze),
 *   · kırmızı → çevrimdışı.
 *
 * ⚠️ Bu dosya İSTEMCİDE çalışır: Supabase/service-role importu YOKTUR. Veri
 * katmanı `lib/chat-db.ts` içindedir ve oraya yalnız sunucu dokunur.
 */

/** Kişinin ŞU AN ne yaptığı (sunucudaki `profiles.presence_state`). */
export type PresenceState = 'typing' | 'uploading' | 'recording'

/** Nokta rengi — sarı YOK (2026-10-12). */
export type Presence = 'online' | 'offline'

/**
 * Yeşil sayılma eşiği. İstemci 20 sn'de bir nabız atar; 3 nabız kaçarsa
 * (ağ/sleep) kişi çevrimdışı sayılır.
 */
export const PRESENCE_ONLINE_MS = 60_000

/**
 * "yazıyor…" penceresi (TTL). İstemci yazarken ~2 sn'de bir sinyali tazeler,
 * yazmayı bırakınca ~2.5 sn'de "durdu" gönderir; sinyal kaybolursa (ağ/sleep)
 * yazı bu süre sonunda kendiliğinden söner.
 */
export const TYPING_TTL_MS = 5_000

/**
 * Dış girdi doğrulaması: `profiles.presence_state` yalnız bu üç değeri alır.
 * Sunucu ucu (`api/chat`) gövdeden gelen durumu bununla süzer.
 */
export function isPresenceState(value: unknown): value is PresenceState {
  return value === 'typing' || value === 'uploading' || value === 'recording'
}

/**
 * Nabzdan nokta rengini hesaplar. Geçersiz/ileri tarihli damga ("clock skew",
 * sunucu-istemci farkı) kırmızı sayılır: yanlışlıkla "çevrimiçi" göstermek,
 * "çevrimdışı" göstermekten kötü.
 */
export function presenceOf(
  lastSeenAt: string | null | undefined,
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
  return age < 0 || age > PRESENCE_ONLINE_MS ? 'offline' : 'online'
}

/**
 * Şu an "yazıyor" mu? Durum `typing` VE sinyal `TYPING_TTL_MS` içindeyse true.
 * Yükleme/ses durumları (eski sarı nokta) artık noktaya yazılmaz; bu yüzden
 * yalnız `typing` metne dönüşür.
 */
export function isTyping(
  lastSeenAt: string | null | undefined,
  state: unknown,
  now: number = Date.now(),
): boolean {
  if (!lastSeenAt || !isPresenceState(state) || state !== 'typing') {
    return false
  }
  const seen = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(seen)) {
    return false
  }
  const age = now - seen
  return age >= 0 && age <= TYPING_TTL_MS
}

/**
 * "yazıyor…" satırı (2026-10-12 kullanıcı isteği): 1-2 kişi ismen
 * ("@a yazıyor…", "@a, @b yazıyor…"), 3 ve üstünde "Birkaç kişi yazıyor…".
 * Kimse yazmıyorsa `null` (satır son mesaja döner). Çeviri `t` ile gelir.
 */
export function typingLabel(
  usernames: string[],
  t: (key: string) => string,
): string | null {
  if (usernames.length === 0) {
    return null
  }
  if (usernames.length >= 3) {
    return t('chat.typingMany')
  }
  return `@${usernames.join(', @')} ${t('chat.presenceTyping')}`
}

/** Sıralama girdisi — kişi + sohbet işaretleri + çevrimiçi/yazıyor durumu. */
export interface PeerOrderInput {
  /** Görünen ad (takma ad > tam ad > kullanıcı adı) */
  name: string
  /** Admin engelledi → listenin EN ALTINA düşer */
  blocked?: boolean
  /** Sohbet sabitlendi (admin "Sohbeti sabitle" = conversations.important) */
  pinned?: boolean
  favorite?: boolean
  presence: Presence
  /** Şu an yazıyor (eski "sarı nokta" kovasının yerini aldı). */
  typing?: boolean
  /** Sohbetin son hareket zamanı (yoksa hiç konuşulmamış) */
  lastMessageAt?: string | null
}

/**
 * Sıralama kovası.
 *
 * Kullanıcının saydığı sıra: pinlenen → konuşulanlar (zamanla) → favoriler →
 * çevrimiçiler. Yazan kişi (eski sarı nokta) "şu an aksiyon bekleyen tek
 * durum" olduğu için konuşmaların ÜSTÜNDE durur. Engellenen en altta kalır.
 */
export function peerRank(peer: PeerOrderInput): number {
  if (peer.blocked) {
    return 6
  }
  if (peer.pinned) {
    return 0
  }
  if (peer.typing) {
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
  online: { dot: 'bg-green-500', labelKey: 'chat.presenceOnline' },
  offline: { dot: 'bg-red-500', labelKey: 'chat.presenceOffline' },
}
