import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  isValidPermission,
  isValidRole,
  ROLE_PRESETS,
} from '@/lib/permissions'
import { isAdminUser } from '@/lib/supabase/session'

export const dynamic = 'force-dynamic'

export interface UserLimits {
  fileMaxMb?: number | null
  dailyMessages?: number | null
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
  permissions: string[]
  limits: UserLimits
  createdAt: string | null
  lastSignIn: string | null
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key)
    return null
  return createSupabaseAdmin(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(25_000) }),
    },
  })
}

/** Owner protection: role/permission/limit/delete changes on the site owner are forbidden. */
function ownerBlocked(isOwner: boolean): NextResponse | null {
  if (isOwner) {
    return NextResponse.json(
      { success: false, message: 'Site sahibi hesabı değiştirilemez.' },
      { status: 403 },
    )
  }
  return null
}

// GET /api/admin/users → all account owners (auth.users + profiles join)
export async function GET() {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }
  const supabase = adminClient()
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: 'Supabase ayarlı değil.' },
      { status: 500 },
    )
  }
  const [authRes, profileRes] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role, roles, permissions, limits, is_owner'),
  ])
  if (authRes.error) {
    return NextResponse.json(
      { success: false, message: authRes.error.message },
      { status: 500 },
    )
  }
  const profiles = new Map(
    (profileRes.data ?? []).map(p => [
      p.id,
      {
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        roles: Array.isArray(p.roles) ? (p.roles as string[]) : [],
        permissions: Array.isArray(p.permissions) ? (p.permissions as string[]) : [],
        limits: (p.limits ?? {}) as UserLimits,
        isOwner: Boolean(p.is_owner),
      },
    ]),
  )
  const users: AdminUserRow[] = (authRes.data.users ?? []).map((u) => {
    const prof = profiles.get(u.id)
    return {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      username: prof?.username ?? u.user_metadata?.username ?? null,
      fullName: prof?.fullName ?? null,
      avatarUrl: prof?.avatarUrl ?? null,
      role: prof?.role === 'admin' ? 'admin' : 'user',
      isOwner: prof?.isOwner ?? false,
      roles: prof?.roles ?? [],
      permissions: prof?.permissions ?? [],
      limits: prof?.limits ?? {},
      createdAt: u.created_at ?? null,
      lastSignIn: u.last_sign_in_at ?? null,
    }
  })
  return NextResponse.json({ success: true, users })
}

/**
 * POST /api/admin/users
 * action: 'setRoles' | 'setPermissions' | 'setLimits' | 'resetPassword'
 *   setRoles:       { userId, roles: string[] }            — the user's full role set (presets)
 *   setPermissions: { userId, permissions: string[] }      — individual permissions outside presets
 *   setLimits:      { userId, limits: { fileMaxMb?, dailyMessages? } }
 *   resetPassword:  { userId, password }
 * All mutations on the owner are rejected with 403.
 */
export async function POST(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }
  const supabase = adminClient()
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: 'Supabase ayarlı değil.' },
      { status: 500 },
    )
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.userId !== 'string') {
    return NextResponse.json({ success: false, message: 'Geçersiz veri.' }, { status: 400 })
  }

  // Fetch the target profile (for the is_owner check)
  const { data: target } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', body.userId)
    .maybeSingle()
  if (!target) {
    return NextResponse.json({ success: false, message: 'Kullanıcı bulunamadı.' }, { status: 404 })
  }
  const blocked = ownerBlocked(Boolean(target.is_owner))
  if (blocked)
    return blocked

  if (body.action === 'setRoles') {
    if (
      !Array.isArray(body.roles)
      || !body.roles.every((r: unknown) => typeof r === 'string' && isValidRole(r))
    ) {
      return NextResponse.json(
        { success: false, message: `Geçersiz roller. İzin verilenler: ${ROLE_PRESETS.map(r => r.id).join(', ')}` },
        { status: 400 },
      )
    }
    const roles = [...new Set(body.roles as string[])]
    // 'user' is always included as at least one role (baseline)
    const finalRoles = roles.length === 0 ? ['user'] : roles
    const { error } = await supabase
      .from('profiles')
      .update({ roles: finalRoles })
      .eq('id', body.userId)
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }
  if (body.action === 'setPermissions') {
    if (
      !Array.isArray(body.permissions)
      || !body.permissions.every((p: unknown) => typeof p === 'string' && isValidPermission(p))
    ) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz yetki.' },
        { status: 400 },
      )
    }
    const { error } = await supabase
      .from('profiles')
      .update({ permissions: [...new Set(body.permissions as string[])] })
      .eq('id', body.userId)
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }
  if (body.action === 'setLimits') {
    const limits = body.limits ?? {}
    const clean: UserLimits = {}
    if (limits.fileMaxMb !== undefined) {
      const n = Number(limits.fileMaxMb)
      if (!Number.isFinite(n) || n < 0 || n > 1024) {
        return NextResponse.json(
          { success: false, message: 'Dosya sınırı 0-1024 MB olabilir.' },
          { status: 400 },
        )
      }
      clean.fileMaxMb = n
    }
    if (limits.dailyMessages !== undefined) {
      const n = Number(limits.dailyMessages)
      if (!Number.isInteger(n) || n < 0 || n > 100000) {
        return NextResponse.json(
          { success: false, message: 'Günlük mesaj sınırı 0-100000 olabilir.' },
          { status: 400 },
        )
      }
      clean.dailyMessages = n
    }
    const { error } = await supabase
      .from('profiles')
      .update({ limits: clean })
      .eq('id', body.userId)
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }
  if (body.action === 'resetPassword') {
    if (typeof body.password !== 'string' || body.password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Yeni şifre en az 6 karakter olmalı.' },
        { status: 400 },
      )
    }
    // Note: changing the password invalidates the user's existing sessions.
    const { error } = await supabase.auth.admin.updateUserById(body.userId, {
      password: body.password,
    })
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ success: false, message: 'Bilinmeyen işlem.' }, { status: 400 })
}

// DELETE /api/admin/users?userId=... (profiles removed via FK cascade)
export async function DELETE(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }
  const supabase = adminClient()
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: 'Supabase ayarlı değil.' },
      { status: 500 },
    )
  }
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ success: false, message: 'userId gerekli.' }, { status: 400 })
  }
  const { data: target } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', userId)
    .maybeSingle()
  if (!target) {
    return NextResponse.json({ success: false, message: 'Kullanıcı bulunamadı.' }, { status: 404 })
  }
  const blocked = ownerBlocked(Boolean(target.is_owner))
  if (blocked)
    return blocked
  const { error } = await supabase.auth.admin.deleteUser(userId, true)
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
