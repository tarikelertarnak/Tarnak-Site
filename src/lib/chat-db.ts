import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReplyPreview } from '@/lib/chat-reply'
import { missingReplyPreview, toReplyPreview } from '@/lib/chat-reply'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Chat — kalıcı veri katmanı (Supabase).
 *
 * Neden: `lib/chat.ts` `data/chat/messages.json` DOSYASINA yazıyordu. Cloudflare
 * Workers'ta dosya sistemi yok → yazma sessizce başarısız, mesajlar kayboluyordu.
 * Bu katman Postgres'e yazar; `supabase/chat.sql` şemasını kullanır.
 *
 * TABLO YOKSA: tüm fonksiyonlar düzgün bir hata fırlatır (no-table), API route
 * bunu 503 + kullanıcıya görünür mesajla karşılar. Uygulama ÇÖKMEZ.
 *
 * GÜVENLİK:
 *   · Tüm istemler service-role ile gider (RLS bypass). Yetki kontrolü
 *     API route'ta `getSessionUser()` ile yapılır — burada sadece veri.
 *   · Kullanıcı YALNIZCA katıldığı sohbetleri okur (listForUser).
 *   · "Herkesten sil" yumuşak silmedir: `deleted_for_all=true`. Admin,
 *     sohbetin `deleted_retention` ayarı boyunca GERÇEK içeriği görebilir
 *     (`deletedVisibleToAdmin`), sonra kalıcı olarak silinir.
 */

export interface ChatConversationRow {
  id: string
  kind: 'direct' | 'group'
  direct_key: string | null
  title: string | null
  important: boolean
  favorite: boolean
  blocked: boolean
  /** Liste öğesi için son mesaj özeti + gönderen adı (grupta "Osman: Tamam"). */
  last_preview: string | null
  last_sender_name: string | null
  deleted_retention: 'off' | 'forever' | '7 days' | '30 days' | '90 days'
  created_at: string
  updated_at: string
}

export interface ChatMessageRow {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  text: string | null
  kind: 'text' | 'image' | 'file' | 'audio' | 'video'
  file_url: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  audio_duration: number | null
  reply_to_id: string | null
  delivered_at: string | null
  read_at: string | null
  pinned: boolean
  pinned_at: string | null
  deleted_for_all: boolean
  deleted_by: string | null
  deleted_at: string | null
  created_at: string
  /**
   * Yanıtlanan mesajın ÖZETİ (2026-10-16 kullanıcı isteği: "gönderilen mesajda
   * alıntı görünsün"). `listMessages` doldurur; tek sorguyla toplanır (N+1 yok).
   * Yanıt değilse `null`/yok.
   */
  reply_to?: ReplyPreview | null
}

/**
 * Balonun içindeki alıntı bloğu için gereken en az bilgi. Gönderen adı + kısa
 * metin + medya türü + silinmiş mi. Silinmiş mesajın METNİ gönderilmez
 * (içerik sızmaz) — `deleted: true` yeter, arayüz "Bu mesaj silindi" yazar.
 *
 * Kural `lib/chat-reply.ts`te (saf, istemciyle paylaşılır).
 */
export type { ReplyPreview } from '@/lib/chat-reply'

export interface Participant {
  user_id: string
  role: 'member' | 'admin'
  joined_at: string
}

/** Tablo yoksa fırlatılacak hata — API route bunu tanıyıp 503 döner. */
export class ChatSchemaMissing extends Error {
  constructor() {
    super('chat_conversations tablosu bulunamadı. supabase/chat.sql dosyasını SQL Editor\'da çalıştır.')
    this.name = 'ChatSchemaMissing'
  }
}

function isMissingTable(error: { code?: string, message?: string } | null): boolean {
  if (!error) {
    return false
  }
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || /relation .* does not exist|schema cache/i.test(error.message ?? '')
}

function db(): SupabaseClient {
  return createAdminClient()
}

/* ── sohbet (conversation) işlemleri ─────────────────────────────────── */

/** Doğrudan sohbet için kararlı anahtar: iki user id'yi alfabetik sırayla birleştir. */
export function directKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

