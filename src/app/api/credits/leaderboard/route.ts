import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/credits/leaderboard
 *
 * Sponsor liderlik tablosu — GERCEK verilerden:
 * ad_views (completed=true) x ad_slots (sponsor, cpm) -> sponsor bazinda
 * tamamlanan izlenme sayisi + tahmini kazandirilan gelir (USD).
 *
 * Algoritma (DB join yerine iki sorgu + JS aggregate — daha guvenli,
 * cpm/slot eslesmesindeki eksik birimler istemciyi cokertmez):
 *   1. ad_slots: slug -> { sponsor, cpm }
 *   2. ad_views (completed=true): slot_slug listesi (PostgREST sayfa siniri
 *      icin sayfali okuma)
 *   3. JS'te group by sponsor: revenue = izlenmeSayisi * (cpm / 1000)
 *
 * Tablo yok / okunamadi -> { items: [] } (SAHTE/DEMO veri HICBIR ZAMAN
 * uretilmez; reklam sistemi neyse liderlik tablosu onu yansitir).
 */
export interface LeaderboardEntry {
  sponsor: string
  /** Tamamlanan reklam izlenme sayisi */
  views: number
  /** Tahmini kazandirilan gelir (USD) — count * (slot.cpm / 1000) */
  estimatedRevenue: number
}

const PAGE_SIZE = 1000
const CACHE_CONTROL = 'public, s-maxage=300'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key)
    return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  const json = (items: LeaderboardEntry[]) =>
    NextResponse.json({ items }, { headers: { 'Cache-Control': CACHE_CONTROL } })

  const db = adminClient()
  if (!db)
    return json([])

  // 1) ad_slots: slug -> { sponsor, cpm }. cpm kolonu yoksa/null ise 0
  //    kabul edilir (schema-ads.sql henuz cpm kolonu tanimlamiyor).
  const { data: slots, error: slotsError } = await db
    .from('ad_slots')
    .select('slug, sponsor, cpm')

  if (slotsError) {
    console.warn(`[credits] ad_slots okunamadi (${slotsError.code || '?'}):`, slotsError.message)
    return json([])
  }

  const slotMap = new Map<string, { sponsor: string, cpm: number }>()
  for (const row of slots ?? []) {
    const slug = String(row.slug)
    if (!slug)
      continue
    const cpm = typeof row.cpm === 'number' && Number.isFinite(row.cpm)
      ? Math.max(row.cpm, 0)
      : 0
    slotMap.set(slug, { sponsor: String(row.sponsor) || 'TARNAK', cpm })
  }

  // 2) ad_views: completed=true kayitlarin slot_slug'leri (sayfali okuma)
  const viewedSlugs: string[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from('ad_views')
      .select('slot_slug')
      .eq('completed', true)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.warn(`[credits] ad_views okunamadi (${error.code || '?'}):`, error.message)
      return json([])
    }

    const rows = data ?? []
    for (const row of rows) {
      const slug = String(row.slot_slug)
      if (slug)
        viewedSlugs.push(slug)
    }
    if (rows.length < PAGE_SIZE)
      break
  }

  // 3) JS'te group by sponsor
  const bySlug = new Map<string, number>()
  for (const slug of viewedSlugs)
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1)

  const bySponsor = new Map<string, { views: number, revenue: number }>()
  for (const [slug, count] of bySlug) {
    const slot = slotMap.get(slug)
    if (!slot)
      continue // ad_slots'ta tanimsiz slug (eski kayit) -> sponsor bilinmiyor
    const cur = bySponsor.get(slot.sponsor) ?? { views: 0, revenue: 0 }
    cur.views += count
    cur.revenue += count * (slot.cpm / 1000)
    bySponsor.set(slot.sponsor, cur)
  }

  const items: LeaderboardEntry[] = [...bySponsor.entries()]
    .filter(([, v]) => v.views > 0)
    .map(([sponsor, v]) => ({
      sponsor,
      views: v.views,
      estimatedRevenue: Math.round(v.revenue * 100) / 100,
    }))
    .sort(
      (a, b) =>
        b.estimatedRevenue - a.estimatedRevenue
        || b.views - a.views
        || a.sponsor.localeCompare(b.sponsor),
    )

  return json(items)
}