import { NextResponse } from 'next/server'
import { httpsGet } from '@/lib/github'

/**
 * Server proxy for the GitHub API — routes requests that would otherwise
 * go directly from the browser to api.github.com (releases, file content)
 * through the server: uses GITHUB_TOKEN (higher rate limit), the DNS/IPv4
 * bypass works (github.ts httpsGet) and results are cached for 10 min.
 */
const ALLOWED_PREFIX = 'https://api.github.com/'
const CACHE_TTL_MS = 10 * 60 * 1000

const cache = new Map<string, { body: string, status: number, ts: number }>()

export async function GET(req: Request) {
  const target = (new URL(req.url).searchParams.get('url') ?? '').trim()

  if (!target.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      { success: false, message: 'Geçersiz URL.' },
      { status: 400 },
    )
  }

  const cached = cache.get(target)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return new NextResponse(cached.body, {
      status: cached.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'tarikeler-portfolio',
  }
  const token = process.env.GITHUB_TOKEN
  if (token)
    h.Authorization = `Bearer ${token}`

  try {
    const { status, body } = await httpsGet(target, h, 60_000)
    // Cache only successful and 4xx (resource missing) responses — 5xx/403 are retried
    if (status >= 200 && status < 500) {
      cache.set(target, { body, status, ts: Date.now() })
    }
    return new NextResponse(body, {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (err) {
    console.error('[api/github/proxy] GitHub request failed:', err)
    return NextResponse.json(
      { success: false, message: 'GitHub proxy hatası.' },
      { status: 502 },
    )
  }
}
