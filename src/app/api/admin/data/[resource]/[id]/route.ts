import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { adminDb, buildPayload, writeWithColumnFallback } from '@/lib/admin/data'
import type { ResourceDef } from '@/lib/admin/resources'
import { getResource } from '@/lib/admin/resources'
import { isAdminUser } from '@/lib/supabase/session'

/**
 * Genel admin veri API'si — GUNCELLE + SIL
 *
 *   PATCH  /api/admin/data/<resource>/<id>
 *   DELETE /api/admin/data/<resource>/<id>
 */

function unauthorized() {
  return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
}

function invalidate() {
  try {
    revalidatePath('/', 'layout')
  }
  catch {
    /* Workers: no-op */
  }
}

/**
 * id dogrulama. bigint id -> number, uuid (profiles) -> string.
 * Istekten gelen ham deger ASLA dogrudan sorguya girmez.
 */
function parseId(raw: string, resource: ResourceDef): string | number | null {
  const value = decodeURIComponent(raw).trim()
  if (!value || value.length > 64) {
    return null
  }
  if (resource.idColumn === 'id' && /^\d+$/.test(value)) {
    return Number(value)
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return value
  }
  return null
}

/** Site sahibi hesabi korunur — DB trigger'i alan bazli korur ama DELETE'i korumaz. */
async function isProtectedOwner(resource: ResourceDef, id: string | number): Promise<boolean> {
  if (resource.key !== 'profiles') {
    return false
  }
  const db = adminDb()
  if (!db) {
    return true
  }
  const { data } = await db.from('profiles').select('is_owner').eq(resource.idColumn, id).maybeSingle()
  return Boolean((data as { is_owner?: boolean } | null)?.is_owner)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resource: string, id: string }> },
) {
  if (!(await isAdminUser())) {
    return unauthorized()
  }

  const { resource: key, id: rawId } = await params
  const resource = getResource(key)
  if (!resource) {
    return NextResponse.json({ success: false, message: 'Bilinmeyen kaynak.' }, { status: 404 })
  }
  if (resource.readOnly) {
    return NextResponse.json({ success: false, message: 'Bu kaynak salt okunur.' }, { status: 403 })
  }

  const id = parseId(rawId, resource)
  if (id === null) {
    return NextResponse.json({ success: false, message: 'Geçersiz kayıt kimliği.' }, { status: 400 })
  }

  if (await isProtectedOwner(resource, id)) {
    return NextResponse.json(
      { success: false, message: 'Site sahibi hesabı değiştirilemez.' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const built = buildPayload(resource, body as Record<string, unknown>, true)
  if (!built.ok) {
    return NextResponse.json({ success: false, message: built.error }, { status: 400 })
  }

  const result = await writeWithColumnFallback(
    resource.table,
    built.payload,
    'update',
    { column: resource.idColumn, value: id },
  )

  if (!result.ok) {
    const duplicate = result.error?.includes('23505')
    return NextResponse.json(
      {
        success: false,
        message: duplicate ? 'Bu değer zaten kullanılıyor (benzersiz alan çakıştı).' : result.error,
        droppedColumns: result.droppedColumns,
      },
      { status: duplicate ? 409 : 500 },
    )
  }

  if (!result.data) {
    return NextResponse.json({ success: false, message: 'Kayıt bulunamadı.' }, { status: 404 })
  }

  invalidate()

  return NextResponse.json({
    success: true,
    row: result.data,
    droppedColumns: result.droppedColumns,
    message: result.droppedColumns?.length
      ? `Güncellendi. Şu alanlar veritabanında olmadığı için atlandı: ${result.droppedColumns.join(', ')}`
      : 'Kayıt güncellendi.',
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ resource: string, id: string }> },
) {
  if (!(await isAdminUser())) {
    return unauthorized()
  }

  const { resource: key, id: rawId } = await params
  const resource = getResource(key)
  if (!resource) {
    return NextResponse.json({ success: false, message: 'Bilinmeyen kaynak.' }, { status: 404 })
  }
  if (resource.readOnly) {
    return NextResponse.json({ success: false, message: 'Bu kaynak salt okunur.' }, { status: 403 })
  }
  if (resource.singleton) {
    return NextResponse.json(
      { success: false, message: 'Tek satırlık kaynak silinemez, yalnızca düzenlenebilir.' },
      { status: 403 },
    )
  }

  const id = parseId(rawId, resource)
  if (id === null) {
    return NextResponse.json({ success: false, message: 'Geçersiz kayıt kimliği.' }, { status: 400 })
  }

  if (await isProtectedOwner(resource, id)) {
    return NextResponse.json(
      { success: false, message: 'Site sahibi hesabı silinemez.' },
      { status: 403 },
    )
  }

  const db = adminDb()
  if (!db) {
    return NextResponse.json(
      { success: false, message: 'Supabase yapılandırılmamış (service_role eksik).' },
      { status: 500 },
    )
  }

  // Silinen satiri geri dondur ki gercekten silindigini kanitlayabilelim
  // (0 satir = kayit yok → 404, sessiz "basarili" degil).
  const { data, error } = await db
    .from(resource.table)
    .delete()
    .eq(resource.idColumn, id)
    .select(resource.idColumn)

  if (error) {
    console.error(`[admin/data] delete basarisiz (${resource.table}):`, error.code, error.message)
    return NextResponse.json(
      { success: false, message: `${error.code || ''} ${error.message}`.trim() },
      { status: 500 },
    )
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ success: false, message: 'Kayıt bulunamadı.' }, { status: 404 })
  }

  invalidate()

  return NextResponse.json({ success: true, message: 'Kayıt silindi.', deleted: data.length })
}
