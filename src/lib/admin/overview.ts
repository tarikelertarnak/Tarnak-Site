import type { SupabaseClient } from '@supabase/supabase-js'

import type { PersistenceCheck } from '@/lib/persistence'
import { adminDb, missingColumnFrom } from '@/lib/admin/data'
import { RESOURCES } from '@/lib/admin/resources'
import { getContent } from '@/lib/content'
import { EXCLUDED_REPOS, fetchUserRepos } from '@/lib/github'
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
  /**
   * GitHub'dan gelen ek sayı (2026-10-21, kullanıcı: "Projeler 0 diyor ama
   * GitHub projelerini saymıyor").
   *
   * `projects` tablosu boş olabilir; sitede görünen projeler ise GitHub
   * repolarıdır (`ProjectsGrid` ikisini birleştirir). Panel yalnızca tabloyu
   * sayınca gerçek durumu YANLIŞ gösteriyordu. Bu alan veri kaynağını
   * açıkça ayırır: `count` = tablo satırı, `external` = GitHub repoları.
   */
  external?: { label: string, count: number | null, ok: boolean }
}

export interface RecentRow {
  [column: string]: unknown
}

export interface OverviewData {
  generatedAt: string
  tables: TableStat[]
  messages: { total: number, unread: number }
  recent: {
    posts: RecentRow[]
    projects: RecentRow[]
    messages: RecentRow[]
  }
  /** Diske yazabiliyor muyuz? (Vercel'de salt-okunur olabilir) */
  persistence: PersistenceCheck
  /** Kullaniciya gosterilecek "dikkat" notlari (KRITIK tablo/kolon eksikleri) */
  warnings: string[]
}

/**
 * Eksik tablo uyarisi YALNIZCA bu kaynaklar icin uretilir.
 *
 * Neden liste degil: `RESOURCES` her tabloyu (languages, cvs, ad_slots...)
 * iceriyor ve panel onlari "Veri Yonetimi" sekmesinde gosteriyor. Kullanici
 * bu tablolardan birini sordugunda (ornek `languages`) panelin yukariya
 * devam eden uyari blogu bagimsiz bir tabloyu da supheli gibi gosteriyordu.
 * Uygulama KRITIK olan bu ikisi olmadan calisir; digerleri opsiyoneldir.
 */
const CRITICAL_TABLE_KEYS = new Set(['messages', 'profiles'])

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

/**
 * Sitede gösterilen GitHub kullanıcı adı (`settings.githubUsername`).
 *
 * `getContent()` 5 dk'lık modül TTL cache'i kullanır ve Supabase merge'i
 * zaten içerir — panelde ayrı bir sorgu açmaya gerek yok. Okunamazsa `''`
 * döner ve GitHub sayımı atlanır (panel GitHub'sız da çalışır).
 */
async function readGithubUsername(): Promise<string> {
  try {
    const content = await getContent()
    return (content.settings?.githubUsername ?? '').trim()
  }
  catch (error) {
    console.warn('[admin/overview] GitHub kullanici adi okunamadi:', error)
    return ''
  }
}

export async function getOverview(): Promise<OverviewData> {
  const db = adminDb()

  // Kalicilik oz-testi Supabase'ten BAGIMSIZ — her durumda calissin.
  const persistence = await checkPersistence()

  const base: OverviewData = {
    generatedAt: new Date().toISOString(),
    tables: [],
    messages: { total: 0, unread: 0 },
    recent: { posts: [], projects: [], messages: [] },
    persistence,
    warnings: [],
  }

  if (!persistence.ok) {
    // Bu uyari listenin EN BASINDA olsun: en kritik sorun bu.
    base.warnings.push(`KALICILIK SORUNU: ${persistence.note}`)
  }

  if (!db) {
    base.warnings.push('Supabase yapılandırılmamış (service-role key eksik).')
    return base
  }

  // --- 1) Tablo sayimlari (paralel) -----------------------------------------
  // GitHub repo sayimi da paralel baslatilir — `projects` satirinda
  // gosterilecek (tablo bos olsa bile sitede gorunen projeler GitHub'dan
  // gelir). Kendi hatasi tablo sayimlarini ETKILEMEZ (ayri Promise.all).
  const githubUsername = await readGithubUsername()
  const githubPromise: Promise<number | null> = githubUsername
    ? fetchUserRepos(githubUsername)
        // Gizli depolar (`EXCLUDED_REPOS`) sayılmaz — /projects sayfasıyla
        // aynı kural, tek kaynaktan (`lib/github`).
        .then(repos => repos.filter(r => !EXCLUDED_REPOS.has(r.name)).length)
        .catch((error) => {
          console.warn('[admin/overview] GitHub repo sayimi basarisiz:', error)
          return null
        })
    : Promise.resolve(null)

  const [tables, githubRepoCount] = await Promise.all([
    Promise.all(
      RESOURCES.map(async (r): Promise<TableStat> => {
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
    ),
    githubPromise,
  ])

  // `projects` satirini zenginlestir: tablo satiri + GitHub repo sayisi.
  for (const t of tables) {
    if (t.key !== 'projects')
      continue
    t.external = {
      label: 'GitHub projeleri',
      count: githubRepoCount,
      ok: githubRepoCount !== null,
    }
  }

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

  // --- 3) Son kayitlar ------------------------------------------------------
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

  // --- 4) Uyarilar ----------------------------------------------------------
  // DIKKAT: `base.warnings` (kalicilik uyarisi) KORUNMALI — sifirdan dizi
  // olusturmak onu sessizce atardi.
  const warnings: string[] = [...base.warnings]
  for (const t of tables) {
    if (t.status === 'missing') {
      if (CRITICAL_TABLE_KEYS.has(t.key)) {
        warnings.push(`"${t.label}" tablosu (${t.key}) veritabanında yok — ilgili SQL dosyasını Supabase SQL Editor'de çalıştır.`)
      }
    }
    else if (t.status === 'error') {
      warnings.push(`"${t.label}" okunamadi: ${t.message}`)
    }
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
    recent: {
      posts: recentPosts.rows,
      projects: recentProjects.rows,
      messages: recentMessages.rows,
    },
    persistence,
    warnings,
  }
}