/**
 * İki kullanıcı arasındaki doğrudan sohbeti bulur, yoksa oluşturur (idempotent).
 * Aynı çift için her zaman aynı satır döner.
 */
export async function getOrCreateDirectConversation(
  a: string,
  b: string,
): Promise<ChatConversationRow> {
  const key = directKey(a, b)
  const client = db()
  const existing = await client
    .from('chat_conversations')
    .select('*')
    .eq('direct_key', key)
    .maybeSingle()
  if (existing.error) {
    throw existing.error
  }
  if (existing.data) {
    /*
      Var olan sohbette katılım satırları EKSİK olabilir. 2026-10-12 canlı
      ölçümü: `direct_key = "<aynı id>|<aynı id>"` (kişinin KENDİSİYLE sohbet
      açması) sohbetinde iki katılımcı aynı birincil anahtarla eklendiği için
      INSERT çakışmış ve HİÇ satır yazılmamıştı → sohbet açılıyor, ardından
      mesaj okuma "Erişim yok." (403) dönüyordu. Katılım artık her açılışta
      garanti edilir (idempotent) → eski kırık sohbet de kendini onarır.
    */
    await ensureParticipants(client, existing.data.id as string, [a, b])
    return existing.data as ChatConversationRow
  }

  const created = await client
    .from('chat_conversations')
    .insert({ kind: 'direct', direct_key: key })
    .select('*')
    .single()
  if (created.error) {
    // yarış durumu: eşzamanlı iki istek → unique violation. Yeniden oku.
    if (created.error.code === '23505') {
      const again = await client
        .from('chat_conversations')
        .select('*')
        .eq('direct_key', key)
        .single()
      if (again.error) {
        throw again.error
      }
      return again.data as ChatConversationRow
    }
    if (isMissingTable(created.error)) {
      throw new ChatSchemaMissing()
    }
    throw created.error
  }

  const conv = created.data as ChatConversationRow
  await ensureParticipants(client, conv.id, [a, b])
  return conv
}

/**
 * Katılımcı satırlarını garanti eder (idempotent, yarış güvenli).
 *
 * `a === b` olabilir (kendisiyle sohbet): iki satır aynı birincil anahtara
 * `(conversation_id, user_id)` düşer, çakışır ve INSERT'ün TAMAMI geri
 * alınır. Bu yüzden kimlikler tekilleştirilir.
 */
async function ensureParticipants(
  client: SupabaseClient,
  conversationId: string,
  ids: string[],
): Promise<void> {
  const rows = [...new Set(ids)]
    .filter(id => !!id)
    .map(user_id => ({ conversation_id: conversationId, user_id }))
  if (rows.length === 0) {
    return
  }
  await client
    .from('chat_participants')
    .upsert(rows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true })
}

/**
 * SOHBET KİMLİĞİ (2026-10-12) — site sahibi iki farklı yolla giriş yapabiliyor:
 * `/login` (admin.json → id `admin:<kullanıcı adı>`) ve `/sign` (Supabase → uuid).
 * İki kimlik İKİ AYRI sohbet geçmişi demekti: sahip bir yolla konuştuğunu
 * diğerinde göremiyordu ("kimse yok, kendim bile"). Kullanıcı adı `profiles`
 * tablosunda varsa sohbet kimliği o profilin UUID'idir; eşleşme yoksa id
 * aynen döner (davranış değişmez).
 *
 * Eşleşme büyük/küçük harf duyarsız ve TAM ad üzerinden yapılır (ILIKE joker
 * karakteri `_` yüzünden yanlış kişiye bağlanmamak için JS tarafında).
 */
export async function resolveChatIdentity(
  id: string,
  username: string | null,
): Promise<string> {
  if (!id.startsWith('admin:') || !username) {
    return id
  }
  const { data } = await db().from('profiles').select('id, username').limit(500)
  const rows = (data ?? []) as Array<{ id: string, username: string | null }>
  const target = username.trim().toLowerCase()
  return rows.find(p => (p.username ?? '').trim().toLowerCase() === target)?.id ?? id
}

