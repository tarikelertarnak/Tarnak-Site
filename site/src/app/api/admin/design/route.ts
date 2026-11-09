import type { DesignOverride } from '@/lib/design'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getContent, saveContent } from '@/lib/content'
import { designPageSchema } from '@/lib/design-schema'
import { guardWrite } from '@/lib/rate-guard'
import { isAdminUser } from '@/lib/supabase/session'

/**
 * Görsel düzenleme kayıtlarını sayfa bazında yazar (2026-10-30).
 *
 * Neden ayrı uç: panel public sayfaların ÜZERİNDE çalışıyor; admin
 * panelinin tüm içerik state'ini taşımıyor. Yalnız kendi sayfasının
 * kayıtlarını gönderir, diğer sayfaların kayıtları DOKUNULMADAN korunur.
 *
 * Yetki: bütün `/api/admin/*` uçları gibi `isAdminUser()`; HTML/JS alanları
 * buradan geçtiği için bu uç aynı zamanda güven sınırıdır (bkz.
 * `src/lib/design-schema.ts`).
 */

export async function GET(req: Request) {
  const admin = await isAdminUser()
  if (!admin)
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })

  const page = new URL(req.url).searchParams.get('page')
  const content = await getContent()
  const all = Array.isArray(content.design) ? (content.design as DesignOverride[]) : []
  const overrides = page ? all.filter(o => o?.page === page) : all
  return NextResponse.json({ success: true, overrides })
}

export async function POST(req: Request) {
  const denied = await guardWrite(req, 'admin-design')
  if (denied)
    return denied

  const admin = await isAdminUser()
  if (!admin)
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = designPageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Geçersiz düzenleme verisi.',
        details: parsed.error.issues,
      },
      { status: 400 },
    )
  }

  const current = await getContent()
  const existing = Array.isArray(current.design)
    ? (current.design as DesignOverride[]).filter(
        o => o && typeof o === 'object' && typeof o.page === 'string',
      )
    : []

  // Aynı sayfanın eski kayıtları atılır, diğer sayfalar korunur.
  const design = [
    ...existing.filter(o => o.page !== parsed.data.page),
    ...parsed.data.overrides,
  ]

  const result = await saveContent({ ...current, design })
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.error ?? 'Kaydedilemedi.' },
      { status: 500 },
    )
  }

  revalidatePath(parsed.data.page)
  return NextResponse.json({ success: true, count: parsed.data.overrides.length })
}
