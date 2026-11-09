import type { GitHubRawRepo } from '@/lib/github'
import { describe, expect, it } from 'vitest'

import { mapGitHubRepos } from '@/lib/github'

/**
 * GitHub liste ucu → `GitHubRepo` eşlemesi.
 *
 * 2026-10-21 canlı hata: `topics` (konular), `license`, `openIssues`,
 * `defaultBranch` ve `archived` alanları eşlemede ATILIYORDU → `/projects`
 * sayfasındaki HER GitHub kartı etiketsiz (0 konu) ve lisanssız görünüyordu.
 * Accentra'nın 15 konusu GitHub'da duruyordu, sitede hiçbiri yoktu.
 *
 * Negatif kontrol: alanlar yanlışlıkla düşürülürse bu test kırmızıya döner.
 */
function raw(over: Partial<GitHubRawRepo> = {}): GitHubRawRepo {
  return {
    name: 'repo',
    full_name: 'owner/repo',
    description: 'desc',
    language: 'TypeScript',
    stargazers_count: 3,
    forks_count: 1,
    watchers_count: 2,
    html_url: 'https://github.com/owner/repo',
    updated_at: '2026-10-01T00:00:00Z',
    homepage: null,
    fork: false,
    ...over,
  }
}

describe('mapGitHubRepos', () => {
  it('konuları (topics) KORUR — etiketsiz kart regresyonu', () => {
    const topics = ['2fa', 'accentra', 'account', 'mcp', 'security']
    const [repo] = mapGitHubRepos([raw({ topics })])
    expect(repo.topics).toEqual(topics)
  })

  it('konu yoksa bos dizi döner (undefined degil)', () => {
    const [repo] = mapGitHubRepos([raw()])
    expect(repo.topics).toEqual([])
  })

  it('lisansı SPDX id üzerinden alır, yoksa null', () => {
    const [spdx] = mapGitHubRepos([raw({ license: { spdx_id: 'MIT', name: 'MIT License' } })])
    expect(spdx.license).toBe('MIT')

    const [nameOnly] = mapGitHubRepos([raw({ license: { spdx_id: null, name: 'Özel Lisans' } })])
    expect(nameOnly.license).toBe('Özel Lisans')

    const [none] = mapGitHubRepos([raw({ license: null })])
    expect(none.license).toBeNull()
  })

  it('açık issue, varsayılan dal ve arsiv bayrağını taşır', () => {
    const [repo] = mapGitHubRepos([
      raw({ open_issues_count: 4, default_branch: 'master', archived: true }),
    ])
    expect(repo.openIssues).toBe(4)
    expect(repo.defaultBranch).toBe('master')
    expect(repo.archived).toBe(true)
  })

  it('eksik sayac/alanlarda guvenli varsayilan kullanir', () => {
    const [repo] = mapGitHubRepos([raw({ open_issues_count: undefined, archived: undefined })])
    expect(repo.openIssues).toBe(0)
    expect(repo.archived).toBe(false)
  })

  it('fork (mirror) depolari eler', () => {
    const repos = mapGitHubRepos([raw({ name: 'a' }), raw({ name: 'b', fork: true })])
    expect(repos.map(r => r.name)).toEqual(['a'])
  })

  it('yildiza gore siralar (coktan az a)', () => {
    const repos = mapGitHubRepos([
      raw({ name: 'low', stargazers_count: 1 }),
      raw({ name: 'high', stargazers_count: 9 }),
    ])
    expect(repos.map(r => r.name)).toEqual(['high', 'low'])
  })
})