/** Sitenin sahibinin user id'si (normal kullanıcılar SADECE sahiple konuşur). */
export async function siteOwnerId(): Promise<string> {
  const { data } = await db()
    .from('profiles')
    .select('id')
    .eq('is_owner', true)
    .limit(1)
    .maybeSingle()
  return (data as { id?: string } | null)?.id ?? ''
}

/** Kullanıcının katıldığı tüm sohbetler (en son mesaja göre sıralı). */
export async function listForUser(userId: string): Promise<ChatConversationRow[]> {
  const client = db()
  const part = await client
    .from('chat_participants')
    .select('conversation_id')
    .eq('user_id', userId)
  if (part.error) {
    if (isMissingTable(part.error)) {
      throw new ChatSchemaMissing()
    }
    throw part.error
  }
  const ids = (part.data ?? []).map(r => r.conversation_id)
  if (ids.length === 0) {
    return []
  }
  const convs = await client
    .from('chat_conversations')
    .select('*')
    .in('id', ids)
    .order('updated_at', { ascending: false })
  if (convs.error) {
    if (isMissingTable(convs.error)) {
      throw new ChatSchemaMissing()
    }
    throw convs.error
  }
  return convs.data as ChatConversationRow[]
}

/**
 * LİSTE SATIRI EK BİLGİSİ (2026-10-13 kullanıcı isteği: "okunmamış mavi rozet +
 * tikler listede görünsün").
 *
 * Sohbet başına:
 *   · `unread` → BANA gelen, henüz okunmamış mesaj sayısı (mavi rozet),
 *   · `last`   → SON mesajın gönderen/teslim/okundu damgaları (tik göstergesi).
 *
 * Neden yeni tablo YOK: ikisi de mevcut veriden türetilir
 * (`chat_messages.read_at` + `sender_id`). Migration gerekmedi.
 */
export interface ConversationMeta {
  unread: number
  last: {
    sender_id: string
    delivered_at: string | null
    read_at: string | null
    created_at: string
  } | null
}

/**
 * `shortcut:` "son mesaj" taraması en yeni `LAST_SCAN` satıra bakar (sohbet
 * başına 1 satır almanın PostgREST'te yolu yok — `DISTINCT ON`/RPC migration
 * ister). Sohbet sayısı bu sınırı zorlamaya başlarsa ya da son mesajı bu
 * pencerenin dışında kalan bir sohbet görülürse RPC'ye geç.
 */
const LAST_SCAN = 300

