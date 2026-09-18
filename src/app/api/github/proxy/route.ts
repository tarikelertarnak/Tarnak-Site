import { NextResponse } from 'next/server'
import { httpsGet } from '@/lib/github'

/**
 * Server proxy for the GitHub API — routes requests that would otherwise
 * go directly from the browser to api.github.com (releases, file content)
 * through the server: uses GITHUB_TOKEN (higher rate limit), the DNS/IPv4
 * bypass works (github.ts httpsGet) and results are cached for 10 min.
 */
const GITHUB_ORIGIN = 'https://api.github.com'
const CACHE_TTL_MS = 10 * 60 * 1000

/**
 * GUVENLIK: bu uc KIMLIK DOGRULAMASIZ ve istege sunucunun GITHUB_TOKEN'ini
 * ekliyor. Eskiden tek kontrol `target.startsWith('https://api.github.com/')`
 * idi — yani internetten HERKES sunucunun token'iyla HERHANGI bir GitHub
 * API ucunu cagirabiliyordu. Ornek gercek saldiri:
 *   /api/github/proxy?url=https://api.github.com/user/repos?visibility=private
 * -> token'in gorebildigi ozel repolar disari sizardi.
 *
 * Artik yalnizca sitenin gercekten kullandigi iki yol gecer
 * (bkz. src/lib/github-client.ts). Yeni bir GitHub cagrisi eklerken
 * buraya da desen ekle.
 */
const ALLOWED_PATHS: RegExp[] = [
  /^\/repos\/[^/]+\/[^/]+\/releases$/,
  /^\/repos\/[^/]+\/[^/]+\/contents\/.+$/,
]

/** origin + pathname allowlist. String prefix yerine URL ayristirma:
 *  userinfo / port / yuzde-kodlama kacislarini da kapatir. */
function isAllowedTarget(target: string): boolean {
  let u: URL
  try {
    u = new URL(target)
  }
  catch {
    return false
  }
  if (u.origin !== GITHUB_ORIGIN)
    return false
  return ALLOWED_PATHS.some(re => re.test(u.pathname))
}

/**
 * Cache'i sinirla. Eskiden sinirsiz buyuyordu ve anahtar saldirganin
 * kontrolundeki `url` parametresiydi -> her istekte farkli URL gonderip
 * bellek sisirilebiliyordu (Cloudflare Worker 128MB limiti -> DoS).
 */
const MAX_CACHE_ENTRIES = 500

const cache = new Map<string, { body: string, status: number, ts: number }>()

function pruneCache(now: number) {
  if (cache.size <= MAX_CACHE_ENTRIES)
    return
  for (const [k, v] of cache) {
    if (now - v.ts >= CACHE_TTL_MS)
      cache.delete(k)
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined)
      break
    cache.delete(oldest)
  }
}

export async function GET(req: Request) {
  const target = (new URL(req.url).searchParams.get('url') ?? '').trim()

  if (!isAllowedTarget(target)) {
    return NextResponse.json(
      { success: false, message: 'Geçersiz URL.' },
      { status: 400 },
    )
  }

  pruneCache(Date.now())

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
