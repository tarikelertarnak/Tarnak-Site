import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/auth'
import { getAdmin } from '@/lib/content'
import { effectivePermissions } from '@/lib/permissions'

export interface SessionUser {
  id: string
  email: string | null
  username: string | null
  fullName: string | null
  avatarUrl: string | null
  role: 'admin' | 'user'
  /** Roles in profile (raw). */
  roles: string[]
  /** Computed EFFECTIVE permissions (roles + individual extra permissions; admin = all). */
  permissions: string[]
}

/**
 * TEMPORARY (dev): The `dev-role` cookie selected in the Settings panel's
 * "Developer (temporary)" section switches to admin/user mode without a session.
 * After testing, the relevant block in getSessionUser + the section in
 * settings-dropdown.tsx will be removed.
 */

/**
 * Returns the user from the Supabase session (with profile).
 * Returns null if there is no session.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Priority 1: built-in admin session (/login — admin_session cookie).
  // This was previously ignored: even if a user logged in via /login and got
  // admin_session, guards didn't recognize it → users kept hitting
  // the "unauthorized access" error.
  try {
    const store = await cookies()
    const token = store.get('admin_session')?.value
    const sessionUser = verifySessionToken(token)
    if (sessionUser) {
      const admin = await getAdmin()
      if (sessionUser === admin.username) {
        return {
          id: `admin:${admin.username}`,
          email: null,
          username: admin.username,
          fullName: admin.username,
          avatarUrl: null,
          role: 'admin',
          roles: ['admin'],
          permissions: effectivePermissions(['admin']),
        }
      }
    }
  } catch {
    /* fall through to the flows below if the admin session can't be verified */
  }

  // TEMPORARY (dev): role selected in settings — to be removed later.
  try {
    const devRole = (await cookies()).get('dev-role')?.value
    if (devRole === 'admin') {
      return {
        id: 'dev-admin',
        email: 'admin@local',
        username: 'admin',
        fullName: 'Admin (dev)',
        avatarUrl: null,
        role: 'admin',
        roles: ['admin'],
        permissions: effectivePermissions(['admin']),
      }
    }
    if (devRole === 'user') {
      return {
        id: 'dev-user',
        email: 'user@local',
        username: 'user',
        fullName: 'Kullanıcı (dev)',
        avatarUrl: null,
        role: 'user',
        roles: ['user'],
        permissions: effectivePermissions(['user']),
      }
    }
  } catch {
    /* fall to the normal flow if the cookie can't be read */
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url, role, roles, permissions')
    .eq('id', user.id)
    .maybeSingle()

  const rawRoles =
    (profile?.roles as string[] | null) ??
    (profile?.role === 'admin' ? ['admin'] : profile?.role ? [profile.role] : [])
  const rawExtra = (profile?.permissions as string[] | null) ?? []

  return {
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? user.user_metadata?.username ?? user.email?.split('@')[0] ?? null,
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    role: profile?.role ?? 'user',
    roles: rawRoles,
    permissions: effectivePermissions(rawRoles, rawExtra),
  }
}

/** Returns true only for admin users. */
export async function isAdminUser(): Promise<boolean> {
  const user = await getSessionUser()
  return user?.role === 'admin'
}

/** Returns whether the session user has a specific permission. */
export function hasSessionPermission(
  user: SessionUser | null,
  permissionId: string,
): boolean {
  return !!user && user.permissions.includes(permissionId)
}

/** Display name representing the user in chat messages. */
export function sessionUserName(
  user: Pick<SessionUser, 'username' | 'email'> | null,
): string | null {
  if (!user) {
    return null
  }
  return user.username?.trim() || user.email?.split('@')[0]?.trim() || null
}

/** For pages requiring login: redirects to /login?next=... when there's no session. */
export async function requireUser(next = '/chat'): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  // redirect() always throws; this line is only reached when there is a session
  return user!
}