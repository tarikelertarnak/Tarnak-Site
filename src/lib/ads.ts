import crypto from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

/**
 * Reklam sisteminin sunucu tarafi.
 *
 * TASARIM KARARI — "tablolar yoksa da calis":
 * `scripts/schema-ads.sql` uygulanmamis olabilir (SUPABASE_DB_PW .env.local'de
 * yorumda oldugu icin migration elle uygulaniyor). Bu yuzden burada DB
 * okunamazsa YERLESIK varsayilan reklamlara dusulur; sayfa yine calisir.
 * Tek fark: sayac kalici ve ziyaretciler arasi ortak olmaz.
 *
 * GUVENLIK — sahte izlenme engeli:
 * "Izledim" istegine guvenilmez. Sunucu, reklami verirken HMAC ile imzali bir
 * token uretir; tamamlama isteginde token'in imzasi VE gecen sure dogrulanir.
 * Boylece `curl` ile aninda 1000 izlenme sismesi yapilamaz.
 * Ayrica ad_views tablosunda anon INSERT politikasi YOK — kayit yalnizca
 * service_role ile, yani bu dosya uzerinden atilir.
 */

export type AdKind = 'image' | 'html' | 'link' | 'adsense'
export type AdPlacement = 'ads-page' | 'donate' | 'banner'

export interface AdSlot {
  id: string
  title: string
  description: string | null
  kind: AdKind
  imageUrl: string | null
  targetUrl: string | null
  html: string | null
  sponsor: string
  durationSeconds: number
  placement: AdPlacement
  /** Bin gosterim geliri (USD) — secim agirligi. Yoksa/0 ise en dusuk oncelik. */
  cpm?: number
  /** Gunluk gosterim ust siniri. Yoksa/0 ise sinirsiz. */
  maxDailyViews?: number
}

export interface AdStats {
  totalViews: number
  completedViews: number
  todayViews: number
  /** 'db' = gercek veritabani, 'fallback' = tablo yok / okunamadi */
  source: 'db' | 'fallback'
}

export interface AdPick {
  slot: AdSlot
  /** Tamamlama isteginde geri gonderilecek imzali token */
  token: string
  stats: AdStats
}

// -------------------------------------------------------------
// Yerlesik varsayilan reklamlar (tablo yoksa / okunamazsa dusulen son cay).
//
// Sahte "kendi kendine sponsor" birimleri (pixelshield, mythora, fruity-dev,
// portfolio, donate-timed) kaldirildi — bunlar gercek sponsor degildi.
// Gercek sponsorlar yalnizca DB'deki ad_slots tablosundan gelir; tablo yoksa
// yalnizca AdSense slotu kalir (client ID tanimli degilse bos durum handled).
// -------------------------------------------------------------
const DEFAULT_SLOTS: AdSlot[] = [
  {
    id: 'adsense-main',
    title: 'AdSense',
    description: null,
    kind: 'adsense',
    imageUrl: null,
    targetUrl: null,
    html: null,
    sponsor: 'Google AdSense',
    durationSeconds: 15,
    placement: 'ads-page',
  },
]

// -------------------------------------------------------------
// Supabase (service_role) — yalnizca sunucu tarafi
// -------------------------------------------------------------
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key)
    return null
  return createClient(url, key, { auth: { persistSession: false } })
}

interface AdSlotRow {
  slug: string
  title: string
  description: string | null
  kind: string
  image_url: string | null
  target_url: string | null
  html: string | null
  sponsor: string | null
  duration_seconds: number | null
  placement: string
  cpm: number | null
  max_daily_views: number | null
}

const KINDS: AdKind[] = ['image', 'html', 'link', 'adsense']

function mapRow(row: AdSlotRow): AdSlot {
  const kind = KINDS.includes(row.kind as AdKind) ? (row.kind as AdKind) : 'link'
  const duration = Number(row.duration_seconds ?? 15)
  return {
    id: row.slug,
    title: row.title,
    description: row.description,
    kind,
    imageUrl: row.image_url,
    targetUrl: row.target_url,
    html: row.html,
    sponsor: row.sponsor || 'TARNAK',
    // Sinirlari burada da uygula — DB check'i atlatilmis olsa bile
    durationSeconds: Number.isFinite(duration) ? Math.min(Math.max(duration, 5), 120) : 15,
    placement: (row.placement as AdPlacement) || 'ads-page',
    cpm: row.cpm == null || !Number.isFinite(row.cpm) ? undefined : Math.max(Number(row.cpm), 0),
    maxDailyViews: row.max_daily_views == null ? undefined : Math.max(Number(row.max_daily_views), 0),
  }
}

