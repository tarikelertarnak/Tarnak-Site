import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserLimits } from '@/lib/admin/users-shared'
import { getUserUsage } from '@/lib/admin/user-usage'
import {
  formatMb,
  isUnlimited,
  resolveLimits,

} from '@/lib/admin/users-shared'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Kullanıcı kotası — SUNUCU TARAFI zorlama (2026-10-17).
 *
 * Yetkiyi arayüzde gizlemek yetmez; yükleme ve mesaj sınırı burada kesilir.
 * Varsayılanlar: 1 MB toplam yükleme, sınırsız mesaj. Site sahibi ve admin
 * kotasız. Kullanım `chat_messages` tablosundan toplanır (`user-usage.ts`).
 */

export interface UploadQuota {
  /** Site sahibi/admin → kota yok. */
  unlimited: boolean
  /** `null` = kullanıcıya özel "sınırsız" verilmiş. */
  limitBytes: number | null
  usedBytes: number
}

/** Site sahibi / admin / yerleşik admin oturumu → kota yok. */
export async function getUploadQuota(user: {
  id: string
  isOwner: boolean
  roles: string[]
}): Promise<UploadQuota> {
  if (isUnlimited(user)) {
    return { unlimited: true, limitBytes: 0, usedBytes: 0 }
  }
  try {
    const client = createAdminClient()
    const { data } = await client
      .from('profiles')
      .select('limits')
      .eq('id', user.id)
      .maybeSingle()
    const limits = resolveLimits(data?.limits)
    const usage = await getUserUsage(client, user.id)
    return {
      unlimited: false,
      limitBytes: limits.maxTotalUploadBytes,
      usedBytes: usage.uploadBytes,
    }
  }
  catch (err) {
    // shortcut: kota ALTYAPISI okunamıyorsa (env yok / DB erişilemez) yükleme
    // ENGELLENMEZ — mevcut işlevi bozmamak kota doğruluğundan önce gelir.
    // Kota gerçekten zorunlu olacaksa burada `failClosed` davranışına geç.
    console.warn('[quota] hesaplanamadı, sınırsız sayıldı:', err)
    return { unlimited: true, limitBytes: 0, usedBytes: 0 }
  }
}

/** Kota aşılıyorsa kullanıcıya gösterilecek Türkçe hata; değilse `null`. */
export function quotaError(
  quota: UploadQuota,
  incomingBytes: number,
  context: 'upload' | 'message' = 'upload',
): string | null {
  if (quota.unlimited || quota.limitBytes === null) {
    return null
  }
  if (quota.usedBytes + incomingBytes <= quota.limitBytes) {
    return null
  }
  if (context === 'message') {
    return `Mesaj gönderilemedi: ${formatMb(quota.limitBytes)} toplam yükleme kotan doldu (kullanılan ${formatMb(quota.usedBytes)}). Dosya silerek yer açabilirsin.`
  }
  return `Dosya yükleme kotası doldu (kullanılan ${formatMb(quota.usedBytes)} / ${formatMb(quota.limitBytes)}). Dosya silerek yer açabilirsin.`
}

/** Kullanıcının normalize edilmiş limitleri (mesaj sınırı için). */
export async function getUserLimits(
  client: SupabaseClient,
  userId: string,
): Promise<ReturnType<typeof resolveLimits>> {
  const { data } = await client
    .from('profiles')
    .select('limits')
    .eq('id', userId)
    .maybeSingle()
  return resolveLimits((data?.limits ?? {}) as UserLimits)
}

/**
 * Mesaj sınırı aşıldıysa kullanıcıya gösterilecek Türkçe hata; aksi hâlde
 * `null`. Varsayılan `maxMessages = null` (sınırsız) → normal kullanıcıda
 * davranış DEĞİŞMEZ; yalnızca yönetici sınır koyduğunda keser.
 * Site sahibi ve adminler sınırsızdır.
 */
export async function messageQuotaError(user: {
  id: string
  isOwner: boolean
  roles: string[]
  limits?: UserLimits
}): Promise<string | null> {
  if (isUnlimited(user)) {
    return null
  }
  const limit = resolveLimits(user.limits).maxMessages
  if (limit === null) {
    return null
  }
  try {
    const usage = await getUserUsage(createAdminClient(), user.id)
    if (usage.messageCount < limit) {
      return null
    }
    return `Mesaj sınırına ulaştın (${limit} mesaj). Yöneticiden limitini artırmasını isteyebilirsin.`
  }
  catch (err) {
    // shortcut: kullanım okunamıyorsa mesaj ENGELLENMEZ (bkz. getUploadQuota).
    console.warn('[quota] mesaj kullanımı okunamadı:', err)
    return null
  }
}
