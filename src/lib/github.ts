import { Buffer } from 'node:buffer'
import process from 'node:process'

// Cloudflare Workers has no node:dns/node:https — the route handlers run on
// Workers after deploy. There, global fetch is used directly (Workers' own
// DNS is fast and IPv6-correct). On Node (local dev/build) the DNS-bypass
// httpsGet below fixed the IPv6-first timeout on this machine.
const IS_WORKER = typeof navigator !== 'undefined' && navigator.userAgent.includes('Cloudflare')

// ponytail: DNS resolution on this machine can take 15s+, exceeding undici's 10s
// connect timeout. We cache the IP via dns.resolve4 for 10 minutes and connect
// directly to the IP with https.request (DNS bypass). Node only — Workers uses fetch.
const dnsCache = new Map<string, { ip: string, ts: number }>()
const DNS_CACHE_TTL = 10 * 60 * 1000

export function httpsGet(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 30_000,
): Promise<{ status: number, body: string }> {
  if (IS_WORKER) {
    return (async () => {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      })
      return { status: res.status, body: await res.text() }
    })()
  }
  return (async () => {
    const dns = await import('node:dns')
    const https = await import('node:https')
    const parsed = new URL(url)
    let ip: string
    try {
      const cachedHost = dnsCache.get(parsed.hostname)
      if (cachedHost && Date.now() - cachedHost.ts < DNS_CACHE_TTL) {
        ip = cachedHost.ip
      }
      else {
        ip = await new Promise<string>((resolve, reject) => {
          dns.resolve4(parsed.hostname, (err, addresses) => {
            if (err)
              return reject(err)
            const resolved = addresses[0]
            dnsCache.set(parsed.hostname, { ip: resolved, ts: Date.now() })
            resolve(resolved)
          })
        })
      }
    }
    catch {
      ip = parsed.hostname
    }
    return new Promise((resolve, reject) => {
      const req = https.get(
        {
          hostname: ip,
          port: 443,
          path: parsed.pathname + parsed.search,
          headers: { ...headers, Host: parsed.hostname },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', c => chunks.push(c))
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf-8'),
            }))
        },
      )
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`Timeout after ${timeoutMs}ms`))
      })
    })
  })()
}

export interface GitHubRepo {
  name: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  /** Watch (subscriber) count */
  watchers: number
  url: string
  updatedAt: string
  homepage: string | null
  /** Topic tags (for search/filtering) */
  topics?: string[]
}

export interface GitHubRepoDetails {
  owner: string
  repo: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  watchers: number
  homepage: string | null
  url: string
  defaultBranch: string
  readme: string | null
  tree: GitHubTreeEntry[]
  license: string | null
  updatedAt: string
  topics: string[]
  /** Repo visibility: 'public' | 'private' */
  visibility: string
  /** Open issue count */
  openIssues: number
}

export interface GitHubTreeEntry {
  path: string
  name: string
  type: 'blob' | 'tree'
  size?: number
}

export interface GitHubUserProfile {
  login: string
  name: string | null
  bio: string | null
  avatarUrl: string
  publicRepos: number
  followers: number
  following: number
}

export interface GitHubFileContent {
  path: string
  name: string
  size: number
  type: string | null
  content: string | null
  downloadUrl: string
  /** Content encoding (base64, etc.) */
  encoding?: string
}

export interface GitHubRelease {
  tagName: string
  name: string | null
  publishedAt: string | null
  body: string | null
  url: string
  assets: Array<{ name: string, size: number, downloadUrl: string }>
}

const API_BASE = 'https://api.github.com'

/** GitHub API requests — DNS bypass via direct IP connection with httpsGet. */
async function ghFetch(url: string, init?: RequestInit): Promise<Response> {
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'tarikeler-portfolio',
    ...(init?.headers as Record<string, string> ?? {}),
  }
  const token = process.env.GITHUB_TOKEN
  if (token)
    h.Authorization = `Bearer ${token}`

  const { status, body } = await httpsGet(url, h, 60_000)
  return new Response(body, { status, headers: { 'Content-Type': 'application/json' } })
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'tarikeler-portfolio',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    h.Authorization = `Bearer ${token}`
  }
  return h
}

