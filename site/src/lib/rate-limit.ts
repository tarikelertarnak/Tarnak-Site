/**
 * In-memory kayan pencere hız sınırlayıcı.
 *
 * Cloudflare Workers'ta her izole ayrı bellek taşıdığı için bu "yumuşak" bir
 * sınırdır: tek bir izoleyi taşırmayı engeller, dağıtık bir saldırıyı tek
 * başına durdurmaz. İçin zorunlu koruma (giriş kilidi, veri doğrulama) ayrıdır.
 *
 * Bellek: `MAX_KEYS` aşıldığında en eski kayıtlar budulur.
 */

export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Hangi saniye sonra tekrar denenebilir. */
  retryAfter: number
}

interface Bucket {
  hits: number[]
  lastSeen: number
}

const MAX_KEYS = 5000
const moduleStore = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number, windowMs: number },
  now = Date.now(),
): RateLimitResult {
  const store = moduleStore
  const bucket = store.get(key) ?? { hits: [], lastSeen: now }
  bucket.hits = bucket.hits.filter(t => now - t < windowMs)
  bucket.lastSeen = now

  if (bucket.hits.length >= limit) {
    store.set(key, bucket)
    prune(store, now)
    const oldest = bucket.hits[0]
    return { ok: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000) }
  }

  bucket.hits.push(now)
  store.set(key, bucket)
  prune(store, now)
  return { ok: true, remaining: limit - bucket.hits.length, retryAfter: 0 }
}

/**
 * İstemci IP'si. `cf-connecting-ip` Cloudflare tarafından yazıldığı için tek
 * güvenilir kaynak; yoksa XFF'in son değeri (proxy yazan değer), son çare
 * bilinmeyen.
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf && /^[0-9a-f:.]{3,45}$/i.test(cf)) {
    return cf
  }
  const xff = req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  if (xff && /^[0-9a-f:.]{3,45}$/i.test(xff)) {
    return xff
  }
  return 'unknown'
}

function prune(store: Map<string, Bucket>, now: number): void {
  if (store.size <= MAX_KEYS) {
    return
  }
  for (const [k, v] of store) {
    if (now - v.lastSeen > 10 * 60 * 1000) {
      store.delete(k)
    }
  }
  while (store.size > MAX_KEYS) {
    const first = store.keys().next()
    if (first.done) {
      break
    }
    store.delete(first.value)
  }
}

/** İstek kökeni tarayıcıdan mı geliyor? (server-to-server istekleri elenir) */
export function isBrowserRequest(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) {
    // Bazı istemciler Origin göndermez; Sec-Fetch-Site ikinci sinyal.
    const site = req.headers.get('sec-fetch-site')
    return site === undefined || site === 'same-origin' || site === 'same-site'
  }
  try {
    const host = req.headers.get('host')
    return host ? new URL(origin).host === host : false
  }
  catch {
    return false
  }
}

/** Test/izolasyon için durumu sıfırlar. */
export function resetRateLimits(): void {
  moduleStore.clear()
}
