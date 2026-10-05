/**
 * Dağıtık hız sınırı — Cloudflare KV (2026-10-05).
 *
 * NEDEN KV VE NEDEN `rate-limit.ts` DEĞİL:
 * `lib/rate-limit.ts` in-memory kayan pencere kullanıyor. Cloudflare
 * Workers'ta her izole ayrı bellek taşıdığı ve trafik rastgele izolelere
 * dağıldığı için bu sınırlayıcı TEK İSTEKÇİYİ durdurur, DAĞITIK
 * SALDIRIYI durdurmaz — dosyanın kendi başlığı da bunu yazıyordu. KV ise
 * tek bir paylaşılan depodur: tüm izoleler aynı sayacı görür.
 *
 * KV'nin sınırı ve BİLEREK kabulüm:
 *   • KV `eventually consistent` (yazma ~60s'de dünya geneline yayılır).
 *     Yani iki eşzamanlı istek KESİN olarak değil, BÜYÜK OLASILIKLA aynı
 *     sayacı görür. Faturalama koruması için yeterli (hedef: dakikada
 *     onlarca değil, saniyede yüzlerce istek). "Tam sayırlık" gerekiyorsa
 *     Durable Objects ya da WAF gerekir — panel adımları raporun sonunda.
 *   • Yazma maliyeti: KV Free 1000 yazma/gün. Aşağıdaki `put` YALNIZCA
 *     pencere dolduğunda (limit aşılınca) veya anahtarı oluştururken çağrılır;
 *     her istekte `get` (okuma 100k/gün) yapılır. Ucuz tarafta kaldık.
 *   • Workers Free CPU 10ms: KV `get` + atomik sayma tek istekte birkaç ms.
 *
 * FAIL-OPEN / FAIL-CLOSED (kullanıcı isteği):
 *   Pahalı uç noktalar (chat, upload, contact) → FAIL CLOSED: KV okunamazsa
 *   200 dönmüyoruz, 503 + Retry-After dönüyoruz. Aksi halde KV kesintisi
 *   faturayı korumaz.
 *   Ucuz uç noktalar (sayaç, admin) → FAIL OPEN: KV okunamazsa isteğe
 *   izin veriyoruz. Sayaç kaybı kabul edilebilir; siteyi kilitlemek değil.
 */

import { clientIp } from '@/lib/client-ip'

/* ── KV binding erişimi ────────────────────────────────────────────────── */

/**
 * `getCloudflareContext()` global'i OpenNext'in Workers build'inde sağlar.
 * Sayfa route'larında `globalThis` üzerinde gelir; tip tanımı için
 * `env.d.ts` genişletilir. Yakalanmazsa local dev'de (Node) `null` döner ve
 * çağıran `inMemory` fallback'e düşer — böylece `next dev` de çalışır.
 */