export async function fetchUserRepos(username: string): Promise<GitHubRepo[]> {
  const res = await ghFetch(
    `${API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
    { headers: headers(), cache: 'no-store' },
  )
  if (!res.ok) {
    throw new Error(`GitHub hatası: ${res.status}`)
  }
  const reposRaw = (await res.json()) as Array<{
    name: string
    full_name: string
    description: string | null
    language: string | null
    stargazers_count: number
    forks_count: number
    watchers_count: number
    html_url: string
    updated_at: string
    homepage: string | null
    fork: boolean
  }>
  return reposRaw
    .filter(repo => !repo.fork)
    .map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      url: repo.html_url,
      updatedAt: repo.updated_at,
      homepage: repo.homepage,
    }))
    .sort((a, b) => b.stars - a.stars)
}

function rewriteMarkdownImages(
  markdown: string,
  owner: string,
  repo: string,
  branch: string,
): string {
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`
  return markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, src, text, link) => {
      const url = src || link
      if (
        !url
        || url.startsWith('http')
        || url.startsWith('/')
        || url.startsWith('#')
        || url.startsWith('mailto:')
        || url.startsWith('data:')
      ) {
        return match
      }
      const resolved = `${rawBase}${url.replace(/^\.\//, '')}`
      if (alt !== undefined) {
        return `![${alt}](${resolved})`
      }
      return `[${text}](${resolved})`
    },
  )
}

export async function fetchRepoDetails(
  owner: string,
  repo: string,
  opts?: { forceStatic?: boolean },
): Promise<GitHubRepoDetails> {
  const cache: 'force-cache' | 'no-store' = opts?.forceStatic ? 'force-cache' : 'no-store'
  const repoRes = await ghFetch(
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: headers(), cache },
  )
  if (!repoRes.ok) {
    throw new Error(`GitHub hatası: ${repoRes.status}`)
  }
  const repoData = (await repoRes.json()) as {
    description: string | null
    language: string | null
    stargazers_count: number
    forks_count: number
    subscribers_count: number
    homepage: string | null
    html_url: string
    default_branch: string
    updated_at: string
    topics: string[]
    visibility: string
    open_issues_count: number
    license: { name: string } | null
  }
  const defaultBranch = repoData.default_branch || 'main'

  let readme: string | null = null
  const readmeRes = await ghFetch(
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    { headers: headers(), cache },
  )
  if (readmeRes.ok) {
    const readmeData = (await readmeRes.json()) as { content: string }
    readme = Buffer.from(readmeData.content, 'base64').toString('utf-8')
    readme = rewriteMarkdownImages(readme, owner, repo, defaultBranch)
  }

  let tree: GitHubTreeEntry[] = []
  const treeRes = await ghFetch(
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    { headers: headers(), cache },
  )
  if (treeRes.ok) {
    const treeData = (await treeRes.json()) as {
      tree: Array<{ path: string, type: string, size?: number }>
    }
    tree = treeData.tree
      .filter(entry => entry.type === 'blob' || entry.type === 'tree')
      .filter(entry => !entry.path.includes('node_modules') && !entry.path.includes('.git/'))
      .slice(0, 400)
      .map((entry) => {
        const parts = entry.path.split('/')
        return {
          path: entry.path,
          name: parts[parts.length - 1] ?? entry.path,
          type: entry.type === 'tree' ? ('tree' as const) : ('blob' as const),
          size: entry.size,
        }
      })
  }

  return {
    owner,
    repo,
    description: repoData.description,
    language: repoData.language,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    watchers: repoData.subscribers_count,
    homepage: repoData.homepage,
    url: repoData.html_url,
    defaultBranch,
    readme,
    tree,
    license: repoData.license?.name ?? null,
    updatedAt: repoData.updated_at,
    topics: repoData.topics ?? [],
    visibility: repoData.visibility,
    openIssues: repoData.open_issues_count,
  }
}

export function repoZipUrl(owner: string, repo: string, branch: string): string {
  return `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/refs/heads/${encodeURIComponent(branch)}`
}

export async function fetchUserProfile(username: string): Promise<GitHubUserProfile> {
  const res = await ghFetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`GitHub hatası: ${res.status}`)
  }
  const data = (await res.json()) as {
    login: string
    name: string | null
    bio: string | null
    avatar_url: string
    public_repos: number
    followers: number
    following: number
  }
  return {
    login: data.login,
    name: data.name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
  }
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<GitHubFileContent> {
  const res = await ghFetch(
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`,
    { headers: headers(), cache: 'no-store' },
  )
  if (!res.ok) {
    throw new Error(`GitHub hatası: ${res.status}`)
  }
  const data = (await res.json()) as {
    name: string
    size: number
    type: string
    content?: string
    encoding?: string
    download_url: string | null
  }
  if (Array.isArray(data)) {
    throw new TypeError('Dizin: dosya seçildi.')
  }
  let content: string | null = null
  if (typeof data.content === 'string' && data.encoding === 'base64') {
    content = Buffer.from(data.content, 'base64').toString('utf-8')
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

export async function fetchRepoReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
  const res = await ghFetch(
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=10`,
    { headers: headers(), cache: 'no-store' },
  )
  if (!res.ok) {
    if (res.status === 404) {
      return []
    }
    throw new Error(`GitHub hatası: ${res.status}`)
  }
  const data = (await res.json()) as Array<{
    tag_name: string
    name: string | null
    published_at: string | null
    body: string | null
    html_url: string
    assets: Array<{ name: string, size: number, browser_download_url: string }>
  }>
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
