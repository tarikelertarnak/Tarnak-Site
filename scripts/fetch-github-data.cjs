// Build-time GitHub data generator — pulls profile + public repos from the
// GitHub REST API (no auth needed for public repos, 60 req/h IP limit) and
// writes public/github-data.json for client-side consumption.
// Runs automatically via the "prebuild" npm script.
const { writeFile, mkdir } = require('node:fs/promises')
const { dirname, join } = require('node:path')

const USERNAME = 'tarikelertarnak'
const API = 'https://api.github.com'

async function gh(path) {
  const token = process.env.GITHUB_TOKEN
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tarnak-site-builder',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`)
  return res.json()
}

async function main() {
  const [profile, repos] = await Promise.all([
    gh(`/users/${USERNAME}`),
    gh(`/users/${USERNAME}/repos?per_page=100&sort=updated&direction=desc`),
  ])

  const out = {
    success: true,
    profile: {
      login: profile.login,
      name: profile.name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      publicRepos: profile.public_repos,
      followers: profile.followers,
    },
    repos: repos.map(r => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.watchers_count,
      topics: r.topics ?? [],
      updatedAt: r.updated_at,
    })),
  }

  const dest = join(process.cwd(), 'public', 'github-data.json')
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  console.log(`github-data.json written: ${out.repos.length} repos`)
}

main().catch(err => {
  // Build'i KIRMA. public/github-data.json commit'te oldugu icin API'ye
  // ulasilamasa da site calisir. Cloudflare'de GITHUB_TOKEN yoksa 60 istek/saat
  // limiti kolayca dolar; eskiden process.exit(1) build'i patlatiyordu.
  console.error('fetch-github-data: GitHub verisi alinamadi ->', err.message)
  console.error('Commited public/github-data.json snapshot kullanilacak; build DEVAM ediyor.')
  process.exit(0)
})