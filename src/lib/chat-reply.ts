/**
 * Yanıt (alıntı) — SAF yardımcılar (2026-10-16 kullanıcı isteği).
 *
 * Neden ayrı dosya: bu kurallar hem SUNUCUDA (`chat-db.listMessages` mesajlara
 * alıntı özeti iliştirir) hem İSTEMCİDE (iyimser eklenen mesajın alıntısı)
 * kullanılır. `chat-db.ts` sunucu tarafı Supabase istemcisini içe aktardığı
 * için istemciden değer olarak import EDİLEMEZ; tek kuralın iki kopyası
 * olmasın diye buraya taşındı.
 */

/** Alıntıda taşınan metin sınırı (kullanıcı isteği: "ilk ~150 karakter"). */
export const REPLY_TEXT_MAX = 150

/** Balonun içindeki alıntı bloğu ve giriş üstü önizleme için gereken alanlar. */
export interface ReplyPreview {
  id: string
  sender_id: string
  sender_name: string
  /** En fazla `REPLY_TEXT_MAX` karakter. Silinmişse null. */
  text: string | null
  kind: 'text' | 'image' | 'file' | 'audio' | 'video'
  file_name: string | null
  file_url: string | null
  deleted: boolean
}

/** `toReplyPreview`'ın ihtiyaç duyduğu alanlar (tam satır olmak zorunda değil). */
export interface ReplySourceRow {
  id: string
  sender_id: string
  sender_name: string
  text: string | null
  kind: ReplyPreview['kind']
  file_name: string | null
  file_url: string | null
  deleted_for_all: boolean
}

/**
 * Satırdan alıntı özeti üretir. SİLİNMİŞ mesajın metni/dosyası TAŞINMAZ
 * (içerik sızmaz) — `deleted: true` yeter, arayüz "Bu mesaj silindi" yazar.
 */
export function toReplyPreview(row: ReplySourceRow): ReplyPreview {
  return {
    id: row.id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    text: row.deleted_for_all ? null : (row.text?.slice(0, REPLY_TEXT_MAX) ?? null),
    kind: row.kind,
    file_name: row.deleted_for_all ? null : row.file_name,
    file_url: row.deleted_for_all ? null : row.file_url,
    deleted: row.deleted_for_all,
  }
}

/** Fiziksel olarak silinmiş (satırı hiç bulunamayan) yanıt hedefi. */
export function missingReplyPreview(id: string): ReplyPreview {
  return {
    id,
    sender_id: '',
    sender_name: '',
    text: null,
    kind: 'text',
    file_name: null,
    file_url: null,
    deleted: true,
  }
}

/** Alıntının gösterilecek metni — metin yoksa medya türünün i18n anahtarı. */
export function replyPlaceholderKey(kind: ReplyPreview['kind']): string {
  switch (kind) {
    case 'image':
      return 'chat.mediaPhoto'
    case 'video':
      return 'chat.mediaVideo'
    case 'audio':
      return 'chat.mediaAudio'
    case 'file':
      return 'chat.mediaFile'
    default:
      return ''
  }
}

/**
 * Alıntıda gösterilecek gönderen etiketi. Giriş üstü önizleme ve balon içi
 * alıntı AYNI kuralı kullanır (iki yerde ayrı yazılırsa biri unutulur).
 * Fiziksel olarak silinmiş hedefte ad bilinmez → `—` (boş `@` görünmesin).
 */
export function replySenderLabel(
  preview: Pick<ReplyPreview, 'sender_id' | 'sender_name'>,
  myId: string,
  youLabel: string,
): string {
  if (preview.sender_id === myId) {
    return youLabel
  }
  return preview.sender_name ? `@${preview.sender_name}` : '—'
}
