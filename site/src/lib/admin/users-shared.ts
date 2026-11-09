import type { PermissionOverrides } from '@/lib/permissions'
import {
  ALL_PERMISSION_IDS,
  normalizeOverrides,
  PERMISSION_DEFAULTS,

} from '@/lib/permissions'

export type { PermissionOverrides }

/**
 * Kullanıcı yönetiminin paylaşılan tipleri + limit modeli (API ↔ istemci).
 *
 * 2026-10-17 (kullanıcı isteği) — üç kök değişiklik:
 *  1. Yetkilerin normal kullanıcı için VARSAYILAN değerleri var
 *     (`PERMISSION_DEFAULTS`, `lib/permissions.ts`). Hepsi `false` geldiği
 *     için "Özel Yetkiler" panelinde her şey kapalı görünüyordu.
 *  2. Etkin yetki = rol + varsayılan + KULLANICIYA ÖZEL GEÇERSİZ KILMA.
 *     Eski modelde `permissions[]` yalnız ekleyebiliyordu (çıkarma yoktu);
 *     artık `{"chat.send": false}` gibi eksiltme de yapılabilir. Override'ı
 *     olmayan her şey varsayılanla gider → "Varsayılana dön" = `{}`
 *  3. Limitlerde toplam yükleme kotası (`maxTotalUploadBytes`) var; mesaj
 *     sınırı `null` = sınırsız (0 ile karıştırılmamalı — 0 her şeyi keser).
 *
 * Yetki kataloğu TEK KAYNAK: `lib/permissions.ts`. Burada yalnız DTO +
 * limit/varsayılan yardımcıları var.
 */

// ─────────────────────────────────────────────────────────────
// Yetki varsayılanları (re-export — tek kaynak `lib/permissions.ts`)
// ─────────────────────────────────────────────────────────────

export { ALL_PERMISSION_IDS, PERMISSION_DEFAULTS }

/** Varsayılanı `true` olan yetkiler (normal kullanıcı). */
export const DEFAULT_GRANTED_IDS: string[] = Object.entries(PERMISSION_DEFAULTS)
  .filter(([, on]) => on)
  .map(([id]) => id)

/** Override'ı `true`/`false` verilmiş yetki sayısı (değiştirilmemiş = 0). */
export function overrideCount(overrides: PermissionOverrides): number {
  return Object.keys(overrides).length
}

/**
 * Etkin yetki kimlikleri — sunucudaki `effectivePermissions` ile AYNI hesap,
 * ama rol preset'lerini çözmek yerine expand edilmiş kimlik listesi alınır.
 * Panelin "Özel Yetkiler" popover'ı bunu canlı önizleme için kullanır.
 */
export function effectivePermissionIds(
  rolePerms: string[],
  rawOverrides: unknown,
  roles: string[] = [],
): string[] {
  const set = new Set<string>(DEFAULT_GRANTED_IDS)
  for (const id of rolePerms) {
    if ((ALL_PERMISSION_IDS as string[]).includes(id))
      set.add(id)
  }
  for (const [id, on] of Object.entries(normalizeOverrides(rawOverrides))) {
    if (on)
      set.add(id)
    else
      set.delete(id)
  }
  // Admin rolü dokunulmaz (override bile kapatamaz).
  if (roles.includes('admin')) {
    for (const id of ALL_PERMISSION_IDS) set.add(id)
  }
  return [...set]
}

// ─────────────────────────────────────────────────────────────
// Limitler
// ─────────────────────────────────────────────────────────────

/** Normal kullanıcı için varsayılan: 1 MB toplam yükleme kotası. */
export const DEFAULT_MAX_TOTAL_UPLOAD_BYTES = 1_048_576
/** `null` = sınırsız (0 DEĞİL). */
export const DEFAULT_MAX_MESSAGES: number | null = null