export async function getSlots(
  placement: AdPlacement,
): Promise<{ slots: AdSlot[], source: 'db' | 'fallback' }> {
  const db = adminClient()

  if (db) {
    const { data, error } = await db
      .from('ad_slots')
      .select('slug,title,description,kind,image_url,target_url,html,sponsor,duration_seconds,placement,cpm,max_daily_views')
      .eq('placement', placement)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      // 42P01 = tablo yok, PGRST205 = PostgREST semada bulamadi
      console.warn(`[ads] ad_slots okunamadi (${error.code || '?'}) — yerlesik reklamlara dusuldu:`, error.message)
    }
    else if (data && data.length > 0) {
      return { slots: (data as AdSlotRow[]).map(mapRow), source: 'db' }
    }
  }

  return { slots: DEFAULT_SLOTS.filter(s => s.placement === placement), source: 'fallback' }
}

/**
 * cpm-agirlikli secim — rastgelelik ayri, saf fonksiyona birakilmistir
 * (test edilebilir: roll sabit verilir).
 *
 * weights[i] = slot i'nin agirligi (cpm, USD). cpm <= 0 olanlar EN DUSUK
 * oncelikte: pozitif cpm'li baska slot varken secime girmez, hic pozitif yoksa
 * hepsi esit sansla secilir.
 * roll: [0, 1) arasi. Cent (cpm * 100) cinsinden islem, kusurlu sayi
 * hatalarini onler (0.1 + 0.2 != 0.3 gibi).
 */
export function weightedIndexOf(weights: number[], roll: number): number {
  if (weights.length === 0)
    return -1
  const positive = weights
    .map((w, i) => ({ w, i }))
    .filter(x => x.w > 0)
  const pool = positive.length > 0 ? positive : weights.map((w, i) => ({ w: Math.max(w, 0), i }))
  const cents = pool.map(x => Math.round(x.w * 100))
  const total = cents.reduce((a, b) => a + b, 0)
  if (total <= 0) {
    const idx = Math.floor(roll * pool.length)
    return idx >= 0 && idx < pool.length ? pool[idx].i : -1
  }
  const r = roll * total
  let acc = 0
  for (let i = 0; i < pool.length; i++) {
    acc += cents[i]
    if (r < acc)
      return pool[i].i
  }
  return pool[pool.length - 1].i
}

/** Agirlikli rastgele secim — cpm'i yuksek olan daha sik cikar. */
export function pickSlot(slots: AdSlot[]): AdSlot | null {
  if (slots.length === 0)
    return null
  const idx = weightedIndexOf(slots.map(s => s.cpm ?? 0), Math.random())
  return idx >= 0 ? slots[idx] : null
}

// -------------------------------------------------------------
// Imzali izleme token'i
// -------------------------------------------------------------
const TOKEN_SECRET
  = process.env.ADS_TOKEN_SECRET
    || process.env.ADMIN_SECRET
    || 'tarnak-ads-dev-secret'

/** Token'in gecerlilik omru — 30 dakikadan sonra tamamlama reddedilir. */
const TOKEN_TTL_MS = 30 * 60 * 1000

/**
 * Kucuk guvenlik payi (250 ms).
 *
 * Neden bu kadar kucuk: sureyi SUNUCU kendi saatiyle olcuyor (token'i verdigi
 * an ile tamamlama anini karsilastiriyor), istemci saatine hic bakmiyor. Yani
 * saat kaymasi riski YOK. Ayrica istemci sayaci token verildikten SONRA
 * basliyor, dolayisiyla gercek gecen sure her zaman >= duration olur.
 *
 * Ilk surumde 1500 ms idi ve su hatayi uretti: link reklaminin alt siniri 2 sn
 * oldugu icin tolerans (1.5 sn) neredeyse sinirin tamamini yiyordu — 1 saniyede
 * "izlendi" kabul ediliyordu. Test bunu yakaladi.
 */