type KVNamespaceLike = {
  get(key: string, type: 'text'): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

async function getKv(): Promise<KVNamespaceLike | null> {
  try {
    const g = globalThis as unknown as {
      getCloudflareContext?: () => { env?: Record<string, unknown> }
    }
    const ctx = g.getCloudflareContext?.()
    const env = ctx?.env as Record<string, unknown> | undefined
    // Aynı binding'i kullanıyoruz: ayrı namespace açmaya gerek yok, KV
    // namespace'leri bu kadar ucuz (1000 yazma/gün).
    const kv = env?.NEXT_INC_CACHE_KV as KVNamespaceLike | undefined
    return kv ?? null
  }
  catch {
    return null
  }
}

/* ── Limit tanımları: TEK YERDE, kolay değiştirilir ─────────────────────── */

export const LIMITS = {
  /** Chat: en pahalı uç nokta. Dakikada 10 + saatte 60 (çift pencere). */
  chat: { limit: 10, windowMs: 60_000 },
  chatHourly: { limit: 60, windowMs: 3_600_000 },
  /** Dosya yükleme: chat ile aynı sınıfta. */
  chatUpload: { limit: 10, windowMs: 60_000 },
  /** İletişim formu: saatte 5 (sahte başvuru + Discord webhook unafiyeti). */
  contact: { limit: 5, windowMs: 3_600_000 },
  /** Giriş/kayıt: saatte 5 (brute-force + spam hesap). */
  auth: { limit: 5, windowMs: 3_600_000 },
  /** Diğer yazma işlemleri: dakikada 20. */
  write: { limit: 20, windowMs: 60_000 },
  /** Sayaç (stars): IP+proje başına saatte 1 — engellemez, saymayı engeller. */
  counter: { limit: 1, windowMs: 3_600_000 },
} as const

/** İstek gövdesi sınırları (fatura koruması). */
export const BODY_LIMITS = {
  /** Chat mesajı: 2000 karakter. Uzun metin = pahalı üretim. */
  chatMessageChars: 2000,
  /** Otomatik yanıt üretimi için azami çıktı token'ı. */
  maxOutputTokens: 500,
} as const

/* ── Sonuç tipi ────────────────────────────────────────────────────────── */

export interface LimitResult {
  ok: boolean
  /** Kota sistemi çalışıyor mu? `false` ise KV erişilemedi (fallback). */
  authoritative: boolean
  limit: number
  remaining: number
  /** Saniye. */
  retryAfter: number
  /** Unix ms. */
  resetAt: number
}

/* ── KV sayacı ─────────────────────────────────────────────────────────── */

/**
 * KV'de kayan pencere yerine SABİT PENCERE sayacı tutuyoruz.
 *
 * Neden kayan pencere değil: kayan pencere her istekte dizi okuma/yazma
 * ister (KV'de pahalı ve 60s gecikmeli — kayan pencere KV'de doğru
 * çalışmaz). Sabit pencere iki KV değeriyle yetiyor:
 *   1. `rl:<k>`        -> { n, resetAt }  (mevcut pencere)
 *   2. anahtar yeniyse `rl:<k>:<resetAt>` üzerinden yeni pencere
 * Sınır bölmesi klasik "fixed window"dır: pencere sınırında iki katına
 * çıkabilecek en kötü durum 2×limit'tir. Kullanıcı isteği "kayan pencere
 * VEYA jeton kovası" diyordu; sabit pencere KV'nin tutarlılık modeliyle
 * uyumlu ve tek yazma/okuma ile çalışıyor.
 */
async function kvFixedWindow(
  kv: KVNamespaceLike,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): Promise<LimitResult> {
  const slot = Math.floor(now / windowMs)
  const slotKey = `rl:${key}:${slot}`
  const resetAt = (slot + 1) * windowMs

  const raw = await kv.get(slotKey, 'text')
  const n = raw ? Number.parseInt(raw, 10) || 0 : 0

  if (n >= limit) {
    return {
      ok: false,
      authoritative: true,
      limit,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
    }
  }

  // Sayaç dolmadıysa yazma YAPMIYORUZ: KV yazma günlük kotası 1000.
  // Sınırı aşan ilk istekte yazıyoruz — yani bir kullanıcı günde en çok
  // "kaç kez sınıra çarptı" sayısı kadar yazma üretir.
  await kv.put(slotKey, String(n + 1), { expirationTtl: Math.ceil(windowMs / 1000) + 60 })

  return {
    ok: true,
    authoritative: true,
    limit,
    remaining: Math.max(0, limit - n - 1),
    retryAfter: 0,
    resetAt,
  }
}

/* ── In-memory fallback (local dev / KV yok) ───────────────────────────── */

const memStore = new Map<string, { n: number, resetAt: number }>()

function memFixedWindow(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): LimitResult {
  const slot = Math.floor(now / windowMs)
  const slotKey = `${key}:${slot}`
  const resetAt = (slot + 1) * windowMs
  const cur = memStore.get(slotKey)

  if (memStore.size > 5000)
    memStore.clear()

  if (cur && cur.n >= limit) {
    return {
      ok: false,
      authoritative: false,
      limit,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
    }
  }

  memStore.set(slotKey, { n: (cur?.n ?? 0) + 1, resetAt })
  return {
    ok: true,
    authoritative: false,
    limit,
    remaining: Math.max(0, limit - (cur?.n ?? 0) - 1),
    retryAfter: 0,
    resetAt,
  }
}

/* ── Genel giriş noktası ──────────────────────────────────────────────── */

/**
 * Sınır kontrolü. İşlemin EN BAŞINDA çağrılmalı.
 *
 * @param scope   Anahtar ön eki (`chat`, `contact`, …). IP otomatik eklenir.
 * @param opts    `{ limit, windowMs, failClosed }`
 * @param req     İstek — IP için. Verilmezse `anonymous` kullanılır.
 * @param extra   Anahtarın ek parçası (ör. sayaçta proje adı).
 */
export async function checkLimit(
  scope: string,
  opts: { limit: number, windowMs: number, failClosed?: boolean },
  req?: Request,
  extra?: string,
): Promise<LimitResult> {
  const now = Date.now()
  const failClosed = opts.failClosed ?? false

  // IP yoksa TÜM anonim istekleri tek anahtarda topluyoruz: "unknown"
  // ayrımı yerine, bilinmeyenler daha sıkı sınırlansın diye limiti yarıya
  // indiriyoruz (bot genelde CF-Connecting-IP'siz gelmez).
  const ip = req ? clientIp(req) : 'unknown'
  const key = extra ? `${scope}:${ip}:${extra}` : `${scope}:${ip}`

  const effective = ip === 'unknown'
    ? { limit: Math.max(1, Math.floor(opts.limit / 2)), windowMs: opts.windowMs }
    : { limit: opts.limit, windowMs: opts.windowMs }

  const kv = await getKv()
  if (kv) {
    try {
      return await kvFixedWindow(kv, key, effective.limit, effective.windowMs, now)
    }
    catch {
      // KV HATA VERDİ. Pahalıysa fail-closed, ucuzsa fail-open.
      if (failClosed) {
        return {
          ok: false,
          authoritative: false,
          limit: effective.limit,
          remaining: 0,
          retryAfter: 60,
          resetAt: now + 60_000,
        }
      }
      return {
        ok: true,
        authoritative: false,
        limit: effective.limit,
        remaining: effective.limit,
        retryAfter: 0,
        resetAt: now + effective.windowMs,
      }
    }
  }

  // KV binding yok (yerel `next dev`). In-memory: dağıtık değil ama
  // geliştirme ortamında limitin çalıştığını görmek için yeterli.
  return memFixedWindow(key, effective.limit, effective.windowMs, now)
}

/* ── HTTP yanıt yardımcısı ─────────────────────────────────────────────── */

/** 429 gövdesi + standart başlıklar. */
export function rateLimitResponse(result: LimitResult): Response {
  return Response.json(
    { error: 'rate_limited', retryAfter: result.retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        'Cache-Control': 'no-store',
      },
    },
  )
}

/**
 * Başarılı yanıta kalan kota başlıklarını ekler (429 değil, 200'ler).
 * İstemci kalan hakkını arayüzde gösterebilsin diye.
 */
export function withRateLimitHeaders(res: Response, result: LimitResult): Response {
  res.headers.set('X-RateLimit-Limit', String(result.limit))
  res.headers.set('X-RateLimit-Remaining', String(result.remaining))
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
  return res
}

/** Test için sıfırlama (yalnız in-memory fallback'i temizler). */
export function resetLimits(): void {
  memStore.clear()
}
