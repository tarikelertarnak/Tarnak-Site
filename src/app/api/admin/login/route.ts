import { NextResponse } from 'next/server'
import { createSessionToken, hashPassword, verifyCredentials } from '@/lib/auth'
import { getAdmin, saveAdmin } from '@/lib/content'

// Simple brute-force protection (in-memory): lock per IP for 15 min after 5 failed attempts
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number, lockedUntil: number }>()

/**
 * Map boyutunu sinirla. Eskiden sinirsiz buyuyordu: saldirgan her istekte
 * farkli (sahte) IP gondererek bellegi sisirebiliyordu. Cloudflare Workers'ta
 * bellek limiti 128MB — asilirsa worker duser (DoS).
 */
const MAX_TRACKED_IPS = 5000

function pruneAttempts(now: number) {
  if (attempts.size <= MAX_TRACKED_IPS)
    return
  // 1) Suresi dolmus kilitleri at
  for (const [ip, rec] of attempts) {
    if (rec.lockedUntil !== 0 && rec.lockedUntil < now)
      attempts.delete(ip)
  }
  // 2) Hala buyukse en eski kayitlardan temizle (Map ekleme sirasini korur)
  while (attempts.size > MAX_TRACKED_IPS) {
    const oldest = attempts.keys().next().value
    if (oldest === undefined)
      break
    attempts.delete(oldest)
  }
}

function getClientIp(req: Request): string {
  // Cloudflare kendi header'ini yazar; istemci bu degeri EZEMEZ.
  // x-forwarded-for'a GUVENILMEZ: Cloudflare onu SONUNA ekler, istemcinin
  // gonderdigi sahte deger BASA gelir. Eskiden ilk deger alindigi icin
  // saldirgan her istekte farkli sahte IP gonderip 5-deneme kilidini
  // tamamen atlatabiliyordu.
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf && /^\d{1,3}(\.\d{1,3}){3}$/.test(cf)) {
    return cf
  }
  // Yerel dev / CF disi ortam: XFF'in SON degeri (Cloudflare'in ekledigi).
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const last = forwarded.split(',').pop()?.trim()
    if (last && /^\d{1,3}(\.\d{1,3}){3}$/.test(last)) {
      return last
    }
  }
  return 'local'
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const now = Date.now()
  pruneAttempts(now)
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
    // secure: uretimde ZORUNLU — cookie'nin HTTP uzerinden gonderilmesini
    // engeller (ag dinleyicisi oturumu calabilirdi). Yerel dev HTTP oldugu
    // icin kosullu birakildi.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
