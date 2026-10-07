/**
 * Sentry — edge (Cloudflare Workers) uyumlu hata izleme.
 *
 * NEDEN `@sentry/cloudflare` (Faz 1 · operasyon):
 *   Sentry'nin Node SDK'sı `node:` built-in'lerine (`fs`, `http`, `zlib`)
 *   dayanır; Workers'ta ÇALIŞMAZ. `@sentry/cloudflare` Web API üzerine
 *   kuruludur ve `@opennextjs/cloudflare` ile desteklenir. Resmi paket,
 *   sarmalama yok.
 *
 * DAHİL EDİLMEDİĞİ DURUM:
 *   `SENTRY_DSN` tanımlı değilse `init()` hiç çalışmaz — paket `await
 *   import()` ile TİLA ŞİMDİ indirilir. Yani Sentry kullanmayan kurulumda
 *   sıfır bayt, sıfır runtime maliyeti. Bu yüzden `import` statik DEĞİL.
 *
 * KİŞİSEL VERİ GÖNDERİLMEZ (kullanıcı şartı):
 *   · `sendDefaultPii: false` → IP, e-posta, kullanıcı adı, çerez otomatik
 *     eklenmez.
 *   · `beforeSend` → yine de sızan PII'yi temizler: `request.headers`
 *     içinden çerez/authorization, `extra`/`contexts` içinden e-posta ve
 *     telefon biçimli değerler MASKELENİR.
 *   · Gövde (body) hiçbir koşulda gönderilmez.
 *
 * KURULUM (bkz. docs/faz1-rapor.md):
 *   1. sentry.io → proje oluştur → "Cloudflare" SDK'sını seç
 *   2. Alınan DSN'i `SENTRY_DSN` olarak tanımla
 *   3. `SENTRY_AUTH_TOKEN` + org/project ile sourcemap yükle (aşağıda)
 */

const DSN = process.env.SENTRY_DSN

/** Kaynağı bulunamayan satırlarda `app/<klasör>/<dosya>` gösterilir. */
const RELEASE = process.env.NEXT_PUBLIC_COMMIT_SHA || undefined

/** Ortam: production varsayılan; preview'ı ayırt etmek için kullanışlı. */
const ENVIRONMENT = process.env.NEXT_PUBLIC_VERCEL_ENV
  || (process.env.NODE_ENV === 'production' ? 'production' : 'development')

/**
 * PII temizleyici.
 *
 * Sentry `beforeSend` her olayda çalışır. Burada:
 *  · `cookie`, `authorization`, `x-forwarded-for` → `[filtered]`
 *  · E-posta benzeri metinler → `[email]`
 *  · Telefon benzeri metinler → `[phone]`
 * Uygulanacak metin alanları: `request.headers`, `extra`, `contexts`,
 * `breadcrumbs[].data`.
 */
const PII_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g
const PII_PHONE = /(?:\+?\d[\d\s().-]{8,}\d)/g
const SECRET_HEADERS = ['cookie', 'authorization', 'set-cookie', 'x-forwarded-for', 'x-api-key']

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined)
    return value
  if (typeof value === 'string')
    return value.replace(PII_EMAIL, '[email]').replace(PII_PHONE, '[phone]')
  if (Array.isArray(value))
    return value.map(v => scrub(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_HEADERS.includes(k.toLowerCase()) ? '[filtered]' : scrub(v, depth + 1)
    }
    return out
  }
  return value
}

/**
 * Sentry'yi dinamik yükler ve tip-uyumlu bir nesne döndürür.
 *
 * `@sentry/cloudflare` v11 hem adlandırılmış (`init`, `captureException`)
 * hem `default` anahtarıyla export ediyor; hangi biçimin geldiği paket
 * sürümüne göre değiştiği için ikisini de kabul ediyoruz.
 */
async function loadSentry(): Promise<SentryLike> {
  const mod = await import('@sentry/cloudflare')
  const candidate = mod as unknown as SentryLike & { default?: SentryLike }
  const resolved = typeof candidate.init === 'function' ? candidate : candidate.default
  if (!resolved || typeof resolved.init !== 'function') {
    // Beklenmeyen export şekli — sessizce devre dışı bırak, siteyi düşürme.
    return {
      init: () => {},
      captureException: () => {},
    }
  }
  return resolved
}

type SentryLike = {
  init: (options: Record<string, unknown>) => void
  captureException: (error: unknown, hint?: Record<string, unknown>) => void
}

type SentryEvent = {
  request?: { url?: string, headers?: unknown, data?: unknown }
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
  breadcrumbs?: unknown[]
}

export async function init(): Promise<void> {
  if (!DSN) {
    // Kurulmamış: bilinçli olarak hiçbir şey yapma. Sessiz geç, log'a da
    // yazma — her istekte `console` maliyeti olur.
    return
  }

  const Sentry = await loadSentry()

  Sentry.init({
    dsn: DSN,
    release: RELEASE,
    environment: ENVIRONMENT,
    enabled: true,

    // ── KİŞİSEL VERİ KAPALI ────────────────────────────────────────────
    sendDefaultPii: false,
    // İstek/yanıt gövdesi hiç gönderilmez.
    sendClientReports: false,

    // ── Gürültü filtresi ────────────────────────────────────────────────
    // Sitenin kendi hata sınırları (429, 503 bakım sayfası, tercih edilen
    // 404'ler) Sentry'ye gürültü yazmasın.
    ignoreErrors: [
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      'AbortError',
      /ResizeObserver loop/,
    ],
    ignoreTransactions: ['/api/health'],

    // /health her 5 dakikada bir → izlemeye gerek yok, gürültü yapar.
    tracesSampleRate: 0, // performans izleme şimdilik KAPALI (KV/Workers
    //                   maliyeti yüksek, hata izleme yeterli)

    beforeSend(event: SentryEvent) {
      if (event.request) {
        event.request.headers = scrub(event.request.headers) as Record<string, unknown>
        // URL'den sorgu parametreleri sır taşıyabilir (token, e-posta).
        if (event.request.url) {
          event.request.url = event.request.url.split('?')[0]
        }
        // Gövdeyi göndermiyoruz — en sızıntılı kısım.
        delete event.request.data
      }
      event.extra = scrub(event.extra) as Record<string, unknown>
      event.contexts = scrub(event.contexts) as Record<string, unknown>
      if (event.breadcrumbs) {
        event.breadcrumbs = scrub(event.breadcrumbs) as SentryEvent['breadcrumbs']
      }
      return event
    },
  })
}

/**
 * Next.js 15+ hata yakalama kancası.
 * Route handler, server action ve render hatalarını Sentry'ye gönderir.
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string, method?: string },
): Promise<void> {
  if (!DSN) return
  try {
    const Sentry = await loadSentry()
    Sentry.captureException(error, {
      extra: { path: request.path, method: request.method },
      tags: { runtime: 'nextjs' },
    })
  }
  catch {
    // Sentry yüklenemezse sessiz geç — hata yakalama asla siteyi düşürmez.
  }
}