export async function conversationMeta(
  userId: string,
  conversationIds: string[],
): Promise<Record<string, ConversationMeta>> {
  const meta: Record<string, ConversationMeta> = {}
  if (conversationIds.length === 0) {
    return meta
  }
  for (const id of conversationIds) {
    meta[id] = { unread: 0, last: null }
  }
  const client = db()
  const [unreadRes, lastRes] = await Promise.all([
    client
      .from('chat_messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .is('read_at', null),
    client
      .from('chat_messages')
      .select('conversation_id, sender_id, delivered_at, read_at, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(LAST_SCAN),
  ])
  const error = unreadRes.error ?? lastRes.error
  if (error) {
    if (isMissingTable(error)) {
      throw new ChatSchemaMissing()
    }
    throw error
  }
  for (const row of unreadRes.data ?? []) {
    const entry = meta[row.conversation_id as string]
    if (entry) {
      entry.unread += 1
    }
  }
  // Zaman azalan sırada geldiği için her sohbette İLK görülen = son mesaj.
  for (const row of lastRes.data ?? []) {
    const entry = meta[row.conversation_id as string]
    if (entry && !entry.last) {
      entry.last = {
        sender_id: row.sender_id as string,
        delivered_at: (row.delivered_at as string | null) ?? null,
        read_at: (row.read_at as string | null) ?? null,
        created_at: row.created_at as string,
      }
    }
  }
  return meta
}

/** Kullanıcı bu sohbetin katılımcısı mı? (okuma/yazma yetkisi) */
export async function isParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const client = db()
  const { data, error } = await client
    .from('chat_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error && !isMissingTable(error)) {
    throw error
  }
  return !!data
}

/* ── mesaj işlemleri ─────────────────────────────────────────────────── */

export interface SendMessageInput {
  conversationId: string
  senderId: string
  senderName: string
  text?: string
  kind?: ChatMessageRow['kind']
  file?: {
    url: string
    name: string
    type: string
    size: number
  }
  audioDuration?: number
  replyToId?: string
}

export async function sendMessage(input: SendMessageInput): Promise<ChatMessageRow> {
  const client = db()
  /*
    YANIT DOĞRULAMASI (2026-10-16 kullanıcı isteği: "sunucu bu id'nin aynı
    sohbete ait olduğunu doğrulasın"). Başka sohbetin mesajına yanıt vermek
    (var olan id'yi tahmin ederek) engellenir; geçersiz id gönderimi DÜŞÜRÜR
    ama mesajı kaybetmez (yanıtsız normal mesaj olarak yazılır).
  */
  let replyToId: string | null = input.replyToId ?? null
  if (replyToId) {
    const check = await client
      .from('chat_messages')
      .select('id')
      .eq('id', replyToId)
      .eq('conversation_id', input.conversationId)
      .maybeSingle()
    if (check.error && isMissingTable(check.error)) {
      throw new ChatSchemaMissing()
    }
    if (!check.data) {
      replyToId = null
    }
  }
  const row = {
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    sender_name: input.senderName,
    text: input.text?.trim() || null,
    kind: input.kind ?? 'text',
    file_url: input.file?.url ?? null,
    file_name: input.file?.name ?? null,
    file_type: input.file?.type ?? null,
    file_size: input.file?.size ?? null,
    audio_duration: input.audioDuration ?? null,
    reply_to_id: replyToId,
  }
  const res = await client
    .from('chat_messages')
    .insert(row)
    .select('*')
    .single()
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
  const saved = res.data as ChatMessageRow
  // sohbetin updated_at'ini dokun (sıralama "en son hareket" için) ve LİSTE
  // ÖĞESİ için son mesaj özetini denormalize et (liste okunurken N+1 olmasın).
  await client
    .from('chat_conversations')
    .update({
      updated_at: new Date().toISOString(),
      last_preview: messagePreview(saved),
      last_sender_name: input.senderName,
    })
    .eq('id', input.conversationId)
  return saved
}

/**
 * Liste öğesinde gösterilecek kısa özet. Metin varsa kendisi; yoksa türün
 * okunabilir adı ("📷 Fotoğraf", "🎤 Sesli mesaj" …).
 */
export function messagePreview(
  row: Pick<ChatMessageRow, 'text' | 'kind' | 'file_name'>,
): string {
  const text = row.text?.trim()
  if (text) {
    return text.slice(0, 120)
  }
  switch (row.kind) {
    case 'image':
      return '📷 Fotoğraf'
    case 'video':
      return '🎬 Video'
    case 'audio':
      return '🎤 Sesli mesaj'
    case 'file':
      return `📎 ${row.file_name ?? 'Dosya'}`
    default:
      return ''
  }
}

/**
 * ÇEVRİMİÇİ NABZI (2026-10-11; 2026-10-14 local-first güncellendi).
 *
 * İstemci yerel aktiviteye göre presence hesaplar (sekme odak, fare/klavye).
 * Sunucuya senkron:
 *   - `state` doluysa (typing/uploading/recording): `last_seen_at` + `presence_state` güncellenir
 *   - `state === null` ve `force !== true`: sadece `presence_state` null yapılır (offline)
 *   - `state === null` ve `force === true`: periyodik "hala buradayım" → `last_seen_at` tazelenir, `presence_state` DOKUNMUYOR (mevcut değer kalır)
 *
 * Bu sayede:
 *   - Yerel first: yeşil nokta anlık (ağ gecikmesi yok)
 *   - Sunucu yükü az: 20 sn → 5 dk periyodik, sadece durum değişiminde yazma
 *   - `last_seen_at` her 5 dk bir tazelenir → diğer istemciler presenceOf() ile doğru hesaplar
 */
export async function touchPresence(
  userId: string,
  state: 'typing' | 'uploading' | 'recording' | null,
  force = false,
): Promise<void> {
  const client = db()
  const now = new Date().toISOString()
  if (state !== null) {
    // Yazma/yükleme/kayıt: her ikisini güncelle
    const res = await client
      .from('profiles')
      .update({ last_seen_at: now, presence_state: state })
      .eq('id', userId)
    if (res.error) {
      throw res.error
    }
  }
 else if (force) {
    // Periyodik "hala buradayım": sadece last_seen_at tazelenir, presence_state KORUNUR
    const res = await client
      .from('profiles')
      .update({ last_seen_at: now })
      .eq('id', userId)
    if (res.error) {
      throw res.error
    }
  }
 else {
    // Gerçek offline: presence_state null, last_seen_at artık eskimeye başlar
    const res = await client
      .from('profiles')
      .update({ presence_state: null })
      .eq('id', userId)
    if (res.error) {
      throw res.error
    }
  }
}

/**
 * Sohbetin mesajlarını okur.
 *
 * `isAdmin` true ise SİLİNMİŞ mesajların GERÇEK içeriği döner (retention
 * penceresi boyunca). Normal kullanıcıya silinmiş mesaj "Bu mesajı sildiniz"
 * olarak maskelenir (içerik sızmaz).
 */
export async function listMessages(
  conversationId: string,
  isAdmin: boolean,
): Promise<ChatMessageRow[]> {
  const client = db()
  const res = await client
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
  const rows = res.data as ChatMessageRow[]
  // Normal kullanıcıya SİLİNMİŞ mesajın içeriği MASKELENİR: "Bu mesajı
  // sildiniz" gösterilir, gerçek metin/dosya SIZMAZ. Admin retention
  // penceresi boyunca gerçek içeriği görmeye devam eder.
  const visible = isAdmin
    ? rows
    : rows.map(m =>
        m.deleted_for_all
          ? {
              ...m,
              text: null,
              file_url: null,
              file_name: null,
              file_type: null,
              file_size: null,
              audio_duration: null,
            }
          : m,
      )
  // Yanıtlanan mesajın özeti (2026-10-16) — tek sorgu, N+1 yok.
  return attachReplyPreviews(visible)
}

/**
 * Teslim edildi ✓✓: mesaj alıcıya ulaştı.
 *
 *  `viewerId` ZORUNLU (2026-10-16 kök neden düzeltmesi): eskiden filtre yoktu,
 *  yani sohbeti AÇAN GÖNDEREN kendi mesajlarını da "teslim edildi" işaretliyordu.
 *  Artık kişi yalnızca BAŞKASININ mesajlarını teslim edilmiş sayar.
 */
export async function markDelivered(conversationId: string, viewerId: string): Promise<void> {
  const client = db()
  await client
    .from('chat_messages')
    .update({ delivered_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', viewerId)
    .is('delivered_at', null)
}

/**
 * Okundu ✓✓ (mavi): sohbeti AÇIK ve GÖRÜNÜR durumda okuyan katılımcının
 * karşı tarafa ait mesajları okundu işaretlenir.
 *
 *  `viewerId` ZORUNLU (2026-10-16 kök neden düzeltmesi): eskiden filtre yoktu →
 *  gönderen kendi sohbetini açınca kendi mesajları "okundu" oluyordu ve alıcı
 *  çevrimdışıyken bile çift mavi tik görünüyordu.
 */
export async function markRead(conversationId: string, viewerId: string): Promise<void> {
  const client = db()
  await client
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', viewerId)
    .is('read_at', null)
}

/**
 * Yanıtlanan mesajların ÖZETİNİ tek sorguda toplayıp satırlara iliştirir
 * (2026-10-16). N+1 yok: tüm `reply_to_id`'ler tek `in()` sorgusunda çekilir.
 *
 * Yanıt hedefi bulunamazsa (fiziksel silinmiş) `deleted: true` döner — arayüz
 * "Bu mesaj silindi" yazar, alıntı kaybolmaz.
 *
 * Hata durumunda özet İLİŞTİRİLMEZ ama mesaj listesi yine döner: alıntı
 * önizlemesi kaybı mesajların görünmesini engellememeli.
 */
async function attachReplyPreviews(rows: ChatMessageRow[]): Promise<ChatMessageRow[]> {
  const ids = [...new Set(rows.map(r => r.reply_to_id).filter((v): v is string => !!v))]
  if (ids.length === 0) {
    // Hiç yanıt yoksa ek sorgu yapılmaz; alan yine de NORMALLEŞTİRİLİR
    // (`undefined` değil `null`) — istemci `reply_to === null` varsayar.
    return rows.map(r => ({ ...r, reply_to: null }))
  }
  const client = db()
  const res = await client
    .from('chat_messages')
    .select('id, sender_id, sender_name, text, kind, file_name, file_url, deleted_for_all')
    .in('id', ids)
  if (res.error) {
    // Alıntı özeti kaybı mesajların görünmesini engellememeli.
    return rows.map(r => ({ ...r, reply_to: null }))
  }
  type Row = Pick<ChatMessageRow,
    'id' | 'sender_id' | 'sender_name' | 'text' | 'kind' | 'file_name' | 'file_url' | 'deleted_for_all'>
  const found = new Map((res.data as Row[]).map(r => [r.id, r]))
  return rows.map(r => ({
    ...r,
    reply_to: r.reply_to_id
      ? (found.has(r.reply_to_id)
          ? toReplyPreview(found.get(r.reply_to_id)!)
          : missingReplyPreview(r.reply_to_id))
      : null,
  }))
}

/**
 * Mesajı HERKESTEN sil (yumuşak). Admin retention süresi boyunca içeriği
 * görebilir; sonra fiziksel olarak silinir.
 */
export async function deleteForAll(
  messageId: string,
  deletedBy: string,
): Promise<void> {
  const client = db()
  const res = await client
    .from('chat_messages')
    .update({
      deleted_for_all: true,
      deleted_by: deletedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Yalnızca benden sil: fiziksel olarak kaldırır. */
export async function deleteOwn(messageId: string): Promise<void> {
  const client = db()
  const res = await client.from('chat_messages').delete().eq('id', messageId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Sabitle / sabitlemeyi kaldır (herkes yapabilir). */
export async function setPinned(
  messageId: string,
  pinned: boolean,
): Promise<void> {
  const client = db()
  const res = await client
    .from('chat_messages')
    .update({
      pinned,
      pinned_at: pinned ? new Date().toISOString() : null,
    })
    .eq('id', messageId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Kişiyi/grubu önemli (sesli bildirim) işaretle. */
export async function setImportant(
  conversationId: string,
  important: boolean,
): Promise<void> {
  const client = db()
  const res = await client
    .from('chat_conversations')
    .update({ important })
    .eq('id', conversationId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Sohbeti favorilere ekle / çıkar. */
export async function setFavorite(
  conversationId: string,
  favorite: boolean,
): Promise<void> {
  const client = db()
  const res = await client
    .from('chat_conversations')
    .update({ favorite })
    .eq('id', conversationId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Sohbeti engelle / engeli kaldır (admin). */
export async function setBlocked(
  conversationId: string,
  blocked: boolean,
): Promise<void> {
  const client = db()
  const res = await client
    .from('chat_conversations')
    .update({ blocked })
    .eq('id', conversationId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Sohbeti temizle: mesajları sil, sohbet KALIR (geçmişi boşalt). */
export async function clearConversation(conversationId: string): Promise<void> {
  const client = db()
  const res = await client.from('chat_messages').delete().eq('conversation_id', conversationId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/** Sohbeti tamamen sil (katılımlar ve mesajlar cascade). */
export async function deleteConversation(conversationId: string): Promise<void> {
  const client = db()
  const res = await client.from('chat_conversations').delete().eq('id', conversationId)
  if (res.error) {
    if (isMissingTable(res.error)) {
      throw new ChatSchemaMissing()
    }
    throw res.error
  }
}

/**
 * Kullanıcıya TAKMA AD ver (admin).
 *
 * Arama `username` · `full_name` · `nickname` ÜÇÜNÜ birden kapsar; takma ad
 * konulduğunda gerçek ad aranmaya devam eder (kullanıcı isteği: "aynı
 * kullanıcı hem takma ad hem normal adla aranabilir, biri gitme sorunu olmaz").
 */
export async function setNickname(userId: string, nickname: string): Promise<void> {
  const client = db()
  const res = await client
    .from('profiles')
    .update({ nickname: nickname.trim() || null })
    .eq('id', userId)
  if (res.error) {
    throw res.error
  }
}

/**
 * "Profilini incele" — YALNIZCA güvenli alanlar.
 *
 * GÜVENLİK (kullanıcı isteği 2026-10-11): şifre, gmail/e-posta ve telefon
 * ASLA dönmez — canlıda sızarsa geri dönüşü yok. Beyaz liste (allow-list)
 * kullanılır; veritabanından yalnız bu sütunlar okunur, yani yeni bir gizli
 * sütun eklendiğinde sızma olmaz.
 */
export interface AdminProfileView {
  id: string
  username: string | null
  fullName: string | null
  nickname: string | null
  avatarUrl: string | null
  bio: string | null
  githubHandle: string | null
  website: string | null
  role: string | null
  isOwner: boolean
  createdAt: string | null
  /** Kullanıcının katıldığı sohbetler (grup üyeliği dahil). */
  groups: Array<{ conversationId: string, title: string | null }>
  messageCount: number
}

/** `email` / `phone` / parola özeti hiçbir koşulda okunmaz bile. */
export async function getAdminProfileView(userId: string): Promise<AdminProfileView | null> {
  const client = db()
  const { data, error } = await client
    .from('profiles')
    .select('id, username, full_name, nickname, avatar_url, bio, github_handle, website, role, is_owner, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    throw error
  }
  if (!data) {
    return null
  }

  const [part, msgs] = await Promise.all([
    client.from('chat_participants').select('conversation_id').eq('user_id', userId),
    client.from('chat_messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId),
  ])

  const ids = (part.data ?? []).map(r => r.conversation_id as string)
  let groups: AdminProfileView['groups'] = []
  if (ids.length > 0) {
    const convs = await client
      .from('chat_conversations')
      .select('id, title')
      .in('id', ids)
      .not('title', 'is', null)
    groups = (convs.data ?? []).map(c => ({
      conversationId: c.id as string,
      title: c.title as string | null,
    }))
  }

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    nickname: data.nickname,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    githubHandle: data.github_handle,
    website: data.website,
    role: data.role,
    isOwner: !!data.is_owner,
    createdAt: data.created_at,
    groups,
    messageCount: msgs.count ?? 0,
  }
}

/**
 * Retention penceresi geçmiş silinen mesajları FİZİKSEL olarak siler.
 * `forever`/`off` → dokunmaz. Bu, "admin 30 gün içinde görür, sonra silinir"
 * kuralını otomatik uygular.
 */
export async function purgeExpiredDeleted(): Promise<number> {
  const client = db()
  const rows = await client
    .from('chat_conversations')
    .select('id, deleted_retention')
  if (rows.error) {
    if (isMissingTable(rows.error)) {
      return 0
    }
    throw rows.error
  }
  let removed = 0
  const now = Date.now()
  for (const conv of rows.data ?? []) {
    const r = conv.deleted_retention as ChatConversationRow['deleted_retention']
    if (r === 'off' || r === 'forever') {
      continue
    }
    const days = Number.parseInt(r, 10)
    if (Number.isNaN(days)) {
      continue
    }
    const cutoff = new Date(now - days * 86_400_000).toISOString()
    // Postgres DELETE dönen satırları vermez (PostgREST ilk sütunu döndürmez) →
    // silmeden ÖNCE say, sonra sil, farkı al.
    const before = await client
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('deleted_for_all', true)
      .lt('deleted_at', cutoff)
    const willRemove = before.count ?? 0
    if (willRemove > 0) {
      await client
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conv.id)
        .eq('deleted_for_all', true)
        .lt('deleted_at', cutoff)
      removed += willRemove
    }
  }
  return removed
}