const TOKEN_TOLERANCE_MS = 250

export interface ViewTokenPayload {
  slotId: string
  durationSeconds: number
  kind: AdKind
  issuedAt: number
  /** Tek kullanimlik nonce — ayni token'in tekrar oynatilmasini engeller */
  nonce: string
}

export function issueViewToken(slotId: string, durationSeconds: number, kind: AdKind): string {
  const payload = Buffer.from(JSON.stringify({
    s: slotId,
    d: durationSeconds,
    k: kind,
    t: Date.now(),
    n: crypto.randomUUID(),
  })).toString('base64url')

  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyViewToken(token: unknown): ViewTokenPayload | null {
  if (typeof token !== 'string' || token.length === 0 || token.length > 512)
    return null

  const dot = token.indexOf('.')
  if (dot <= 0 || dot === token.length - 1)
    return null

  const payload = token.slice(0, dot)
  const provided = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual esit olmayan uzunlukta firlatir — once uzunluga bak
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      s?: unknown
      d?: unknown
      k?: unknown
      t?: unknown
      n?: unknown
    }
    if (typeof parsed.s !== 'string' || typeof parsed.d !== 'number' || typeof parsed.t !== 'number')
      return null
    const kind = KINDS.includes(parsed.k as AdKind) ? (parsed.k as AdKind) : 'link'
    const nonce = typeof parsed.n === 'string' ? parsed.n : ''
    return { slotId: parsed.s, durationSeconds: parsed.d, kind, issuedAt: parsed.t, nonce }
  }
  catch {
    return null
  }
}

/**
 * Bu reklam icin gereken asgari izleme suresi (saniye).
 *
 * Tiklama/link reklaminda destek TIKLAMANIN KENDISIDIR — kullaniciyi 10 saniye
 * bekletmek anlamsiz olur. Ama tamamen anlik (scripted) cagrilari elemek icin
 * yine de 2 saniyelik alt sinir uygulanir.
 */
export function requiredWatchSeconds(payload: ViewTokenPayload): number {
  return payload.kind === 'link' ? 2 : payload.durationSeconds
}

export type ViewState = 'ok' | 'too_early' | 'expired' | 'bad_clock'

/**
 * Token'in durumu. Istemciye NEDEN reddedildigini soyleyebilmek icin ayri
 * durumlar dondurur: sayfa uzun sure acik kalirsa token bayatlar ve kullaniciya
 * "izlemedin" demek yaniltici olur — aslinda yeni bir token gerekiyor.
 */
export function viewTokenState(payload: ViewTokenPayload, now: number = Date.now()): ViewState {
  if (now < payload.issuedAt)
    return 'bad_clock'
  const elapsed = now - payload.issuedAt
  if (elapsed > TOKEN_TTL_MS)
    return 'expired'
  return elapsed >= requiredWatchSeconds(payload) * 1000 - TOKEN_TOLERANCE_MS ? 'ok' : 'too_early'
}

/**
 * Gercekten yeterli sure gecti mi? Istemcinin "izledim" demesine guvenilmez.
 */
export function isViewComplete(payload: ViewTokenPayload, now: number = Date.now()): boolean {
  return viewTokenState(payload, now) === 'ok'
}

// -------------------------------------------------------------
// Kayit + istatistik
// -------------------------------------------------------------
/** IP'yi ham saklamayiz — tuzlu hash (KVKK/GDPR). */
function hashIp(ip: string | null): string | null {
  if (!ip)
    return null
  return crypto.createHmac('sha256', TOKEN_SECRET).update(ip).digest('hex').slice(0, 32)
}

export type RecordResult = 'ok' | 'duplicate' | 'failed'

