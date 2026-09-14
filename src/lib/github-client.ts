import type {
  GitHubFileContent,
  GitHubRelease,
  GitHubRepo,
  GitHubUserProfile,
} from '@/lib/github'

const API_BASE = 'https://api.github.com'

/**
 * User profile + repo list.
 *
 * Static export (GitHub Pages): no /api/* routes exist, so a build-time
 * snapshot at /github-data.json is read instead. It is regenerated on every
 * build by scripts/fetch-github-data.cjs (prebuild hook).
 *
 * Server-rendered (Cloudflare/OpenNext): the /api/github proxy is used so
 * GITHUB_TOKEN stays server-side and responses are cached.
 */
async function fetchUserData(
  username: string,
): Promise<{ profile: GitHubUserProfile | null, repos: GitHubRepo[] }> {
  // Same-origin /api/github exists only in SSR deployments (Cloudflare).
  // In static export it returns 404 — fall back to the build-time snapshot.
  const apiRes = await fetch(
    `/api/github/?username=${encodeURIComponent(username)}`,
    { signal: AbortSignal.timeout(15_000) },
  )
  if (apiRes.ok) {
    const data = (await apiRes.json()) as {
      success: boolean
      profile: GitHubUserProfile | null
      repos: GitHubRepo[] | null
    }
    if (data.success) {
      return { profile: data.profile, repos: data.repos ?? [] }
    }
    throw new Error('GitHub verisi alınamadı.')
  }
  // 404 (static export) — use the build-time snapshot.
  const snap = (await (await fetch('/github-data.json', {
    signal: AbortSignal.timeout(15_000),
  })).json()) as {
    success: boolean
    profile: GitHubUserProfile | null
    repos: GitHubRepo[] | null
  }
  if (!snap.success) {
    throw new Error('GitHub verisi alınamadı.')
  }
  return { profile: snap.profile, repos: snap.repos ?? [] }
}

async function getJSON<T>(url: string): Promise<T> {
  // Direct browser requests to api.github.com hit DNS/timeout issues on this
  // machine and fall into the tokenless 60/h rate limit — route through server proxy.
  const res = await fetch(
    `/api/github/proxy?url=${encodeURIComponent(url)}`,
    {
      // Server proxy uses 60s httpsGet timeout; here use 75s
      signal: AbortSignal.timeout(75_000),
    },
  )
  if (!res.ok) {
    throw new Error(`GitHub hatası: ${res.status}`)
  }
  return res.json() as Promise<T>
}

function decodeBase64(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

export async function clientFetchUserRepos(username: string): Promise<GitHubRepo[]> {
  const { repos } = await fetchUserData(username)
  return repos
}

export async function clientFetchUserProfile(
  username: string,
): Promise<GitHubUserProfile> {
  const { profile } = await fetchUserData(username)
  if (!profile) {
    throw new Error('GitHub profili alınamadı.')
  }
  return profile
}

export async function clientFetchRepoReleases(
  owner: string,
  repo: string,
): Promise<GitHubRelease[]> {
  const data = await getJSON<
    Array<{
      tag_name: string
      name: string | null
      published_at: string | null
      body: string | null
      html_url: string
      assets: Array<{
        name: string
        size: number
        browser_download_url: string
      }>
    }>
  >(
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=10`,
  )
  return data.map(release => ({
    tagName: release.tag_name,
    name: release.name,
    publishedAt: release.published_at,
    body: release.body,
    url: release.html_url,
    assets: release.assets.map(asset => ({
      name: asset.name,
      size: asset.size,
      downloadUrl: asset.browser_download_url,
    })),
  }))
}

export async function clientFetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<GitHubFileContent> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`
  const data = await getJSON<{
    name: string
    size: number
    type: string
    content?: string
    encoding?: string
    download_url: string | null
  }>(url)
  if (Array.isArray(data)) {
    throw new TypeError('Dizin: dosya seçildi.')
  }
  let content: string | null = null
  if (typeof data.content === 'string' && data.encoding === 'base64') {
    content = decodeBase64(data.content)
  }
  return {
    path,
    name: data.name,
    size: data.size,
    type: data.type,
    content,
    downloadUrl:
      data.download_url
      ?? `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
  }
}
