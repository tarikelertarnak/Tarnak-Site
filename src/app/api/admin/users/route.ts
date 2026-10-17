import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminUserRow,
  PermissionOverrides,
  UserLimits,
} from '@/lib/admin/users-shared'
import type { SessionUser } from '@/lib/supabase/session'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { writeWithColumnFallback } from '@/lib/admin/data'
import { getUserUsage, recordAudit } from '@/lib/admin/user-usage'
import { resolveLimits } from '@/lib/admin/users-shared'
import {
  effectivePermissions,
  isValidPermission,
  isValidRole,
  normalizeOverrides,
  ROLE_PRESETS,
} from '@/lib/permissions'
import { E164_MAX_DIGITS, normalizePhone } from '@/lib/phone'
import { guardWrite } from '@/lib/rate-guard'
import { getSessionUser } from '@/lib/supabase/session'

export const dynamic = 'force-dynamic'

/**
 * Kullanıcı yönetimi API'si.
 *
 *   GET  /api/admin/users                 → satır listesi (yetkiler/limitler)
 *   GET  /api/admin/users?usage=<id>      → kota çubuğu için kullanım
 *   GET  /api/admin/users?inspect=<id>    → İNCELE (yalnız Site Sahibi, denetime yazılır)
 *   POST /api/admin/users                 → action: setRoles | setPermissions |
 *                                            setLimits | resetPassword | updateProfile
 *   DELETE /api/admin/users?userId=<id>
 *
 * GÜVENLİK (2026-10-17 — kullanıcı isteği):
 *   · Tüm yanıtlar `Cache-Control: no-store` — kullanıcı verisi önbelleğe girmez.
 *   · İncele yalnız `isOwnerSession` içindir; admin dahi 403 alır.
 *   · Site Sahibi hesabı üzerinde rol/yetki/limit/admin-yap/sil işlemleri
 *     HERKESE (sahibin kendisi dahil) 403; yalnız kendi şifresini
 *     sıfırlayabilir ve kendi profilini düzenleyebilir.
 *   · Kendini silme engeli sunucuda da var (arayüz yetmez).
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) {
    return null
  }
  return createSupabaseAdmin(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(25_000) }),
    },
  })
}

/**
 * "Site Sahibi" oturumu.
 *
 * `admin_session` (`/login`, admin.json + ADmin_SECRET) hesabının `profiles`
 * satırı yok — sahiplik kanıtı taşımıyor ama SAHİBİN KENDİ ana anahtarıdır
 * (tek kişilik, paylaşılmayan). Bu yüzden sahip eşdeğeri sayılır; aksi hâlde
 * `/login` ile giren sahip İncele'yi hiç kullanamazdı. Supabase admin
 * kullanıcıları (`is_owner = false`) bu kapsama GİRMEZ.
 */
function isOwnerSession(user: SessionUser | null): boolean {
  if (!user) {
    return false
  }
  return user.isOwner || user.id.startsWith('admin:')
}

/** Arayüzsüz bir kişi kendi satırında mı? */
function isSelf(user: SessionUser | null, targetId: string): boolean {
  return !!user && user.id === targetId
}

interface ProfileRow {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'user' | null
  roles: string[] | null
  permissions: string[] | null
  limits: UserLimits | null
  is_owner: boolean | null
  permission_overrides?: unknown
}

const PROFILE_COLUMNS
  = 'id, username, full_name, avatar_url, role, roles, permissions, limits, is_owner'

/**
 * `permission_overrides` kolonu migration ile gelir
 * (`supabase/users-permissions.sql`); yoksa kolonsuz liste ile tekrar denenir.
 */
