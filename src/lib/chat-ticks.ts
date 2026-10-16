/**
 * Mesaj tikleri — durum mantığı (2026-10-16 kullanıcı isteğiyle YENİDEN).
 *
 * Kullanıcı: "karşı kullanıcı ÇEVRİMDIŞI ve mesajı hiç görmemiş olduğu hâlde
 * gönderdiğim mesajlarda çift tik ve okundu rengi görünüyor. Bu yanlış." ve
 * "gri (soluk) = gönderildi/iletildi, mavi (sitenin mavi vurgusu) = okundu.
 * Yeşil kullanma."
 *
 * RENK tek bir soruyu yanıtlar: **karşı taraf GÖRDÜ mü?**
 *   · soluk/gri → henüz görülmedi (gönderildi ya da teslim edildi)
 *   · mavi      → okundu
 * Tik SAYISI ikinci bilgiyi taşır (`double`): tek tik = gönderildi,
 * çift tik = teslim edildi / okundu.
 *
 * KAPALI: `pending` (saat) ve `failed` (kırmızı ünlem) durumları — bunlar
 * sunucu damgalarından DEĞİL, iyimser gönderimin istemci durumundan gelir
 * (`chat.tsx` → `tickFor(..., { pending, failed })`).
 *
 * İkonlar `components/ui/icons.tsx`te INLINE SVG olarak durur (TickSentIcon /
 * TickReadIcon) — Material Symbols Rounded, yani uçları yuvarlak. Iconify
 * CDN'ini beklememeleri için inline (bkz. o dosyanın başı); tik her mesajda
 * tekrar tekrar ağdan çekilmez.
 *
 * Renkler neden tema jetonu değil: tik yalnızca "benim" mesajımda görünür ve o
 * balon iki temada da MAVİdir (`bg-primary`: light `#3b82f6`, dark `#2563eb`).
 * Bu yüzden:
 *   · gönderildi/teslim edildi → `text-primary-fg/60` (balonun metin renginin
 *     %60'ı; koyu temada soluk beyaz, açık temada soluk siyah → "gri" okunur),
 *   · okundu → `text-sky-300` (`#7dd3fc`, açık mavi). Balon mavi olduğu için
 *     "mavi tik" ancak balondan AÇIK bir tonla ayırt edilebilir; koyu temada
 *     ölçülen kontrast 3.6:1, açık temadaki daha parlak mavide ~2.2:1 (çift tik
 *     şekli + %100 opaklık ikinci ayırt edici işarettir).
 */

export interface TickStyle {
  /** Çift tik mi? Tek tik yalnızca "gönderildi" demek. */
  double: boolean
  /** `text-*` renk sınıfı. */
  color: string
  /** Ekran okuyucu etiketi / ipucu için i18n anahtarı. */
  labelKey: string
  /** Kararın kendisi — yerine göre renk seçmek isteyenler için (aşağıya bak). */
  state: TickState
}

export type TickState = 'failed' | 'sending' | 'read' | 'delivered' | 'sent'

/**
 * Sohbet LİSTESİ tiki için renkler (2026-10-16). Balon renkleri (`color`)
 * MAVİ balon varsayımıyla seçildi; liste zemini şeffaftır, orada okunmaz
 * (özellikle açık temada `sky-300` beyaz üstünde ~2:1). Karar AYNI
 * (`tickForFlags`), yalnız renk yere göre seçilir.
 */
export const TICK_LIST_COLORS: Record<TickState, string> = {
  failed: 'text-red-500',
  sending: 'text-foreground-400',
  read: 'text-primary',
  delivered: 'text-foreground-500',
  sent: 'text-foreground-500',
}

/** Soluk = "henüz görülmedi" (gönderildi ya da teslim edildi). */
export const TICK_PENDING_COLOR = 'text-primary-fg/60'
/** Mavi = "okundu". */
export const TICK_READ_COLOR = 'text-sky-300'
/** Saat: mesaj henüz sunucuya ulaşmadı (iyimser gönderim sürüyor). */
export const TICK_SENDING_COLOR = 'text-primary-fg/60'
/** Kırmızı ünlem: gönderim başarısız. */
export const TICK_FAILED_COLOR = 'text-red-300'

/**
 * İstemci tarafı iyimser gönderim durumu. Sunucudan gelen mesajlarda ikisi de
 * yoktur; yalnızca `send()` başarılı olana/başarısız olana kadar geçerlidir.
 */
export interface TickOverride {
  pending?: boolean
  failed?: boolean
}

/**
 * Bir mesajın tik görünümü. Öncelik: başarısız > gönderiliyor > okundu >
 * teslim edildi > gönderildi. `read_at` doluysa mesaj okunmuştur — teslim
 * damgası eksik olsa bile.
 */
export function tickFor(
  message: {
    delivered_at: string | null
    read_at: string | null
  },
  override?: TickOverride,
): TickStyle {
  return styleFor(!!message.read_at, !!message.delivered_at, override)
}

/**
 * Bayrak biçimindeki durum için AYNI karar (2026-10-16). Sohbet LİSTESİNDEKİ
 * tik yalnız `{ mine, delivered, read }` özetini taşır (satır damgaları
 * çekilmez); "liste tiki balondan farklı mantık kullanmasın" diye karar
 * tekrar yazılmaz, buradan çağrılır.
 */
export function tickForFlags(
  flags: { delivered: boolean, read: boolean },
  override?: TickOverride,
): TickStyle {
  return styleFor(flags.read, flags.delivered, override)
}

function styleFor(read: boolean, delivered: boolean, override?: TickOverride): TickStyle {
  if (override?.failed) {
    return { double: false, color: TICK_FAILED_COLOR, labelKey: 'chat.sendFailedTick', state: 'failed' }
  }
  if (override?.pending) {
    return { double: false, color: TICK_SENDING_COLOR, labelKey: 'chat.sendingTick', state: 'sending' }
  }
  if (read) {
    return { double: true, color: TICK_READ_COLOR, labelKey: 'chat.readAt', state: 'read' }
  }
  if (delivered) {
    return { double: true, color: TICK_PENDING_COLOR, labelKey: 'chat.deliveredAt', state: 'delivered' }
  }
  return { double: false, color: TICK_PENDING_COLOR, labelKey: 'chat.sentAt', state: 'sent' }
}
