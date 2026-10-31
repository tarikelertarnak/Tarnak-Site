/**
 * Build sırasında üretilen GitHub anlık görüntüsü (2026-10-31).
 *
 * Kaynak: `scripts/fetch-github-data.cjs` (prebuild). İki dosya üretir —
 * `public/github-data.json` (profil + depolar, istemci de okuyor) ve
 * `public/github-contributions.json` (yıllık katkı takvimi).
 *
 * NEDEN STATİK IMPORT: `/now` sayfası `force-static`; çalışma anında ağ
 * çağrısı yapamaz (Workers'ta fs de yok). JSON build sırasında paketlenir,
 * böylece sayfa ilk boyamada dolu gelir ve boş "yükleniyor" durumu olmaz.
 *
 * ⚠️ Bu dosyalar commit'te durur; ağ düşerse script eski snapshot'ı korur.
 */
import contributionsRaw from '../../public/github-contributions.json'
import githubRaw from '../../public/github-data.json'
import type { ContributionCalendar } from './github-contributions'
import { normalizeContributions } from './github-contributions'

export interface GithubSnapshotStats {
  login: string
  repos: number
  stars: number
  followers: number
}

/** Katkı takvimi — dosya bozuksa `null` (bölüm çizilmez, sayfa çökmez). */
export function getContributionCalendar(): ContributionCalendar | null {
  return normalizeContributions(contributionsRaw)
}

/** Profil sayıları (depo/yıldız/takipçi) — ham snapshot'tan. */
export function getGithubStats(): GithubSnapshotStats {
  const profile = githubRaw.profile as { login?: string, publicRepos?: number, followers?: number }
  const repos = (githubRaw.repos ?? []) as Array<{ stars?: number }>
  const stars = repos.reduce((sum, repo) => sum + (typeof repo.stars === 'number' ? repo.stars : 0), 0)

  return {
    login: profile.login ?? 'tarikelertarnak',
    repos: typeof profile.publicRepos === 'number' ? profile.publicRepos : repos.length,
    stars,
    followers: typeof profile.followers === 'number' ? profile.followers : 0,
  }
}
