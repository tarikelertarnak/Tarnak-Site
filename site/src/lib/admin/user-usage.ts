import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserUsage } from '@/lib/admin/users-shared'

/**
 * Kullanıcı kullanımı + denetim (audit) kaydı.
 *
 * KOTA HESABI NEDEN VERİTABANINDA: disk taraması Workers'ta imkânsız ve
 * yavaş; ayrıca `messages.file_size` silinince otomatik düşer ("dosya
 * silinince kullanım düşsün" isteği). `chat_messages.sender_id` +
 * `file_size` tek kaynaktır.
 *
 * Tablo yoksa (migration çalıştırılmadı) HATA FIRLATMAZ — sıfır döner ve
 * kota kontrolü "kullanım yok" gibi davranır (yükleme engellenmez).
 */

const EMPTY: UserUsage = { uploadBytes: 0, uploadCount: 0, messageCount: 0 }

/**
 * Kullanıcının TÜM dosya yüklemelerinin toplam boyutu (bayt).
 *
 * `deleted_for_all = true` olan (herkesten silinen) mesajlar SAYILMAZ —
 * kullanıcı dosyayı sildiğinde kotası geri açılır.
 *
 * 5000 satır sınırı bilinçli: 1 MB kotalı bir kullanıcı binlerce dosya
 * yükleyemez; sınır aşılırsa kota yine dolar (daha fazla bayt).
 */
export async function getUserUsage(
  client: SupabaseClient,
  userId: string,
): Promise<UserUsage> {
  const [files, total] = await Promise.all([
    client
      .from('chat_messages')
      .select('file_size, deleted_for_all')
      .eq('sender_id', userId)
      .not('file_size', 'is', null)
      .limit(5000),
    client
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', userId),
  ])
  if (files.error || total.error) {
    // Tablo yok / RLS / şema sürüklenmesi: kota hesaplanamıyor → sınırsız
    // gibi davran ama uygulamayı ÇÖKERTME.
    return EMPTY
  }
  const rows = (files.data ?? []) as { file_size: number | null, deleted_for_all: boolean }[]
  let uploadBytes = 0
  let uploadCount = 0
  for (const r of rows) {
    if (r.deleted_for_all) {
      continue
    }
    uploadBytes += Number(r.file_size ?? 0)
    uploadCount += 1
  }
  return {
    uploadBytes,
    uploadCount,
    messageCount: total.count ?? 0,
  }
}

export interface AuditEntry {
  actorId: string
  actorName: string | null
  /** `inspect` | `updateProfile` | `setRoles` … */
  action: string
  targetId: string
  targetLabel: string | null
  meta?: Record<string, unknown>
}

/**
 * Denetim kaydı yazar. `audit_log` tablosu yoksa sessizce `null` döner —
 * denetim YAZIMI asla ana işlemi bozmaz (güvenlik açısından tercih edilir:
 * işlem yapılır, kayıt düşemezse log'a yazılır).
 *
 * Tablo: `supabase/users-permissions.sql`.
 */
export async function recordAudit(
  client: SupabaseClient,
  entry: AuditEntry,
): Promise<number | null> {
  try {
    const { data, error } = await client
      .from('audit_log')
      .insert({
        actor_id: entry.actorId,
        actor_name: entry.actorName,
        action: entry.action,
        target_id: entry.targetId,
        target_label: entry.targetLabel,
        meta: entry.meta ?? {},
      })
      .select('id')
      .single()
    if (error) {
      console.warn('[audit] kayıt yazılamadı:', error.code, error.message)
      return null
    }
    return (data?.id as number) ?? null
  }
  catch (err) {
    console.warn('[audit] kayıt yazılamadı:', err)
    return null
  }
}
