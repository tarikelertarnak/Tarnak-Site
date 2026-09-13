import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Restricts the next parameter to a safe local path — open redirect protection. */
function safeNextPath(raw: string | null): string {
  const value = raw ?? '/'
  // Only relative, local paths are accepted (//host, /\\host, scheme:... rejected)
  if (
    value.startsWith('/')
    && !value.startsWith('//')
    && !value.startsWith('/\\')
    && !value.includes('\\')
    && !/^[a-z][a-z0-9+.-]*:/i.test(value)
  ) {
    return value.slice(0, 500)
  }
  return '/'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      if (forwardedHost && /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(forwardedHost)) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // no code or error → redirect back to the home page
  return NextResponse.redirect(`${origin}/?error=auth`)
}
