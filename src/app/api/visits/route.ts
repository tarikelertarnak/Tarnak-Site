import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { adminDb } from '@/lib/admin/data'
import {
  dayBucket,
  isBotUA,
  isValidVisitorId,
  makeVisitorId,
  shouldTrackPath,
} from '@/lib/visits'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 5

// Basit bellek içi rate limit: ziyaretçi başına 10 saniyede en fazla 1 beacon.
const rate = new Map<string, number>()

function rateAllowed(visitorId: string): boolean {
  const now = Date.now()
  const last = rate.get(visitorId) ?? 0
  if (now - last < 10000)
    return false
  rate.set(visitorId, now)
  if (rate.size > 2000) {
    for (const [k, v] of rate) {
      if (now - v > 300000)
        rate.delete(k)
    }
  }
  return true
}

export async function POST(req: Request): Promise<Response> {
  const ua = req.headers.get('user-agent') ?? ''
  if (isBotUA(ua)) {
    return NextResponse.json({ ok: true, skipped: 'bot' })
  }

  let body: { path?: string, userId?: string }
  try {
    body = (await req.json()) ?? {}
  }
  catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const { path, userId } = body
  if (typeof path !== 'string' || !shouldTrackPath(path)) {
    return NextResponse.json({ ok: true, skipped: 'path' })
  }

  const cookieStore = await cookies()
  let visitorId = cookieStore.get('visitorId')?.value ?? ''
  if (!isValidVisitorId(visitorId)) {
    visitorId = makeVisitorId()
  }

  if (!rateAllowed(visitorId)) {
    return NextResponse.json({ ok: true, skipped: 'rate-limited' })
  }

  // Kendi ziyaretlerini sayma ayarı açıksa ve bu tarayıcı hariç tutulmuşsa,
  // kayıt yapma (ama cookie yine verilir ki kişi sonra da takip edilebilsin).
  const db = adminDb()
  let excludeSelf = false
  if (db) {
    try {
      const { data } = await db.from('app_settings').select('key, value')
      const map = Object.fromEntries(
        ((data as Array<{ key: string, value: string }>) ?? []).map(r => [r.key, r.value]),
      )
      excludeSelf = map.excludeSelf === '1' && map.excludeSelfVisitorId === visitorId
    }
    catch {
      // app_settings tablosu yoksa (migration henüz çalışmamış) — kayıt yine denenir
    }
  }

  const today = dayBucket()
  if (db && !excludeSelf) {
    try {
      // Kişi + gün başına tek satır (upsert, unique(visitor_id, day))
      await db.from('visits').upsert(
        { visitor_id: visitorId, user_id: userId ?? null, path, day: today },
        { onConflict: 'visitor_id,day' },
      )
      // Girişliyse visitorId <-> userId eşleşmesini geriye dönük kaydeder
      if (userId) {
        await db.from('visitor_links').upsert(
          { visitor_id: visitorId, user_id: userId },
          { onConflict: 'visitor_id,user_id' },
        )
      }
    }
    catch {
      // visits/visitor_links tablosu yoksa (migration henüz çalışmamış) sessiz geçilir
    }
  }

  // visitorId cookie'si: 1 yıl, httpOnly, first-party, same-site lax
  cookieStore.set('visitorId', visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 3600,
    path: '/',
  })

  return NextResponse.json({ ok: true, visitorId })
}
