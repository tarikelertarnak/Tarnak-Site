import { NextResponse } from 'next/server'

import { adminDb } from '@/lib/admin/data'
import { isAdminUser } from '@/lib/supabase/session'
import { dayBucket, periodRange } from '@/lib/visits'

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

  return NextResponse.json({ today: todayN, last7, last30, total })
}
