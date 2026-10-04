import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
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

function redirectToCanonical(request: NextRequest): NextResponse | null {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  if (!host || LOCAL_HOSTS.has(host) || host === CANONICAL_HOST)
    return null
  const url = request.nextUrl.clone()
  url.host = CANONICAL_HOST
  url.protocol = 'https:'
  return NextResponse.redirect(url, 308)
}

export async function proxy(request: NextRequest) {
  const guard = redirectToCanonical(request)
  if (guard)
    return guard

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
    return NextResponse.next()
  }

  const { response } = await updateSession(request)
  return response
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

function needsServerSession(request: NextRequest): boolean {
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
