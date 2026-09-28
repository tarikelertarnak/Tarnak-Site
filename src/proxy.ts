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

  const { response } = await updateSession(request)
  return response
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
