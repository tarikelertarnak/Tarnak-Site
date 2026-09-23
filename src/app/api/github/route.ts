import { NextResponse } from 'next/server'
import { fetchUserProfile, fetchUserRepos, isGitHubNotFound } from '@/lib/github'

interface GithubUserData {
  profile: Awaited<ReturnType<typeof fetchUserProfile>> | null
  repos: Awaited<ReturnType<typeof fetchUserRepos>>
}

interface CacheEntry {
  username: string
  /** null = the last request failed (retried with a short TTL) */
  data: GithubUserData | null
  ts: number
}

const CACHE_TTL_MS = 10 * 60 * 1000
const FAIL_CACHE_TTL_MS = 30_000

let cache: CacheEntry | null = null

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = (searchParams.get('username') ?? '').trim()

  if (!username) {
    return NextResponse.json({ success: false, message: 'Kullanıcı adı gerekli.' }, { status: 400 })
  }

  // Cache check
  if (cache && cache.username === username) {
    if (cache.data) {
      if (Date.now() - cache.ts < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, ...cache.data })
      }
    }
    else if (Date.now() - cache.ts < FAIL_CACHE_TTL_MS) {
      return NextResponse.json(
        { success: false, message: 'GitHub\'a bağlanılamadı. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 },
      )
    }
    // TTL expired — try again
  }

  // Fetch both requests in parallel; if one fails, the other still returns
  let notFound = false
  const [profile, repos] = await Promise.all([
    fetchUserProfile(username).catch((error) => {
      console.error(`[api/github] failed to fetch profile (${username}):`, error)
      if (isGitHubNotFound(error)) {
        notFound = true
      }
      return null
    }),
    fetchUserRepos(username).catch((error) => {
      console.error(`[api/github] failed to fetch repos (${username}):`, error)
      if (isGitHubNotFound(error)) {
        notFound = true
      }
      return null
    }),
  ])

  if (!profile && !repos) {
    // Kullanici YOK (404) ile "GitHub'a ulasilamadi" AYNI sey degildir.
    // Eskiden ikisi de 500 + "sonra tekrar deneyin" donuyordu; yanlis
    // kullanici adi yazan kullanici sonsuza kadar bosuna denerdi.
    if (notFound) {
      // Kisa TTL ile onbellekle: yanlis ad her istekte GitHub'a gitmesin,
      // ama kullanici duzeltince 30 sn icinde kendine gelsin.
      cache = { username, data: null, ts: Date.now() }
      return NextResponse.json(
        {
          success: false,
          notFound: true,
          message: `"${username}" adlı GitHub kullanıcısı bulunamadı. Yönetim panelinden GitHub kullanıcı adını kontrol et.`,
        },
        { status: 404 },
      )
    }
    cache = { username, data: null, ts: Date.now() }
    return NextResponse.json(
      { success: false, message: 'GitHub\'a bağlanılamadı. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 },
    )
  }

  const data: GithubUserData = { profile, repos: repos ?? [] }
  cache = { username, data, ts: Date.now() }
  return NextResponse.json({ success: true, ...data })
}
