/**
 * lib/visits.ts — ziyaretçi / unique-kişi sayımı pure yardımcıları.
 * Sunucu ve istemci tarafından ortak kullanılır, DB'ye bağımsızdır.
 *
 * Kişi anahtarı: userId varsa userId, yoksa visitorId (visitor_links ile
 * geriye dönük bağlanır). IP asla saklanmaz.
 */

export interface VisitBucket {
  label: string
  from: string // YYYY-MM-DD dahil
  to: string // YYYY-MM-DD dahil
}

// Bot / crawler user-agent kalıpları (kural tabanlı, geniş).
// `null`/`undefined` UA'yı da bot sayar (tarayıcı olmayan istek).
export const BOT_UA = /\b(?:bot|crawler|spider|crawl|slurp|bingbot|googlebot|facebookexternalhit|twitterbot|applebot|curl|wget|python-requests|headless|phantom|puppeteer|selenium|uptime|monitoring|pingdom|datadog|newrelic|uptimerobot|statuscake|gurucrawler|semrush|ahrefs|dotbot|mj12bot|majestic|scrapy|requests|urllib|okhttp|libwww)\b/i

export function isBotUA(ua: string | null | undefined): boolean {
  if (!ua)
    return true
  return BOT_UA.test(ua)
}

// İzlenmeyecek yollar (prefix bazlı). /admin ve /api hariç; prefetch izlenmez.
export const EXCLUDED_PATH_PREFIXES = ['/admin', '/api', '/_next', '/static']
export const EXCLUDED_EXACT_PATHS = new Set(['/favicon.ico', '/robots.txt', '/sitemap.xml', '/manifest.json'])

export function shouldTrackPath(pathname: string): boolean {
  if (EXCLUDED_EXACT_PATHS.has(pathname))
    return false
  for (const p of EXCLUDED_PATH_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`))
      return false
  }
  return true
}

// Next.js prerendering / prefetch tespiti (istemci).
export function isPrerenderingOrPrefetching(): boolean {
  if (typeof document === 'undefined')
    return false
  try {
    return (document as { prerendering?: boolean }).prerendering === true
  }
  catch {
    return false
  }
}

// Kişi anahtarı çözümlemesi: userId varsa userId, yoksa visitorId.
export function resolvePersonKey(userId: string | null | undefined, visitorId: string): string {
  return userId ? String(userId) : visitorId
}

// Gün bucket'ı (UTC, YYYY-MM-DD).
export function dayBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

const MS_PER_DAY = 86400000

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * MS_PER_DAY)
}

export function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Periyot aralıkları.
export function periodRange(
  period: 'today' | '7d' | '30d' | 'total',
  now: Date = new Date(),
): VisitBucket {
  const today = fmtDate(now)
  switch (period) {
    case 'today':
      return { label: 'Bugün', from: today, to: today }
    case '7d':
      return { label: 'Son 7 gün', from: fmtDate(addDays(now, -6)), to: today }
    case '30d':
      return { label: 'Son 30 gün', from: fmtDate(addDays(now, -29)), to: today }
    case 'total':
      return { label: 'Toplam', from: '0001-01-01', to: '9999-12-31' }
  }
}

// 32-hex visitorId üret (crypto.randomUUID'nin tireleri çıkarılmış hali).
export function makeVisitorId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
}

// visitorId biçimi doğrulaması (32 hex).
export const VISITOR_ID_RE = /^[0-9a-f]{32}$/i

export function isValidVisitorId(value: string | null | undefined): boolean {
  return VISITOR_ID_RE.test(value ?? '')
}
