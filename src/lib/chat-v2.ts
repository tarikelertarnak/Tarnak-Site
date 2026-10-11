import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Chat v2 — kalıcı veri katmanı (Supabase).
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
}

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
  await client.from('chat_participants').insert([
    { conversation_id: conv.id, user_id: a, role: 'member' },
    { conversation_id: conv.id, user_id: b, role: 'member' },
  ])
  return conv
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
    reply_to_id: input.replyToId ?? null,
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
  // sohbetin updated_at'ini dokun (sıralama "en son hareket" için).
  await client
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversationId)
  return res.data as ChatMessageRow
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
  if (isAdmin) {
    return rows
  }
  return rows.map(m =>
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
}

/** Teslim edildi ✓✓: mesaj alıcıya ulaştı. */
export async function markDelivered(conversationId: string): Promise<void> {
  const client = db()
  await client
    .from('chat_messages')
    .update({ delivered_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('delivered_at', null)
}

/** Okundu ✓: sohbetin tüm mesajları okundu. */
export async function markRead(conversationId: string): Promise<void> {
  const client = db()
  await client
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('read_at', null)
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
