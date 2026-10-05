import { NextResponse } from 'next/server'
import { fetchUserProfile, fetchUserRepos, isGitHubNotFound } from '@/lib/github'
import { GITHUB_CACHE_TTL_S, CachedNotFoundError, cachedJson } from '@/lib/kv-cache'

interface GithubUserData {
  profile: Awaited<ReturnType<typeof fetchUserProfile>> | null
  repos: Awaited<ReturnType<typeof fetchUserRepos>>
}

/**
 * 2026-10-05 — önbellek in-memory'den KV'ye taşındı.
 *
 * ÖNCEKİ: modül seviyesinde `let cache: CacheEntry | null` + 10 dk TTL.
 * Workers'ta her izole ayrı bellek taşıdığı için bu önbellek pratikte
 * ÇALIŞMIYORDU: her ziyaretçi yeni izoleye düşüyor, her istek GitHub'a
 * gidiyordu. Site trafiği arttıkça GitHub'un kimliksiz kotası (60/sa)
 * tükeniyor ve `/projects` sayfası bozuluyordu.
 *
 * YENİ: `kv-cache.ts` — KV'de 15 dk TTL. Ziyaretçi başına GitHub isteği
 * ~0'a iner, kota tükenmez. `GITHUB_TOKEN` zaten `lib/github.ts` içinde
 * okunuyor (varsa 5000/sa kotası kullanılıyor).
 *
 * Davranış korundu: 404 kullanıcı bulunamadı, 500 bağlanılamadı, ikisi de
 * hata önbelleğiyle 30 sn kısa TTL'de tutuluyor.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = (searchParams.get('username') ?? '').trim()

  if (!username) {
    return NextResponse.json({ success: false, message: 'Kullanıcı adı gerekli.' }, { status: 400 })
  }

  /*
    Tek sonuç tipi: `cachedJson` ya veri döner, ya `CachedNotFoundError`
    fırlatır (404). İkisini `.catch` ile bir discriminated union'a indirgiyoruz
    ki aşağıdaki `if` bloklarında TypeScript ayrımı yapabilsin
    (union'a doğrudan erişmek `data` alanını daraltıyordu).
  */
  type Outcome
    = | { kind: 'ok', data: GithubUserData | null, cache: 'HIT' | 'MISS' | 'BYPASS' }
      | { kind: 'notFound', message: string }

  // Önce KV önbelleğine bak. HIT ise GitHub'a HİÇ gitmeden dönüyoruz.
  const outcome = await cachedJson<GithubUserData | null>(
    `profile:${username}`,
    GITHUB_CACHE_TTL_S,
    async () => {
      let notFound = false
      const [profile, repos] = await Promise.all([
        fetchUserProfile(username).catch((error) => {
          console.error(`[api/github] failed to fetch profile (${username}):`, error)
          if (isGitHubNotFound(error)) notFound = true
          return null
        }),
        fetchUserRepos(username).catch((error) => {
          console.error(`[api/github] failed to fetch repos (${username}):`, error)
          if (isGitHubNotFound(error)) notFound = true
          return null
        }),
      ])

      if (!profile && !repos) {
        if (notFound) {
          throw new CachedNotFoundError(
            `"${username}" adlı GitHub kullanıcısı bulunamadı. Yönetim panelinden GitHub kullanıcı adını kontrol et.`,
          )
        }
        throw new Error('GitHub unreachable')
      }

      return { profile, repos: repos ?? [] }
    },
  ).then(
    r => ({ kind: 'ok', data: r.data, cache: r.cache }) as Outcome,
    (error): Outcome => {
      if (error instanceof CachedNotFoundError) {
        return { kind: 'notFound', message: error.message }
      }
      throw error
    },
  )

  if (outcome.kind === 'notFound') {
    return NextResponse.json(
      { success: false, notFound: true, message: outcome.message },
      { status: 404 },
    )
  }

  if (outcome.data) {
    const res = NextResponse.json({ success: true, ...outcome.data })
    res.headers.set('X-Cache', outcome.cache)
    res.headers.set('Cache-Control', `public, max-age=${GITHUB_CACHE_TTL_S}`)
    return res
  }

  // `data: null` = geçici hata (kısa TTL'li kayıt).
  const res = NextResponse.json(
    { success: false, message: 'GitHub\'a bağlanılamadı. Lütfen daha sonra tekrar deneyin.' },
    { status: 500 },
  )
  res.headers.set('X-Cache', outcome.cache)
  return res
}
