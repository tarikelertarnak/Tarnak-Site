import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { adminDb } from '@/lib/admin/data'
import { isAdminUser } from '@/lib/supabase/session'
import { dayBucket, makeVisitorId, periodRange } from '@/lib/visits'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 10

// Tekli kişi sayısı: aralık içindeki farklı visitor_id'leri sayar.
// (Kişi anahtarı = userId ise de tekilleştirme person_key tabanlıdır;
//  person_key hesabını postgrest rpc'siz yaptığımız için burada
//  visitor_id üzerinden sayarız — girişli trafiği visitor_links bağlar.)
async function distinctVisitors(from: string, to: string): Promise<number | null> {
  const db = adminDb()
  if (!db)
    return null
  try {
    const { data, error } = await db
      .from('visits')
      .select('visitor_id')
      .gte('day', from)
      .lte('day', to)
    if (error)
      return null
    const uniq = new Set(
      ((data as Array<{ visitor_id: string }> | null) ?? []).map(r => r.visitor_id),
    )
    return uniq.size
  }
  catch {
    // tablo yok — "bilinmiyor" (null)
    return null
  }
}

async function getSettings(): Promise<{ excludeSelf: boolean, excludeSelfVisitorId: string | null }> {
  const db = adminDb()
  if (!db)
    return { excludeSelf: false, excludeSelfVisitorId: null }
  try {
    const { data } = await db.from('app_settings').select('key, value')
    const map = Object.fromEntries(
      ((data as Array<{ key: string, value: string }>) ?? []).map(r => [r.key, r.value]),
    )
    return {
      excludeSelf: map.excludeSelf === '1',
      excludeSelfVisitorId: map.excludeSelfVisitorId ?? null,
    }
  }
  catch {
    return { excludeSelf: false, excludeSelfVisitorId: null }
  }
}

export async function GET(): Promise<Response> {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const p7 = periodRange('7d')
  const p30 = periodRange('30d')
  const pt = periodRange('total')
  const today = dayBucket()

  const [todayN, last7, last30, total] = await Promise.all([
    distinctVisitors(today, today),
    distinctVisitors(p7.from, p7.to),
    distinctVisitors(p30.from, p30.to),
    distinctVisitors(pt.from, pt.to),
  ])
  const settings = await getSettings()

  return NextResponse.json({
    today: todayN,
    last7,
    last30,
    total,
    ...settings,
  })
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { enable?: boolean }
  try {
    body = (await req.json()) ?? {}
  }
  catch {
    body = {}
  }
  const enable = Boolean(body.enable)

  const cookieStore = await cookies()
  let visitorId = cookieStore.get('visitorId')?.value ?? ''

  const db = adminDb()
  if (!db)
    return NextResponse.json({ error: 'db not configured' }, { status: 500 })

  try {
    if (enable) {
      if (!isValid(visitorId)) {
        visitorId = makeVisitorId()
        cookieStore.set('visitorId', visitorId, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 365 * 24 * 3600,
          path: '/',
        })
      }
      await db.from('app_settings').upsert({ key: 'excludeSelf', value: '1' })
      await db.from('app_settings').upsert({ key: 'excludeSelfVisitorId', value: visitorId })
    }
    else {
      await db.from('app_settings').upsert({ key: 'excludeSelf', value: '0' })
    }
  }
  catch {
    // app_settings tablosu yok (migration çalışmamış) — ayar kalıcı olmaz
    return NextResponse.json({ error: 'app_settings table missing — run scripts/schema-visits.sql' }, { status: 500 })
  }

  const settings = await getSettings()
  return NextResponse.json({ ok: true, ...settings })
}

function isValid(value: string): boolean {
  return /^[0-9a-f]{32}$/i.test(value)
}