export interface UserLimits {
  /** Eski alan: tek dosya boyutu sınırı (MB). Kota ile birlikte yaşar. */
  fileMaxMb?: number | null
  /** Eski alan: günlük mesaj sınırı. */
  dailyMessages?: number | null
  /** Kullanıcının yüklediği TÜM dosyaların toplamı (bayt). `null` = sınırsız. */
  maxTotalUploadBytes?: number | null
  /** Gönderilen mesaj sayısı sınırı. `null` = sınırsız. */
  maxMessages?: number | null
}

/**
 * Limitleri normalize eder; eksik/bozuk alanlar varsayilanla doldurulur.
 * `null` bilinçli "sınırsız" anlamına gelir ve KORUNUR (undefined'a çevrilmez).
 */
export function resolveLimits(raw: unknown): Required<
  Pick<UserLimits, 'maxTotalUploadBytes' | 'maxMessages'>
> & UserLimits {
  const src = (raw && typeof raw === 'object' ? raw : {}) as UserLimits
  /*
    ÜÇ FARKLI DURUM (karıştırılmamalı):
      · anahtar YOK     → varsayılan (1 MB)
      · `null`          → SINIRSIZ (admin "Sınırsız" kutusunu işaretledi)
      · sayı (0 dahil)  → o değer; 0 her şeyi keser
  */
  const maxTotalUploadBytes = src.maxTotalUploadBytes === null
    ? null
    : typeof src.maxTotalUploadBytes === 'number' && src.maxTotalUploadBytes >= 0
      ? src.maxTotalUploadBytes
      : DEFAULT_MAX_TOTAL_UPLOAD_BYTES
  const maxMessages = src.maxMessages === null
    ? null
    : typeof src.maxMessages === 'number' && src.maxMessages >= 0
      ? src.maxMessages
      : DEFAULT_MAX_MESSAGES
  return { ...src, maxTotalUploadBytes, maxMessages }
}

/** Site sahibi ve adminlerde kota yok. */
export function isUnlimited(user: { isOwner: boolean, roles: string[] } | null): boolean {
  if (!user) {
    return false
  }
  return user.isOwner || user.roles.includes('admin')
}

/** Baytı okunabilir MB'a çevirir (virgül ondalık, TR). */
export function formatMb(bytes: number): string {
  return `${(bytes / 1_048_576).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`
}

// ─────────────────────────────────────────────────────────────
// Ortak satır görünümü (API → istemci)
// ─────────────────────────────────────────────────────────────

export interface UserUsage {
  /** Silinmemiş mesajlardaki toplam dosya boyutu (bayt). */
  uploadBytes: number
  /** Yüklenmiş (dosya ekli) mesaj sayısı. */
  uploadCount: number
  /** Gönderdiği toplam mesaj sayısı. */
  messageCount: number
}

export interface AdminUserRow {
  id: string
  email: string | null
  phone: string | null
  username: string | null
  fullName: string | null
  avatarUrl: string | null
  role: 'admin' | 'user'
  isOwner: boolean
  roles: string[]
  /** ETKİN yetki kimlikleri (rol + varsayılan + override). */
  permissions: string[]
  /** Yalnız kullanıcıya özel geçersiz kılmalar (düzenlenebilir olan). */
  permissionOverrides: PermissionOverrides
  /** Override'ı olan yetki sayısı — "N özel ayar" rozeti için. */
  overrideCount: number
  limits: UserLimits
  createdAt: string | null
  lastSignIn: string | null
  /** Limit çubuğu + İncele paneli. Listede yalnızca admin görür. */
  usage?: UserUsage
  /** Yalnız İncele ucu döndürür — seçili profil kolonları (şemadan dinamik). */
  profile?: Record<string, unknown>
}

export interface InspectUserResponse {
  success: boolean
  message?: string
  user?: AdminUserRow
  /** Denetim kaydı kimliği (audit_log). Tablo yoksa `null`. */
  auditId?: number | null
}
