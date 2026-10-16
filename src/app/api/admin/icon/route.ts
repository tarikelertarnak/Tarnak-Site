import { NextResponse } from 'next/server'

import { resolveIcon } from '@/lib/icon-resolve'
import { guardWrite } from '@/lib/rate-guard'
import { isAdminUser } from '@/lib/supabase/session'

/**
 * Admin ikon çözümleyici (2026-10-16).
 *
 * Admin formundaki "İkon" alanına yapıştırılan serbest metni (görsel adresi,
 * satır içi SVG, TSX bileşeni, shadcn komutu, yerel yol) sitenin
 * göstertebileceği kanonik değere çevirir:
 *   - SVG/TSX → temizlenmiş `<svg>` işaretlemesi (XSS temizliği BURADA yapılır;
 *     kaydetme yolu ne olursa olsun siteye temizlenmemiş işaretleme girmez),
 *   - görsel adresi → indirilip gömülür (`data:`), indirilemezse orijinal
 *     adres + uyarı döner,
 *   - yerel yol / Iconify adı → biçim doğrulaması.
 *
 * POST /api/admin/icon  →  { raw, kind? }
 */
export async function POST(req: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  /* İndirme yapan bir uç nokta: vekil sunucu olarak kötüye kullanılmasın diye
     hız sınırı var (IP başına dakikada 20). */
  const denied = await guardWrite(req, 'admin-icon')
  if (denied)
    return denied

  const body = (await req.json().catch(() => null)) as { raw?: unknown, kind?: unknown } | null
  if (!body || typeof body.raw !== 'string') {
    return NextResponse.json({ success: false, message: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const kind = typeof body.kind === 'string' ? body.kind : null
  const result = await resolveIcon(body.raw, kind as never)

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