async function loadProfileRows(
  supabase: SupabaseClient,
): Promise<{ rows: ProfileRow[], hasOverridesColumn: boolean }> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_COLUMNS}, permission_overrides`)
  if (!error) {
    return { rows: (data ?? []) as ProfileRow[], hasOverridesColumn: true }
  }
  const retry = await supabase.from('profiles').select(PROFILE_COLUMNS)
  return { rows: (retry.data ?? []) as ProfileRow[], hasOverridesColumn: false }
}

/**
 * Etkin override haritası: eski `permissions[]` (yalnız `true` ekleyebilirdi)
 * ile yeni `permission_overrides` birleşir; açık `false` kazanır.
 */
function overridesOf(row: ProfileRow): PermissionOverrides {
  return {
    ...normalizeOverrides(row.permissions),
    ...normalizeOverrides(row.permission_overrides),
  }
}

function rowFrom(u: {
  id: string
  email?: string | null
  phone?: string | null
  created_at?: string
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown> | null
}, prof: ProfileRow | undefined): AdminUserRow {
  const roles = prof?.roles ?? []
  const overrides = prof ? overridesOf(prof) : {}
  return {
    id: u.id,
    email: u.email ?? null,
    phone: u.phone ?? null,
    username: prof?.username ?? (u.user_metadata?.username as string) ?? null,
    fullName: prof?.full_name ?? null,
    avatarUrl: prof?.avatar_url ?? null,
    role: prof?.role === 'admin' ? 'admin' : 'user',
    isOwner: Boolean(prof?.is_owner),
    roles,
    permissions: effectivePermissions(roles, prof?.permissions ?? [], overrides),
    permissionOverrides: overrides,
    overrideCount: Object.keys(overrides).length,
    limits: resolveLimits(prof?.limits),
    createdAt: u.created_at ?? null,
    lastSignIn: u.last_sign_in_at ?? null,
  }
}

// ─────────────────────────────────────────────────────────────
// GET — liste / kullanım / İncele
// ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const requester = await getSessionUser()
  if (!requester || requester.role !== 'admin') {
    return json({ success: false, message: 'Yetkisiz.' }, 401)
  }
  const supabase = adminClient()
  if (!supabase) {
    return json({ success: false, message: 'Supabase ayarlı değil.' }, 500)
  }

  const params = new URL(req.url).searchParams
  const inspectId = params.get('inspect')
  if (inspectId) {
    return inspectUser(supabase, requester, inspectId)
  }
  const usageId = params.get('usage')
  if (usageId) {
    const [usage, single] = await Promise.all([
      getUserUsage(supabase, usageId),
      supabase
        .from('profiles')
        .select('limits, is_owner, roles')
        .eq('id', usageId)
        .maybeSingle(),
    ])
    const roles = (single.data?.roles ?? []) as string[]
    return json({
      success: true,
      usage,
      limits: resolveLimits(single.data?.limits),
      unlimited: Boolean(single.data?.is_owner) || roles.includes('admin'),
    })
  }
  const editId = params.get('edit')
  if (editId) {
    const editable = await editableUser(supabase, editId)
    if (!editable) {
      return json({ success: false, message: 'Kullanıcı bulunamadı.' }, 404)
    }
    return json({ success: true, editable })
  }

  const [authRes, profileRows] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    loadProfileRows(supabase),
  ])
  if (authRes.error) {
    return json({ success: false, message: authRes.error.message }, 500)
  }
  const byId = new Map(profileRows.rows.map(p => [p.id, p]))
  const users: AdminUserRow[] = (authRes.data.users ?? []).map(u =>
    rowFrom(u, byId.get(u.id)),
  )
  return json({ success: true, users })
}

/** Gizli/kimlik kolonları İncele panelinde GÖSTERİLMEZ (şifre, anahtar, token). */
const SECRET_COLUMN = /secret|password|passwd|token|salt|hash|encrypted|key/i

function sanitizeProfile(row: Record<string, unknown> | null): Record<string, unknown> | undefined {
  if (!row) {
    return undefined
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (!SECRET_COLUMN.test(k)) {
      out[k] = v
    }
  }
  return out
}

/**
 * Düzenleme formunun okuyacağı alanlar (`?edit=`). Liste yalnız temel
 * kolonları taşır; meslek/iletişim/konum `user_metadata`'da durur ve
 * `profiles.bio` yalnız detayda okunur. Her admin erişebilir (İncele değil).
 */
async function editableUser(supabase: SupabaseClient, targetId: string) {
  const [authRes, profRes] = await Promise.all([
    supabase.auth.admin.getUserById(targetId),
    supabase
      .from('profiles')
      .select('username, full_name, avatar_url, bio')
      .eq('id', targetId)
      .maybeSingle(),
  ])
  if (authRes.error || !authRes.data?.user) {
    return null
  }
  const u = authRes.data.user
  const m = (u.user_metadata ?? {}) as Record<string, string>
  const p = (profRes.data ?? {}) as {
    username?: string | null
    full_name?: string | null
    avatar_url?: string | null
    bio?: string | null
  }
  return {
    id: u.id,
    email: u.email ?? '',
    phone: m.phone ?? u.phone ?? '',
    fullName: p.full_name ?? m.full_name ?? '',
    username: p.username ?? m.username ?? '',
    avatarUrl: p.avatar_url ?? m.avatar_url ?? '',
    bio: p.bio ?? '',
    occupation: m.occupation ?? '',
    occupationOther: m.occupationOther ?? '',
    contactEmail: m.contactEmail ?? '',
    location: m.location ?? '',
    discord: m.discord ?? '',
  }
}

async function inspectUser(
  supabase: SupabaseClient,
  requester: SessionUser,
  targetId: string,
) {
  if (!isOwnerSession(requester)) {
    return json(
      { success: false, message: 'İnceleme yalnızca Site Sahibi içindir.' },
      403,
    )
  }
  const { data: authData, error } = await supabase.auth.admin.getUserById(targetId)
  if (error || !authData?.user) {
    return json({ success: false, message: 'Kullanıcı bulunamadı.' }, 404)
  }
  const u = authData.user

  // profiles: TÜM kolonlar (şemadan dinamik) — gizli kolonlar süzülür.
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .maybeSingle()
  const profile = sanitizeProfile(rawProfile as Record<string, unknown> | null)

  const [usage, single] = await Promise.all([
    getUserUsage(supabase, targetId),
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', targetId).maybeSingle(),
  ])

  const auditId = await recordAudit(supabase, {
    actorId: requester.id,
    actorName: requester.username ?? requester.email,
    action: 'inspect',
    targetId,
    targetLabel: (profile?.username as string) ?? u.email ?? null,
  })

  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  return json({
    success: true,
    auditId,
    user: {
      ...rowFrom(u, (single.data ?? undefined) as ProfileRow | undefined),
      usage,
      profile,
      // Supabase auth tarafı (şifre ASLA gönderilmez — hash'li, API dışa vermez).
      auth: {
        id: u.id,
        email: u.email ?? null,
        phone: u.phone ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        emailConfirmedAt: u.email_confirmed_at ?? null,
        confirmedAt: u.confirmed_at ?? null,
        updatedAt: u.updated_at ?? null,
        identities: (u.identities ?? []).map(i => i.provider),
        metadata: meta,
      },
      password: {
        stored: 'hashed',
        updatedAt: u.updated_at ?? null,
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────
// POST — yönetim işlemleri
// ─────────────────────────────────────────────────────────────

const PROFILE_METADATA_FIELDS = [
  'fullName',
  'occupation',
  'occupationOther',
  'contactEmail',
  'location',
  'discord',
] as const

const METADATA_MAX: Record<string, number> = {
  fullName: 100,
  occupation: 60,
  occupationOther: 60,
  contactEmail: 200,
  location: 300,
  discord: 300,
}

export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına admin-users dakikada 20 yazma.
   * Pahalı işlemden (Supabase INSERT / dosya yazımı) ÖNCE kontrol edilir. */
  const denied = await guardWrite(req, 'admin-users')
  if (denied) {
    return denied
  }
  const requester = await getSessionUser()
  if (!requester || requester.role !== 'admin') {
    return json({ success: false, message: 'Yetkisiz.' }, 401)
  }
  const supabase = adminClient()
  if (!supabase) {
    return json({ success: false, message: 'Supabase ayarlı değil.' }, 500)
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.userId !== 'string') {
    return json({ success: false, message: 'Geçersiz veri.' }, 400)
  }

  const targetId = body.userId
  const { data: target } = await supabase
    .from('profiles')
    .select('is_owner, username')
    .eq('id', targetId)
    .maybeSingle()
  if (!target) {
    return json({ success: false, message: 'Kullanıcı bulunamadı.' }, 404)
  }
  const targetIsOwner = Boolean(target.is_owner)

  /*
    SİTE SAHİBİ KORUMASI: sahibin rolü/yetkisi/limiti/durumu HİÇBİR yoldan
    değiştirilemez — sahibin kendisi de yapamaz ("kendini silemesin, yetkisini
    düşüremesin"). Yalnız `resetPassword` ve `updateProfile` istisnadır ve
    ikisi de yalnız sahip oturumuyla çalışır.
  */
  const ownerEditable = body.action === 'resetPassword' || body.action === 'updateProfile'
  if (targetIsOwner && (!isOwnerSession(requester) || !ownerEditable)) {
    return json(
      { success: false, message: 'Site Sahibi hesabı değiştirilemez.' },
      403,
    )
  }

  // Kendi hesabını adminlikten çıkarma / silme engeli (sunucuda da)
  if (isSelf(requester, targetId) && body.action === 'setRoles') {
    const roles = Array.isArray(body.roles) ? (body.roles as string[]) : []
    if (!roles.includes('admin')) {
      return json(
        { success: false, message: 'Kendi adminliğini kaldıramazsın.' },
        403,
      )
    }
  }

  switch (body.action) {
    case 'setRoles':
      return setRoles(supabase, requester, targetId, body)
    case 'setPermissions':
      return setPermissions(supabase, requester, targetId, body)
    case 'setLimits':
      return setLimits(supabase, requester, targetId, body)
    case 'resetPassword':
      return resetPassword(supabase, requester, targetId, body)
    case 'updateProfile':
      return updateProfile(supabase, requester, targetId, body, targetIsOwner)
    default:
      return json({ success: false, message: 'Bilinmeyen işlem.' }, 400)
  }
}

async function setRoles(
  supabase: SupabaseClient,
  requester: SessionUser,
  targetId: string,
  body: Record<string, unknown>,
) {
  if (
    !Array.isArray(body.roles)
    || !body.roles.every((r: unknown) => typeof r === 'string' && isValidRole(r))
  ) {
    return json(
      {
        success: false,
        message: `Geçersiz roller. İzin verilenler: ${ROLE_PRESETS.map(r => r.id).join(', ')}`,
      },
      400,
    )
  }
  const roles = [...new Set(body.roles as string[])]
  // 'user' her zaman taban rol olarak kalır.
  const finalRoles = roles.length === 0 ? ['user'] : roles
  const { error } = await supabase
    .from('profiles')
    .update({ roles: finalRoles })
    .eq('id', targetId)
  if (error) {
    return json({ success: false, message: error.message }, 500)
  }
  await audit(supabase, requester, 'setRoles', targetId, { roles: finalRoles })
  return json({ success: true })
}

/**
 * Yetki override'ları yazılır. Girdi iki biçimde kabul edilir:
 *   · `overrides: { 'files.upload': false }`  (yeni, tercih edilen)
 *   · `permissions: ['files.upload']`         (eski → `{id:true}`)
 *
 * Eski `permissions` text[] kolonu, başka okuyucular bozulmasın diye
 * `true` override'ların yansıması olarak SENKRON tutulur.
 */
async function setPermissions(
  supabase: SupabaseClient,
  requester: SessionUser,
  targetId: string,
  body: Record<string, unknown>,
) {
  let overrides: PermissionOverrides
  if (body.overrides && typeof body.overrides === 'object') {
    const raw = body.overrides as Record<string, unknown>
    if (!Object.keys(raw).every(isValidPermission)) {
      return json({ success: false, message: 'Geçersiz yetki.' }, 400)
    }
    overrides = normalizeOverrides(raw)
  }
  else if (Array.isArray(body.permissions)) {
    if (!body.permissions.every((p: unknown) => typeof p === 'string' && isValidPermission(p))) {
      return json({ success: false, message: 'Geçersiz yetki.' }, 400)
    }
    overrides = Object.fromEntries((body.permissions as string[]).map(id => [id, true]))
  }
  else {
    return json({ success: false, message: 'Yetki listesi gerekli.' }, 400)
  }

  const granted = Object.entries(overrides)
    .filter(([, on]) => on)
    .map(([id]) => id)

  const result = await writeWithColumnFallback(
    'profiles',
    { permission_overrides: overrides, permissions: granted },
    'update',
    { column: 'id', value: targetId },
  )
  if (!result.ok) {
    return json({ success: false, message: result.error }, 500)
  }
  await audit(supabase, requester, 'setPermissions', targetId, { overrides })
  return json({ success: true, droppedColumns: result.droppedColumns })
}

async function setLimits(
  supabase: SupabaseClient,
  requester: SessionUser,
  targetId: string,
  body: Record<string, unknown>,
) {
  const incoming = (body.limits ?? {}) as UserLimits
  // Mevcut limitlerle BİRLEŞTİR — verilmeyen alanlar korunur.
  const { data: current } = await supabase
    .from('profiles')
    .select('limits')
    .eq('id', targetId)
    .maybeSingle()
  const merged: UserLimits = { ...((current?.limits ?? {}) as UserLimits) }

  // `null` = sınırsız (bilinçli); `undefined` = "değiştirme".
  if (incoming.maxTotalUploadBytes !== undefined) {
    if (incoming.maxTotalUploadBytes === null) {
      merged.maxTotalUploadBytes = null
    }
    else {
      const n = Number(incoming.maxTotalUploadBytes)
      if (!Number.isInteger(n) || n < 0 || n > 1_073_741_824) {
        return json(
          { success: false, message: 'Toplam yükleme kotası 0-1024 MB olabilir.' },
          400,
        )
      }
      merged.maxTotalUploadBytes = n
    }
  }
  if (incoming.maxMessages !== undefined) {
    if (incoming.maxMessages === null) {
      merged.maxMessages = null
    }
    else {
      const n = Number(incoming.maxMessages)
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
        return json(
          { success: false, message: 'Mesaj sınırı 0-1000000 olabilir.' },
          400,
        )
      }
      merged.maxMessages = n
    }
  }
  if (incoming.fileMaxMb !== undefined) {
    const n = Number(incoming.fileMaxMb)
    if (!Number.isFinite(n) || n < 0 || n > 1024) {
      return json({ success: false, message: 'Dosya sınırı 0-1024 MB olabilir.' }, 400)
    }
    merged.fileMaxMb = n
  }
  if (incoming.dailyMessages !== undefined) {
    const n = Number(incoming.dailyMessages)
    if (!Number.isInteger(n) || n < 0 || n > 100_000) {
      return json({ success: false, message: 'Günlük mesaj sınırı 0-100000 olabilir.' }, 400)
    }
    merged.dailyMessages = n
  }

  const { error } = await supabase
    .from('profiles')
    .update({ limits: merged })
    .eq('id', targetId)
  if (error) {
    return json({ success: false, message: error.message }, 500)
  }
  await audit(supabase, requester, 'setLimits', targetId, { limits: merged })
  return json({ success: true })
}

async function resetPassword(
  supabase: SupabaseClient,
  requester: SessionUser,
  targetId: string,
  body: Record<string, unknown>,
) {
  if (typeof body.password !== 'string' || body.password.length < 6) {
    return json(
      { success: false, message: 'Yeni şifre en az 6 karakter olmalı.' },
      400,
    )
  }
  // Not: şifre değişimi kullanıcının mevcut oturumlarını geçersiz kılar.
  const { error } = await supabase.auth.admin.updateUserById(targetId, {
    password: body.password,
  })
  if (error) {
    return json({ success: false, message: error.message }, 500)
  }
  await audit(supabase, requester, 'resetPassword', targetId, {})
  return json({ success: true })
}

/**
 * Profil düzenleme (paneldeki "Düzenle"). Alanlar hem `profiles` hem de
 * Supabase `user_metadata`'ya yazılır — `getSessionUser` ikisini birlikte
 * okur. Doğrulama alan bazında döner (`fieldErrors`) ki arayüz hatayı
 * ilgili alanın altında gösterebilsin.
 */
async function updateProfile(
  supabase: SupabaseClient,
  requester: SessionUser,
  targetId: string,
  body: Record<string, unknown>,
  targetIsOwner: boolean,
) {
  const canEdit
    = isOwnerSession(requester)
      || isSelf(requester, targetId)
      || !targetIsOwner
  if (!canEdit) {
    return json({ success: false, message: 'Bu profili düzenleyemezsin.' }, 403)
  }

  const fieldErrors: Record<string, string> = {}
  const text = (key: string, max: number): string | undefined => {
    const v = body[key]
    if (typeof v !== 'string') {
      return undefined
    }
    return v.trim().slice(0, max)
  }

  const fullName = text('fullName', 100)
  const username = text('username', 50)
  const email = text('email', 200)
  const bio = text('bio', 2000)
  const avatarUrl = text('avatarUrl', 500)
  const phone = text('phone', 16)

  if (username !== undefined && username.length > 0) {
    if (!/^[\w.-]{3,50}$/.test(username)) {
      fieldErrors.username = 'Kullanıcı adı 3-50 karakter; harf, rakam, nokta, tire, alt çizgi.'
    }
    else {
      const { data: sameName } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', targetId)
        .limit(1)
      if ((sameName?.length ?? 0) > 0) {
        fieldErrors.username = 'Bu kullanıcı adı başkası tarafından kullanılıyor.'
      }
    }
  }
  if (email !== undefined && email.length > 0 && !/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = 'Geçerli bir e-posta yaz.'
  }
  if (phone !== undefined && phone.length > 0) {
    const check = normalizePhone(phone)
    if (!check.ok) {
      fieldErrors.phone = check.verdict === 'invalid'
        ? 'Telefon yalnızca rakamlardan oluşmalı.'
        : `Telefon en fazla ${E164_MAX_DIGITS} rakam olabilir.`
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json({ success: false, message: 'Doğrulama hatası.', fieldErrors }, 400)
  }

  const { data: authData, error: authReadError } = await supabase.auth.admin.getUserById(targetId)
  if (authReadError || !authData?.user) {
    return json({ success: false, message: 'Kullanıcı bulunamadı.' }, 404)
  }
  const prevMeta = (authData.user.user_metadata ?? {}) as Record<string, unknown>

  const nextMeta: Record<string, unknown> = { ...prevMeta }
  if (fullName !== undefined) {
    nextMeta.full_name = fullName
  }
  if (username !== undefined) {
    nextMeta.username = username
  }
  if (avatarUrl !== undefined) {
    nextMeta.avatar_url = avatarUrl
  }
  if (phone !== undefined) {
    nextMeta.phone = phone ? normalizePhone(phone).value : ''
  }
  for (const key of PROFILE_METADATA_FIELDS) {
    const v = text(key, METADATA_MAX[key] ?? 200)
    if (v !== undefined) {
      nextMeta[key] = v
    }
  }

  const authPatch: Record<string, unknown> = { data: nextMeta }
  if (email !== undefined && email.length > 0 && email !== authData.user.email) {
    authPatch.email = email
  }
  const { error: authWriteError } = await supabase.auth.admin.updateUserById(
    targetId,
    authPatch,
  )
  if (authWriteError) {
    const duplicate = /already|exists|registered|unique/i.test(authWriteError.message)
    if (duplicate && authPatch.email) {
      return json(
        { success: false, message: 'Doğrulama hatası.', fieldErrors: { email: 'Bu e-posta zaten kayıtlı.' } },
        400,
      )
    }
    return json({ success: false, message: authWriteError.message }, 500)
  }

  // profiles senkron — kolon yoksa sessizce atlanır (`writeWithColumnFallback`).
  const profilePatch: Record<string, unknown> = {}
  if (fullName !== undefined) {
    profilePatch.full_name = fullName || null
  }
  if (username !== undefined) {
    profilePatch.username = username || null
  }
  if (avatarUrl !== undefined) {
    profilePatch.avatar_url = avatarUrl || null
  }
  if (bio !== undefined) {
    profilePatch.bio = bio || null
  }
  let droppedColumns: string[] | undefined
  if (Object.keys(profilePatch).length > 0) {
    const result = await writeWithColumnFallback(
      'profiles',
      profilePatch,
      'update',
      { column: 'id', value: targetId },
    )
    if (!result.ok) {
      const duplicate = /23505|duplicate|unique/i.test(result.error ?? '')
      if (duplicate) {
        return json(
          { success: false, message: 'Doğrulama hatası.', fieldErrors: { username: 'Bu kullanıcı adı zaten kayıtlı.' } },
          400,
        )
      }
      return json({ success: false, message: result.error }, 500)
    }
    droppedColumns = result.droppedColumns
  }

  await audit(supabase, requester, 'updateProfile', targetId, {
    fields: Object.keys(profilePatch),
  })
  return json({ success: true, droppedColumns })
}

async function audit(
  supabase: SupabaseClient,
  requester: SessionUser,
  action: string,
  targetId: string,
  meta: Record<string, unknown>,
) {
  await recordAudit(supabase, {
    actorId: requester.id,
    actorName: requester.username ?? requester.email,
    action,
    targetId,
    targetLabel: null,
    meta,
  })
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const denied = await guardWrite(req, 'admin-users')
  if (denied) {
    return denied
  }
  const requester = await getSessionUser()
  if (!requester || requester.role !== 'admin') {
    return json({ success: false, message: 'Yetkisiz.' }, 401)
  }
  const supabase = adminClient()
  if (!supabase) {
    return json({ success: false, message: 'Supabase ayarlı değil.' }, 500)
  }
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) {
    return json({ success: false, message: 'userId gerekli.' }, 400)
  }
  // Kendi hesabını silme engeli — arayüz yetmez, sunucu da keser.
  if (isSelf(requester, userId)) {
    return json({ success: false, message: 'Kendi hesabını silemezsin.' }, 403)
  }
  const { data: target } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', userId)
    .maybeSingle()
  if (!target) {
    return json({ success: false, message: 'Kullanıcı bulunamadı.' }, 404)
  }
  if (target.is_owner) {
    return json(
      { success: false, message: 'Site Sahibi hesabı silinemez.' },
      403,
    )
  }
  const { error } = await supabase.auth.admin.deleteUser(userId, true)
  if (error) {
    return json({ success: false, message: error.message }, 500)
  }
  await audit(supabase, requester, 'delete', userId, {})
  return json({ success: true })
}
