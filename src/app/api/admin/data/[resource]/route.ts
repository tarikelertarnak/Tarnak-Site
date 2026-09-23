import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { adminDb, buildPayload, missingColumnFrom, writeWithColumnFallback } from '@/lib/admin/data'
import { getResource, resolveFilters } from '@/lib/admin/resources'
import { isAdminUser } from '@/lib/supabase/session'

/**
 * Genel admin veri API'si — LISTELE + OLUSTUR
 *
 *   GET  /api/admin/data/<resource>?q=&page=&perPage=&sort=&dir=
 *   POST /api/admin/data/<resource>            (govde: alanlar)
 *
 * Tablo ve kolon adlari `src/lib/admin/resources.ts` kayit defterinden gelir,
 * istekten DEGIL. Istekteki fazla alanlar yok sayilir (whitelist).
 */

const DEFAULT_PER_PAGE = 25
const MAX_PER_PAGE = 100
/**
 * CSV disa aktarma icin ust sinir. Sinirsiz birakmak tehlikeli: tek istekle
 * milyonlarca satir cekmek worker'i bellekten dusurebilir (Cloudflare 128MB).
 * Asilirsa yanit `truncated: true` doner ve arayuz kullaniciyi uyarir.
 */
const EXPORT_MAX_ROWS = 5000

function unauthorized() {
  return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
}

