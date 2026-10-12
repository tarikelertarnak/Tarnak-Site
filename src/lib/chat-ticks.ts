/**
 * Mesaj tikleri (2026-10-12, kullanıcı isteği).
 *
 * Kullanıcı: "tikler iconu çok kötü, başkasını bul — daha yuvarlak güzel ve
 * yeşil olsun. Eğer sadece gönderildiyse sarı, görüldüyse yeşil olur."
 *
 * RENK tek bir soruyu yanıtlar: **karşı taraf GÖRDÜ mü?**
 *   · sarı  → henüz görülmedi (sadece gönderildi ya da teslim edildi)
 *   · yeşil → okundu
 * Tik SAYISI ikinci bilgiyi taşır (`double`): tek tik = gönderildi,
 * çift tik = teslim edildi / okundu.
 *
 * İkonlar `components/ui/icons.tsx`te INLINE SVG olarak durur (TickSentIcon /
 * TickReadIcon) — Material Symbols Rounded, yani uçları yuvarlak. Iconify
 * CDN'ini beklememeleri için inline (bkz. o dosyanın başı); tik her mesajda
 * tekrar tekrar ağdan çekilmez.
 *
 * Renkler neden tema jetonu değil: tik yalnızca "benim" mesajımda görünür ve o
 * balon iki temada da MAVİdir (`bg-primary`: light `#3b82f6`, dark `#2563eb`).
 * Amber/yeşil, durum noktalarıyla (`lib/chat-peers.ts`) aynı renk ailesinden.
 *
 * Ölçülen okunurluk (dolu ikon, WCAG): amber-400 `#fcbb00` light 2.14:1 /
 * dark 3.01:1 · green-400 `#05df72` light 2.07:1 / dark 2.91:1. Açık temadaki
 * daha parlak mavi yüzünden 3:1'e ulaşmak için neredeyse beyaz bir renk
 * gerekir (doygun yeşil/sarı ile imkânsız); bu yüzden canlı tonlar seçildi.
 */

export interface TickStyle {
  /** Çift tik mi? Tek tik yalnızca "gönderildi" demek. */
  double: boolean
  /** `text-*` renk sınıfı. */
  color: string
  /** Ekran okuyucu etiketi için i18n anahtarı. */
  labelKey: string
}

/** Sarı = "henüz görülmedi". */
export const TICK_PENDING_COLOR = 'text-amber-400'
/** Yeşil = "okundu". */
export const TICK_READ_COLOR = 'text-green-400'

/**
 * Bir mesajın tik görünümü. Öncelik: okundu > teslim edildi > gönderildi.
 * `read_at` doluysa mesaj okunmuştur — teslim damgası eksik olsa bile.
 */
export function tickFor(message: {
  delivered_at: string | null
  read_at: string | null
}): TickStyle {
  if (message.read_at) {
    return { double: true, color: TICK_READ_COLOR, labelKey: 'chat.readAt' }
  }
  if (message.delivered_at) {
    return { double: true, color: TICK_PENDING_COLOR, labelKey: 'chat.deliveredAt' }
  }
  return { double: false, color: TICK_PENDING_COLOR, labelKey: 'chat.sentAt' }
}
