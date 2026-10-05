/**
 * KV tabanlı yanıt önbelleği — GET uç noktaları için (2026-10-05).
 *
 * Kullanıcı isteği: "GET ile veri okuyan genel uç noktalar: sıkı limit yerine
 * ÖNBELLEK kullan."
 *
 * Neden KV, neden `unstable_cache` değil:
 *   • Workers'ta KV incremental cache binding'i (`NEXT_INC_CACHE_KV`) zaten
 *     deploy altyapısında var; yeni binding/bağımlılık gerekmiyor.
 *   • `unstable_cache` ISR ile aynı şeydir ama route handler'larında her
 *     istek için ayrı anahtar üretmek ve `revalidate` zincirini yönetmek
 *     gerekir. KV'de tek satır `get`/`put` ve TTL yerleşik.
 *   • Workers CPU 10ms: her ziyarette GitHub'a gitmek pahalı; KV okuması
 *     yerel. Ziyaretçi başına GitHub isteği 0'a iner.
 *
 * TTL: 15 dakika (`GITHUB_CACHE_TTL_S`). Kullanıcı isteği 10-30 dk aralığında.
 * GitHub rate limit'i kimliksiz 60/sa, token'lı 5000/sa; TTL sayesinde
 * site trafiği ne olursa olsun GitHub kotası tüketilmez.
 *
 * KALICI HATA KAYDI: başarısız istek 30 saniye saklanır (fail-TTL) ki bir
 * hata anında her ziyaretçi GitHub'a yeniden gitmesin.
 */

type KVLike = {
  get(key: string, type: 'text'): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

async function getKv(): Promise<KVLike | null> {
  try {
    const g = globalThis as unknown as {
      getCloudflareContext?: () => { env?: Record<string, unknown> }
    }
    const env = g.getCloudflareContext?.()?.env as Record<string, unknown> | undefined
    return (env?.NEXT_INC_CACHE_KV as KVLike | undefined) ?? null
  }
  catch {
    return null
  }
}

/** Başarılı yanıt ömrü: 15 dakika. */
export const GITHUB_CACHE_TTL_S = 15 * 60
/** Hata ömrü: 30 saniye — hata anında her istek GitHub'a gitmesin. */
const FAIL_TTL_S = 30

export interface CachedResult<T> {
  data: T | null
  /** Yanıt `X-Cache` başlığı için: HIT | MISS | BYPASS (KV yok). */
  cache: 'HIT' | 'MISS' | 'BYPASS'
}

const memFallback = new Map<string, { body: string, ts: number }>()

/**
 * Yakalanacak özel hata: "kullanıcı yok" (404).
 *
 * `cachedJson` bunu YUTMAYI reddediyor ve yeniden denemeye izin veriyor —
 * çünkü 404 kalıcı değil (kullanıcı adı düzeltilebilir) ama her istekte
 * GitHub'a gitmesin diye kısa TTL'li önbelleğe alınmalı. Route bu hatayı
 * yakalayıp 404 gövdesi döndürüyor.
 */
export class CachedNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CachedNotFoundError'
  }
}

/**
 * KV destekli, in-memory yedeği olan JSON önbellek.
 *
 * @param key    Cache anahtarı (kullanıcı adı + tür gibi)
 * @param ttlS   Geçerli yanıt ömrü (saniye)
 * @param fetcher Veriyi üreten async fonksiyon — sadece MISS'te çağrılır
 */
export async function cachedJson<T>(
  key: string,
  ttlS: number,
  fetcher: () => Promise<T>,
): Promise<CachedResult<T>> {
  const cacheKey = `gh:${key}`
  const kv = await getKv()

  if (!kv) {
    // Yerel geliştirme / KV binding yok: in-memory. Production'da
    // Workers izoleleri arasında paylaşılmaz, ama production'da KV var.
    const hit = memFallback.get(cacheKey)
    const now = Date.now()
    if (hit && now - hit.ts < ttlS * 1000) {
      try {
        return { data: JSON.parse(hit.body) as T, cache: 'HIT' }
      }
      catch { /* bozuk gövde -> yeniden çek */ }
    }
    // Geçici hata `null` döner; kalıcı 404 `CachedNotFoundError` fırlatır.
    const fresh = await runFetcher(fetcher)
    if (fresh !== null) {
      if (memFallback.size > 200) memFallback.clear()
      memFallback.set(cacheKey, { body: JSON.stringify(fresh), ts: now })
    }
    return { data: fresh, cache: 'MISS' }
  }

  const raw = await kv.get(cacheKey, 'text')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { data: T | null, ok: boolean, nf?: string }
      if (parsed.ok) return { data: parsed.data, cache: 'HIT' }
      // `ok:false, nf` = kalıcı "yok" cevabı (404): mesajı geri ver.
      if (parsed.nf) throw new CachedNotFoundError(parsed.nf)
      // Diğer hata kaydı: yeniden dene ama her istek GitHub'a gitmesin.
      const fresh = await runFetcher(fetcher)
      if (fresh !== null) {
        await kv.put(cacheKey, JSON.stringify({ data: fresh, ok: true }), { expirationTtl: ttlS })
        return { data: fresh, cache: 'MISS' }
      }
      return { data: null, cache: 'MISS' }
    }
    catch (error) {
      if (error instanceof CachedNotFoundError) throw error
      /* bozuk JSON -> yeniden çek */
    }
  }

  const fresh = await runFetcher(fetcher)
  if (fresh === null) {
    // Geçici hata: kısa TTL ile hatayı önbelleğe al ki transient hata
    // her ziyarette tekrarlanmasın.
    try {
      await kv.put(cacheKey, JSON.stringify({ data: null, ok: false }), { expirationTtl: FAIL_TTL_S })
    }
    catch { /* KV yazamıyorsa yoksay */ }
    return { data: null, cache: 'MISS' }
  }

  await kv.put(cacheKey, JSON.stringify({ data: fresh, ok: true }), { expirationTtl: ttlS })
  return { data: fresh, cache: 'MISS' }
}

/**
 * Fetcher'ı çalıştırır ve hata politikasını TEK YERDE uygular.
 *
 *   • `CachedNotFoundError` → YUTULMAZ, yukarı fırlatılır (kalıcı 404).
 *   • Diğer her hata      → `null` döner; çağıran 500 üretir.
 *
 * Neden ayrı: hem in-memory hem KV yolu aynı politikayı uygulamalıydı;
 * ilk yazımda KV yolu hatayı fırlatıyor, in-memory yolu yutuyordu ve
 * `route.test.ts` (500 bekliyor) patladı.
 */
async function runFetcher<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher()
  }
  catch (error) {
    if (error instanceof CachedNotFoundError) throw error
    return null
  }
}

/** Test için. */
export function resetCache(): void {
  memFallback.clear()
}
