import type { SupabaseClient } from '@supabase/supabase-js'

import { getStats } from '@/lib/ads'
import { adminDb, missingColumnFrom } from '@/lib/admin/data'
import { RESOURCES } from '@/lib/admin/resources'
import type { PersistenceCheck } from '@/lib/persistence'
import { checkPersistence } from '@/lib/persistence'

/**
 * Admin paneli — GENEL BAKIS (veri izleme) icin sunucu tarafi toplama.
 *
 * Neden ayri dosya: route yalnizca HTTP ile ilgilensin, toplama mantigi
 * burada kalsin. Ayrica bu fonksiyonlar test edilebilir ve tekrar kullanilir.
 *
 * Iki kritik kural (ikisi de daha once gercek hata uretti):
 *  1) `head: true` ile tablo YOKKEN PostgREST hata DONDURMEZ —
 *     `error: null, count: null` gelir. `count` null ise tablo yoktur.
 *  2) SELECT listesindeki tek bir eksik kolon (ör. messages.phone) tum
 *     sorguyu 42703 ile dusurur. Bu yuzden kolonu dusurup tekrar deniyoruz.
 */

export interface TableStat {
  key: string
  label: string
  icon: string
  description: string
  count: number | null
  status: 'ok' | 'missing' | 'error'
  message?: string
}

export interface RecentRow {
  [column: string]: unknown
}

export interface AdViewRow extends RecentRow {
  id?: number
  slot_slug?: string
  completed?: boolean
  watched_seconds?: number
  created_at?: string
}

export interface OverviewData {
  generatedAt: string
  tables: TableStat[]
  messages: { total: number, unread: number }
  ads: {
    totalViews: number
    completedViews: number
    todayViews: number
    source: 'db' | 'fallback'
    recent: AdViewRow[]
  }
  recent: {
    posts: RecentRow[]
    projects: RecentRow[]
    messages: RecentRow[]
  }
  /** Diske yazabiliyor muyuz? (Vercel'de salt-okunur olabilir) */
  persistence: PersistenceCheck
  /** Kullaniciya gosterilecek "dikkat" notlari (eksik tablo/kolon vb.) */
  warnings: string[]
}

/** Tek tablonun satir sayisi. Tablo yoksa status='missing' doner (sahte 0 DEGIL). */
async function countRows(
  db: SupabaseClient,
  table: string,
  idColumn: string,
): Promise<{ count: number | null, status: TableStat['status'], message?: string }> {
  const { count, error } = await db
    .from(table)
    .select(idColumn, { count: 'exact', head: true })

  if (error) {
    const missing = error.code === 'PGRST205' || error.code === '42P01'
    return {
      count: null,
      status: missing ? 'missing' : 'error',
      message: missing
        ? 'Tablo veritabanında yok.'
        : `${error.code || ''} ${error.message}`.trim(),
    }
  }

  // ⚠️ Olculdu: tablo yokken hata gelmez, count null gelir.
  // `count ?? 0` yazsaydik "0 kayit, calisiyor" diye YALAN soylerdik.
  if (count === null) {
    return { count: null, status: 'missing', message: 'Tablo veritabanında yok.' }
  }

  return { count, status: 'ok' }
}

/** Eksik kolonu dusurup tekrar deneyen guvenli SELECT (salt okunur). */
async function safeRows(
  db: SupabaseClient,
  table: string,
  columns: string[],
  options: { orderBy?: string, ascending?: boolean, limit?: number } = {},
): Promise<{ rows: RecentRow[], dropped: string[], error?: string }> {
  let cols = [...columns]
  const dropped: string[] = []

  for (let attempt = 0; attempt < 5 && cols.length > 0; attempt++) {
    let query = db.from(table).select(cols.join(','))

    if (options.orderBy && cols.includes(options.orderBy)) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    const { data, error } = await query.limit(options.limit ?? 5)

    if (!error) {
      return { rows: (data ?? []) as unknown as RecentRow[], dropped }
    }

    const missing = missingColumnFrom(error)
    if (missing && cols.includes(missing) && cols.length > 1) {
      console.warn(`[admin/overview] ${table}.${missing} kolonu yok — sorgudan cikarildi.`)
      cols = cols.filter(c => c !== missing)
      dropped.push(missing)
      continue
    }

    return { rows: [], dropped, error: `${error.code || ''} ${error.message}`.trim() }
  }

  return { rows: [], dropped, error: 'Sorgu başarısız oldu.' }
}

