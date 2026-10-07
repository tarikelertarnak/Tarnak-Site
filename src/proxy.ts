import type { NextRequest as NextRequestType } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildCspValue, generateCspNonce } from '@/lib/csp-nonce'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Host guard — yalnızca kanonik alan adı üzerinden servis.
 *
 * `tarikelertarnak.pages.dev` açıktır; diğer host'lar kanonik adrese
 * (path + query korunarak) yönlendirilir. Yerel geliştirme (localhost/127.0.0.1)
 * muaf tutulur, yoksa `next dev` çalışmaz.
 */
const CANONICAL_HOST = 'tarikelertarnak.pages.dev'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function redirectToCanonical(request: NextRequestType): NextResponse | null {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  if (!host || LOCAL_HOSTS.has(host) || host === CANONICAL_HOST)
    return null
  const url = request.nextUrl.clone()
  url.host = CANONICAL_HOST
  url.protocol = 'https:'
  return NextResponse.redirect(url, 308)
}

export async function proxy(request: NextRequestType) {
  const guard = redirectToCanonical(request)
  if (guard)
    return guard

  /*
   * 2026-10-07 CSP faz 1 — nonce tabanlı politika (REPORT-ONLY).
   *
   * Neden burada: `next.config.mjs` statik çalışır, request'e erişemez; nonce
   * ise her istekte benzersiz olmak ZORUNDA. `next.config.mjs` içindeki
   * `'unsafe-inline' 'unsafe-eval'` ise CSP'yi tamamen etkisiz kiliyordu.
   *
   * Burada iki şey birden oluyor:
   *  1) İSTEK header'ına `Content-Security-Policy-Report-Only` yazılıyor.
   *     Next'in kendi `<script>` etiketlerine nonce'u OTOMATİK bağlaması
   *     tam olarak bu yola bakar (bkz. next/dist/server/route-modules/app-page/
   *     parse-request-headers.js — `content-security-policy ||
   *     content-security-policy-report-only` istek header'ını okur).
   *  2) AYNI değer YANIT header'ına yazılıyor; tarayıcı politika ihlallerini
   *     raporlar, ENGELLEMEZ (enforcing'e geçiş talimatı next.config.mjs'te).
   *
   * `x-nonce`: layout'ın (bkz. src/app/layout.tsx) tema init script'ine
   * verebilmesi için istek header'ı olarak taşınır.
   *
   * ⚠️ `src/app/layout.tsx` `dynamic = 'force-static'` olduğu için `headers()`
   * orada BOŞ döner → statik üretilen sayfalarda nonce HTML'e gömülemez.
   * Bu sayfalar ancak enforcing'e geçildiğinde hash tabanlı CSP'ye çevrilerek
   * kapsanabilir. Detaylı risk notu: fixer raporu + next.config.mjs bloğu.
   */
  const nonce = generateCspNonce()
  const csp = buildCspValue(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy-Report-Only', csp)
  // NextResponse.next({ request: { headers } }) yalnızca İSTEK header'ını
  // değiştirir; yanıt header'ı ayrıca set edilmeli.
  const withCsp = (response: NextResponse): NextResponse => {
    response.headers.set('Content-Security-Policy-Report-Only', csp)
    return response
  }

  // 2026-10-03 Cloudflare 1102 fix.
  //
  // `updateSession()` calls `supabase.auth.getUser()` — a NETWORK round-trip to
  // Supabase Auth plus JWT signature verification. On the Workers Free plan the
  // CPU budget is 10 ms, so running it on EVERY request guaranteed an
  // exceededCpu / 503 on any page the CDN could not serve statically. Prerendered
  // pages (assets/) bypassed the Worker and returned 200, which is why only the
  // dynamic routes failed — it looked random, it was CPU.
  //
  // Fix: the canonical-host guard (two header reads, free) still runs for every
  // route so hash-URL deployments keep redirecting and we don't get duplicate
  // content. The expensive session refresh runs ONLY where a session matters.
  // Public content pages keep their auth cookie untouched — the client reads it
  // directly for theme/locale.
  if (!needsServerSession(request)) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }))
  }

  // `updateSession` kendi `NextResponse.next({ request })`'ini kuruyor; nonce'u
  // Next'in script'lere bağlayabilmesi için değiştirilmiş istek header'ını
  // (özellikle Content-Security-Policy-Report-Only) ona vermek gerekiyor.
  const { response } = await updateSession(new NextRequest(request, { headers: requestHeaders }))
  return withCsp(response)
}

/** Routes whose behaviour actually depends on a refreshed server-side session. */
const SESSION_PREFIXES = [
  '/api',
  '/admin',
  '/auth',
  '/chat',
  '/login',
  '/puck',
  '/sign',
]

function needsServerSession(request: NextRequestType): boolean {
  const { pathname } = request.nextUrl
  return SESSION_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static, _next/image, favicon, public files, robots/sitemap
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|woff2?|txt|xml)$).*)',
  ],
}
