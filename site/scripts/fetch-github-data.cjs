// Build-time GitHub data generator — pulls profile + public repos from the
// GitHub REST API (no auth needed for public repos, 60 req/h IP limit) and
// writes public/github-data.json for client-side consumption.
// Also writes public/github-contributions.json (yearly contribution calendar)
// via the GraphQL API — that one NEEDS GITHUB_TOKEN.
// Runs automatically via the "prebuild" npm script.
const { writeFile, mkdir } = require('node:fs/promises')
const { dirname, join } = require('node:path')

const USERNAME = 'tarikelertarnak'
const API = 'https://api.github.com'
const GRAPHQL = 'https://api.github.com/graphql'

async function gh(path) {
  const token = process.env.GITHUB_TOKEN
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'tarnak-site-builder',
  }
  if (token)
    headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(30_000) })
  if (!res.ok)
    throw new Error(`GitHub API ${res.status}: ${path}`)
  return res.json()
}

/**
 * Yıllık katkı takvimi (GitHub GraphQL).
 *
 * NEDEN AYRI DOSYA: takvim ~371 günlük kayıt; `github-data.json` her GitHub
 * görünümünde okunuyor, takvimi oraya gömmek gereksiz yük olurdu.
 *
 * Token yoksa veya istek düşerse DOSYA YAZILMAZ — eski snapshot korunur ve
 * build kırılmaz (REST tarafıyla aynı sözleşme).
 *
 * GÜN KIRILIMI: `commitContributionsByRepository` düğümü = (gün, depo) çifti,
 * sayı `commitCount` alanında. `occurredAt` GitHub'ın kendi gün sınırına göre
 * damgalı (07:00Z = TR 10:00) → ilk 10 karakter takvimle AYNI günü verir.
 * Ölçüldü (2026-10-31): 2026-09-24 kırılımı 37+1 = 38 = takvim değeri.
 */
async function fetchContributions() {
  const token = process.env.GITHUB_TOKEN
  if (!token)
    throw new Error('GITHUB_TOKEN yok — GraphQL katkı takvimi kimlik doğrulaması ister')

  const query = `query($login:String!){
    user(login:$login){
      contributionsCollection{
        restrictedContributionsCount
        contributionCalendar{
          totalContributions
          weeks{ contributionDays{ contributionCount date } }
        }
        commitContributionsByRepository(maxRepositories:100){
          repository{ nameWithOwner url }
          contributions(first:100){ nodes{ occurredAt commitCount } }
        }
      }
    }
  }`

  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'tarnak-site-builder',
    },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok)
    throw new Error(`GitHub GraphQL ${res.status}`)

  const body = await res.json()
  if (Array.isArray(body.errors) && body.errors.length > 0)
    throw new Error(`GitHub GraphQL: ${body.errors[0].message}`)

  const collection = body?.data?.user?.contributionsCollection
  const calendar = collection?.contributionCalendar
  if (!calendar || !Array.isArray(calendar.weeks))
    throw new Error('GitHub GraphQL: katkı takvimi boş döndü')

  const weeks = calendar.weeks.map(week => (week.contributionDays ?? []).map(day => ({
    date: day.date,
    count: day.contributionCount,
  })))
  const days = weeks.flat()
  if (days.length === 0)
    throw new Error('GitHub GraphQL: takvimde gün yok')

  /*
    GÜN KIRILIMI → `activity[gün] = [{ repo, url, count }]`.
    Sayı `commitCount`tan gelir (düğüm başına 1 saymak 2026-10-31'de yanlıştı:
    37 commit'lik gün "1 commit" görünüyordu). Depo başına ilk 100 (gün, depo)
    düğümü alınır — yılda 100'den fazla aktif günü olan depo varsa kuyruk
    kırpılır; o gün "N katkı" der, depo listesi eksik kalır (uydurma yok).
  */
  const activity = {}
  for (const entry of collection?.commitContributionsByRepository ?? []) {
    const repo = entry?.repository?.nameWithOwner
    if (!repo)
      continue
    const url = entry.repository.url ?? `https://github.com/${repo}`
    for (const node of entry.contributions?.nodes ?? []) {
      const { occurredAt, commitCount } = node ?? {}
      if (typeof occurredAt !== 'string' || !(commitCount > 0))
        continue
      const date = occurredAt.slice(0, 10)
      const list = activity[date] ?? (activity[date] = [])
      list.push({ repo, url, count: commitCount })
    }
  }
  for (const date of Object.keys(activity))
    activity[date].sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo))

  return {
    success: true,
    login: USERNAME,
    generatedAt: new Date().toISOString(),
    totalContributions: calendar.totalContributions ?? 0,
    restrictedContributionsCount: collection.restrictedContributionsCount ?? 0,
    from: days[0].date,
    to: days[days.length - 1].date,
    weeks,
    activity,
  }
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
      /*
        `fetchUserRepos` (lib/github.ts) ile AYNI alan seti. Statik export
        (GitHub Pages) bu snapshot'ı okur; burada eksik bırakılan bir alan
        Cloudflare deploy'unda görünüp Pages'te kaybolurdu (2026-10-21:
        lisans/issue/varsayılan dal eklendi).
      */
      license: r.license?.spdx_id ?? r.license?.name ?? null,
      openIssues: r.open_issues_count ?? 0,
      defaultBranch: r.default_branch,
      archived: r.archived ?? false,
    })),
  }

  const dest = join(process.cwd(), 'public', 'github-data.json')
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, `${JSON.stringify(out, null, 2)}\n`, 'utf-8')
  console.log(`github-data.json written: ${out.repos.length} repos`)

  /*
    Katkı takvimi REST'e bağlı DEĞİL: ayrı try/catch — token yoksa veya GraphQL
    düşerse yalnız takvim atlanır, depo verisi yine yazılır.
  */
  try {
    const contributions = await fetchContributions()
    const cDest = join(process.cwd(), 'public', 'github-contributions.json')
    await writeFile(cDest, `${JSON.stringify(contributions, null, 2)}\n`, 'utf-8')
    console.log(`github-contributions.json written: ${contributions.weeks.length} weeks, ${contributions.totalContributions} contributions`)
  }
  catch (err) {
    console.error('fetch-github-data: katkı takvimi alinamadi ->', err.message)
    console.error('Commited public/github-contributions.json snapshot kullanilacak.')
  }
}

main().catch((err) => {
  // Build'i KIRMA. public/github-data.json commit'te oldugu icin API'ye
  // ulasilamasa da site calisir. Cloudflare'de GITHUB_TOKEN yoksa 60 istek/saat
  // limiti kolayca dolar; eskiden process.exit(1) build'i patlatiyordu.
  console.error('fetch-github-data: GitHub verisi alinamadi ->', err.message)
  console.error('Commited public/github-data.json snapshot kullanilacak; build DEVAM ediyor.')
  process.exit(0)
})