export async function getOverview(): Promise<OverviewData> {
  const db = adminDb()

  // Kalicilik oz-testi Supabase'ten BAGIMSIZ — her durumda calissin.
  const persistence = await checkPersistence()

  const base: OverviewData = {
    generatedAt: new Date().toISOString(),
    tables: [],
    messages: { total: 0, unread: 0 },
    ads: { totalViews: 0, completedViews: 0, todayViews: 0, source: 'fallback', recent: [] },
    recent: { posts: [], projects: [], messages: [] },
    persistence,
    warnings: [],
  }

  if (!persistence.ok) {
    // Bu uyari listenin EN BASINDA olsun: en kritik sorun bu.
    base.warnings.push(`KALICILIK SORUNU: ${persistence.note}`)
  }

  if (!db) {
    base.warnings.push('Supabase yapılandırılmamış (SUPABASE_SERVICE_ROLE eksik).')
    return base
  }

  // --- 1) Tablo sayimlari (paralel) -----------------------------------------
  const tables: TableStat[] = await Promise.all(
    RESOURCES.map(async (r) => {
      const { count, status, message } = await countRows(db, r.table, r.idColumn)
      return {
        key: r.key,
        label: r.label,
        icon: r.icon,
        description: r.description,
        count,
        status,
        message,
      }
    }),
  )

  // --- 2) Mesajlar: toplam + okunmamis --------------------------------------
  const messageStat = tables.find(t => t.key === 'messages')
  let unread = 0
  if (messageStat?.status === 'ok') {
    const { count } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
    unread = count ?? 0
  }

  // --- 3) Reklam istatistigi (mevcut lib/ads getStats'i yeniden kullan) -----
  const adStats = await getStats()
  const adRecent = adStats.source === 'db'
    ? await safeRows(
        db,
        'ad_views',
        ['id', 'slot_slug', 'completed', 'watched_seconds', 'created_at'],
        { orderBy: 'created_at', ascending: false, limit: 8 },
      )
    : { rows: [], dropped: [] }

  // --- 4) Son kayitlar ------------------------------------------------------
  // Not: `phone` bilerek yok — kolonu olmayan tabloda sorguyu dusurmesin.
  const [recentPosts, recentProjects, recentMessages] = await Promise.all([
    safeRows(
      db,
      'posts',
      ['id', 'title', 'slug', 'published', 'created_at'],
      { orderBy: 'created_at', ascending: false, limit: 5 },
    ),
    safeRows(
      db,
      'projects',
      ['id', 'title', 'slug', 'featured', 'sort_order'],
      { orderBy: 'sort_order', ascending: true, limit: 5 },
    ),
    safeRows(
      db,
      'messages',
      ['id', 'name', 'email', 'subject', 'is_read', 'created_at'],
      { orderBy: 'created_at', ascending: false, limit: 5 },
    ),
  ])

  // --- 5) Uyarilar ----------------------------------------------------------
  // DIKKAT: `base.warnings` (kalicilik uyarisi) KORUNMALI — sifirdan dizi
  // olusturmak onu sessizce atardi.
  const warnings: string[] = [...base.warnings]
  for (const t of tables) {
    if (t.status === 'missing') {
      warnings.push(`"${t.label}" tablosu (${t.key}) veritabanında yok — ilgili SQL dosyasını Supabase SQL Editor'de çalıştır.`)
    }
    else if (t.status === 'error') {
      warnings.push(`"${t.label}" okunamadi: ${t.message}`)
    }
  }
  if (adStats.source === 'fallback') {
    warnings.push('Reklam tabloları (ad_slots / ad_views) yok — reklamlar yerleşik varsayılanlarla gösteriliyor ve izlenme sayacı kalıcı değil.')
  }
  for (const r of [recentPosts, recentProjects, recentMessages]) {
    if (r.dropped.length > 0) {
      warnings.push(`Şemada olmayan kolonlar atlandı: ${r.dropped.join(', ')}.`)
    }
  }

  return {
    generatedAt: base.generatedAt,
    tables,
    messages: { total: messageStat?.count ?? 0, unread },
    ads: {
      totalViews: adStats.totalViews,
      completedViews: adStats.completedViews,
      todayViews: adStats.todayViews,
      source: adStats.source,
      recent: adRecent.rows,
    },
    recent: {
      posts: recentPosts.rows,
      projects: recentProjects.rows,
      messages: recentMessages.rows,
    },
    persistence,
    warnings,
  }
}
