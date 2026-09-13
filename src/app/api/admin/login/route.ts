import { NextResponse } from 'next/server'
import { createSessionToken, hashPassword, verifyCredentials } from '@/lib/auth'
import { getAdmin, saveAdmin } from '@/lib/content'

// Simple brute-force protection (in-memory): lock per IP for 15 min after 5 failed attempts
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number, lockedUntil: number }>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(first)) {
      return first
    }
  }
  return 'local'
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const now = Date.now()
  const record = attempts.get(ip)

  if (record && record.lockedUntil > now) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000 / 60)
    return NextResponse.json(
      { success: false, message: `Çok fazla hatalı deneme. ${remaining} dakika sonra tekrar dene.` },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const ok = await verifyCredentials(username, password)

  if (!ok.ok) {
    const nextCount = (record?.count ?? 0) + 1
    if (nextCount >= MAX_ATTEMPTS) {
      attempts.set(ip, { count: 0, lockedUntil: now + LOCKOUT_MS })
    }
    else {
      attempts.set(ip, { count: nextCount, lockedUntil: 0 })
    }
    return NextResponse.json(
      { success: false, message: 'Kullanıcı adı veya şifre hatalı.' },
      { status: 401 },
    )
  }

  // Clear the lock on successful login + migrate the legacy SHA-256 hash to bcrypt automatically
  attempts.delete(ip)
  if (ok.needsRehash) {
    const admin = await getAdmin()
    await saveAdmin({ username: admin.username, passwordHash: await hashPassword(password) })
  }

  const token = createSessionToken(username)
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
