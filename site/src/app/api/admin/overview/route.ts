import { NextResponse } from 'next/server'

import { getOverview } from '@/lib/admin/overview'
import { isAdminUser } from '@/lib/supabase/session'

/**
 * Admin paneli — GENEL BAKIS verisi (salt okunur).
 *
 *   GET /api/admin/overview
 *
 * `no-store`: bu bir izleme ekrani; onbellekten bayat sayi gostermesi
 * anlamsiz olur (kullanici "neden mesaj sayisi artmadi" diye sorardi).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  try {
    const data = await getOverview()
    return NextResponse.json(
      { success: true, ...data },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
  catch (error) {
    console.error('[admin/overview] toplama basarisiz:', error)
    return NextResponse.json(
      { success: false, message: 'Genel bakış verisi oluşturulamadı.' },
      { status: 500 },
    )
  }
}