export async function recordView(params: {
  slotId: string
  nonce?: string
  completed: boolean
  watchedSeconds: number
  ip?: string | null
}): Promise<RecordResult> {
  const db = adminClient()
  if (!db)
    return 'failed'

  const { error } = await db.from('ad_views').insert({
    slot_id: null, // slug ile calisiyoruz; FK cozumu DB'ye birakilir
    slot_slug: params.slotId.slice(0, 120),
    // UNIQUE kolon: ayni token'in tekrar gonderilmesi 23505 verir ve
    // cift sayim olmaz. Token'in 30 dk TTL'i boyunca gecerli olan bu acik
    // ancak boyle kapatilabiliyor.
    token_nonce: params.nonce ? params.nonce.slice(0, 80) : null,
    session_hash: hashIp(params.ip ?? null),
    completed: params.completed,
    watched_seconds: Math.min(Math.max(Math.round(params.watchedSeconds), 0), 3600),
  })

  if (error) {
    // 23505 = unique_violation -> bu token zaten kaydedilmis
    if (error.code === '23505')
      return 'duplicate'
    console.warn(`[ads] izlenme kaydedilemedi (${error.code || '?'}):`, error.message)
    return 'failed'
  }
  return 'ok'
}

export async function getStats(): Promise<AdStats> {
  const db = adminClient()
  const empty: AdStats = { totalViews: 0, completedViews: 0, todayViews: 0, source: 'fallback' }

  if (!db)
    return empty

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const [total, completed, today] = await Promise.all([
    db.from('ad_views').select('*', { count: 'exact', head: true }),
    db.from('ad_views').select('*', { count: 'exact', head: true }).eq('completed', true),
    db.from('ad_views').select('*', { count: 'exact', head: true }).gte('created_at', dayStart.toISOString()),
  ])

  const firstError = total.error || completed.error || today.error
  // ⚠️ Olculdu: PostgREST, `head: true` ile tablo YOKKEN hata dondurmez —
  // 404 yerine `error: null, count: null` gelir. Bu yuzden count'un null
  // olmasini da "tablo yok" saymak zorundayiz; yoksa sayac sahte sekilde
  // 0 gosterip kullaniciya "calisiyor" izlenimi verir.
  if (
    firstError
    || total.count === null
    || completed.count === null
    || today.count === null
  ) {
    if (firstError)
      console.warn(`[ads] istatistik okunamadi (${firstError.code || '?'}):`, firstError.message)
    return empty
  }

  return {
    totalViews: total.count ?? 0,
    completedViews: completed.count ?? 0,
    todayViews: today.count ?? 0,
    source: 'db',
  }
}

/**
 * Bugunku gosterim sayilari (slot_slug -> adet).
 *
 * completed=false kayitlar DAHIL: reklam verilmis ama izlenme tamamlanmamis
 * olsa bile bu bir gosterimdir ve gunluk limiti tuketir.
 * Tablo yoksa/okunamazsa bos harita doner -> limit filtresi pasif kalir.
 */
export async function getTodayViewCounts(): Promise<Map<string, number>> {
  const db = adminClient()
  const empty = new Map<string, number>()
  if (!db)
    return empty

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const { data, error } = await db
    .from('ad_views')
    .select('slot_slug')
    .gte('created_at', dayStart.toISOString())

  if (error || !data) {
    if (error)
      console.warn(`[ads] gunluk gosterim sayaci okunamadi (${error.code || '?'}):`, error.message)
    return empty
  }

  const counts = new Map<string, number>()
  for (const row of data) {
    const slug = (row as { slot_slug: string }).slot_slug
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return counts
}

/** Gunluk limit filtresi: maxDailyViews asan slot secime girmez. */
function withinDailyLimit(slot: AdSlot, counts: Map<string, number>): boolean {
  const limit = slot.maxDailyViews
  return !(limit && limit > 0 && (counts.get(slot.id) ?? 0) >= limit)
}

/** Tek cagride slot + token + istatistik (sayfa ilk yuklemesi icin). */
export async function getAdPick(placement: AdPlacement): Promise<AdPick | null> {
  const [{ slots }, stats, counts] = await Promise.all([
    getSlots(placement),
    getStats(),
    getTodayViewCounts(),
  ])
  // Limiti asan sponsorlari secimden cikar; limiti olmayanlar serbest kalir.
  const eligible = slots.filter(s => withinDailyLimit(s, counts))
  const slot = pickSlot(eligible)
  if (!slot)
    return null
  return { slot, token: issueViewToken(slot.id, slot.durationSeconds, slot.kind), stats }
}