/** ISR onbellegini temizle — Cloudflare Workers'ta no-op. */
function invalidate() {
  try {
    revalidatePath('/', 'layout')
  }
  catch {
    /* Workers: no-op */
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  if (!(await isAdminUser())) {
    return unauthorized()
  }

  const { resource: key } = await params
  const resource = getResource(key)
  if (!resource) {
    return NextResponse.json({ success: false, message: 'Bilinmeyen kaynak.' }, { status: 404 })
  }

  const db = adminDb()
  if (!db) {
    return NextResponse.json(
      { success: false, message: 'Supabase yapılandırılmamış (service_role eksik).' },
      { status: 500 },
    )
  }

  const url = new URL(req.url)
  const search = (url.searchParams.get('q') || '').trim()
  // all=1 → CSV disa aktarma: sayfalama yerine tek seferde ust sinira kadar.
  const wantsAll = url.searchParams.get('all') === '1'
  const page = wantsAll ? 1 : Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = wantsAll
    ? EXPORT_MAX_ROWS
    : Math.min(
        MAX_PER_PAGE,
        Math.max(5, Number(url.searchParams.get('perPage')) || DEFAULT_PER_PAGE),
      )
  const sortParam = url.searchParams.get('sort') || ''
  const dirParam = url.searchParams.get('dir')

  // PostgREST filtre sozdizimini bozabilecek karakterleri temizle
  // (virgul OR ayirir, parantez/asterisk filtreyi kirar).
  const needle = search.replace(/[,()*%\\"']/g, ' ').trim()

  // Beyaz listeye alinmis filtreler (kolon adi ISTEKTEN gelmez).
  const filters = resolveFilters(resource, url.searchParams)

  // Kolon listesi degistirilebilir: semada OLMAYAN bir kolon yuzunden
  // liste tamamen cokmesin diye eksik kolonu dusup tekrar deniyoruz.
  // Neden gerekli: `messages.phone` gercekten yoktu ve mesaj listesi
  // 42703 ile 500 veriyordu — tek bir eksik kolon tum tabloyu kullanilamaz
  // hale getirmemeli. (Yazma tarafinda ayni koruma zaten vardi.)
  let columns: string[] = [...resource.listColumns]
  let searchColumns: string[] = [...resource.searchColumns]
  const droppedColumns: string[] = []
  // Semada olmadigi icin UYGULANAMAYAN filtreler. Sessizce yok saymak
  // "filtreledim" sanip filtresiz liste gostermek olurdu — acikca bildir.
  const ignoredFilters: string[] = []

  for (let attempt = 0; attempt < 6; attempt++) {
    if (columns.length === 0) {
      return NextResponse.json(
        { success: false, rows: [], total: 0, page, perPage, message: 'Gösterilecek geçerli kolon kalmadı.' },
        { status: 500 },
      )
    }

    // Siralama yalnizca mevcut kolonlar arasindan secilebilir.
    const sortColumn = columns.includes(sortParam)
      ? sortParam
      : columns.includes(resource.orderBy.column)
        ? resource.orderBy.column
        : columns[0]
    const ascending = dirParam ? dirParam === 'asc' : resource.orderBy.ascending

    let query = db.from(resource.table).select(columns.join(','), { count: 'exact' })

    const activeSearch = searchColumns.filter(c => columns.includes(c))
    if (needle && activeSearch.length > 0) {
      query = query.or(activeSearch.map(c => `${c}.ilike.*${needle}*`).join(','))
    }

    // Beyaz listeye alinmis filtreleri uygula. Kolon semada yoksa
    // (dusurulduyse) uygulanamaz → uydurma sonuc yerine bildir.
    for (const f of filters) {
      if (columns.includes(f.column)) {
        query = query.eq(f.column, f.value)
      }
      else if (!ignoredFilters.includes(f.column)) {
        ignoredFilters.push(f.column)
      }
    }

    const from = (page - 1) * perPage
    const { data, error, count } = await query
      .order(sortColumn, { ascending })
      .range(from, from + perPage - 1)

    if (!error) {
      const rows = data ?? []
      const total = count ?? 0
      return NextResponse.json({
        success: true,
        rows,
        total,
        page,
        perPage,
        sort: sortColumn,
        dir: ascending ? 'asc' : 'desc',
        // Disa aktarmada ust sinira takildiysak kullaniciya SOYLE —
        // sessizce eksik dosya indirmek en kotu davranis olurdu.
        truncated: wantsAll && total > rows.length,
        ignoredFilters: ignoredFilters.length > 0 ? ignoredFilters : undefined,
        droppedColumns: droppedColumns.length > 0 ? droppedColumns : undefined,
        message: ignoredFilters.length > 0
          ? `Şu filtreler uygulanamadı (kolon veritabanında yok): ${ignoredFilters.join(', ')}. Sonuçlar filtresiz olabilir.`
          : droppedColumns.length > 0
            ? `Şu kolonlar veritabanında yok, listeden çıkarıldı: ${droppedColumns.join(', ')}. Kalıcı çözüm için ilgili SQL dosyasını Supabase SQL Editor'de çalıştır.`
            : undefined,
      })
    }

    // Tablo yok / semada bulunamadi → bos liste dondur ama NEDENINI soyle.
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return NextResponse.json(
        {
          success: false,
          rows: [],
          total: 0,
          page,
          perPage,
          message: `"${resource.table}" tablosu veritabanında yok. İlgili SQL dosyasını Supabase SQL Editor'de çalıştır.`,
          missingTable: true,
        },
        { status: 200 },
      )
    }

    // Eksik kolonu dus ve tekrar dene; dusurulecek bir sey yoksa gercek hata.
    const missing = missingColumnFrom(error)
    let changed = false
    if (missing) {
      if (columns.includes(missing) && columns.length > 1) {
        console.warn(`[admin/data] ${resource.table}.${missing} kolonu yok — listeden cikarildi.`)
        columns = columns.filter(c => c !== missing)
        droppedColumns.push(missing)
        changed = true
      }
      if (searchColumns.includes(missing)) {
        searchColumns = searchColumns.filter(c => c !== missing)
        changed = true
      }
    }
    if (changed) {
      continue
    }

    console.error(`[admin/data] liste basarisiz (${resource.table}):`, error.code, error.message)
    return NextResponse.json(
      {
        success: false,
        rows: [],
        total: 0,
        page,
        perPage,
        message: `${error.code || ''} ${error.message}`.trim(),
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { success: false, rows: [], total: 0, page, perPage, message: 'Liste denemesi başarısız oldu.' },
    { status: 500 },
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  if (!(await isAdminUser())) {
    return unauthorized()
  }

  const { resource: key } = await params
  const resource = getResource(key)
  if (!resource) {
    return NextResponse.json({ success: false, message: 'Bilinmeyen kaynak.' }, { status: 404 })
  }
  if (resource.readOnly) {
    return NextResponse.json({ success: false, message: 'Bu kaynak salt okunur.' }, { status: 403 })
  }
  if (resource.singleton) {
    return NextResponse.json(
      { success: false, message: 'Tek satırlık kaynakta yeni kayıt oluşturulamaz, mevcut satırı düzenle.' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const built = buildPayload(resource, body as Record<string, unknown>, false)
  if (!built.ok) {
    return NextResponse.json({ success: false, message: built.error }, { status: 400 })
  }

  const result = await writeWithColumnFallback(resource.table, built.payload, 'insert')
  if (!result.ok) {
    const duplicate = result.error?.includes('23505')
    return NextResponse.json(
      {
        success: false,
        message: duplicate
          ? 'Bu kayıt zaten var (slug veya benzersiz alan çakıştı).'
          : result.error,
        droppedColumns: result.droppedColumns,
      },
      { status: duplicate ? 409 : 500 },
    )
  }

  invalidate()

  return NextResponse.json({
    success: true,
    row: result.data,
    droppedColumns: result.droppedColumns,
    message: result.droppedColumns?.length
      ? `Kaydedildi. Şu alanlar veritabanında olmadığı için atlandı: ${result.droppedColumns.join(', ')}`
      : 'Kayıt oluşturuldu.',
  })
}
