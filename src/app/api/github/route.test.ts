import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `/api/github` hata siniflandirmasi.
 *
 * Neden onemli: eskiden "kullanici YOK (404)" ile "GitHub'a ulasilamadi"
 * AYNI yaniti veriyordu (500 + "sonra tekrar deneyin"). Yanlis kullanici adi
 * yazan biri sonsuza kadar bosuna denerdi — sorun ag degil, yazim hatasiydi.
 * Bu testler ikisinin AYRI yanit verdigini kilitler.
 *
 * `@/lib/github`'in gercek `GitHubApiError` / `isGitHubNotFound`'u korunur;
 * yalnizca ag cagrilari (fetchUserProfile/fetchUserRepos) taklit edilir.
 */
vi.mock('@/lib/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/github')>()
  return {
    ...actual,
    fetchUserProfile: vi.fn(),
    fetchUserRepos: vi.fn(),
  }
})

const github = await import('@/lib/github')
const { GET } = await import('@/app/api/github/route')

function call(username: string) {
  return GET(new Request(`http://localhost/api/github?username=${encodeURIComponent(username)}`))
}

beforeEach(() => {
  vi.mocked(github.fetchUserProfile).mockReset()
  vi.mocked(github.fetchUserRepos).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/github', () => {
  it('kullanici adi bos ise 400 doner', async () => {
    const res = await call('')
    expect(res.status).toBe(400)
  })

  it('kullanici YOKSA 404 + yol gosteren mesaj doner', async () => {
    // Her test farkli kullanici adi kullanir: route modul seviyesinde
    // onbellek tutuyor, ayni ad testler arasinda sizabilir.
    vi.mocked(github.fetchUserProfile).mockRejectedValue(new github.GitHubApiError(404, 'profile'))
    vi.mocked(github.fetchUserRepos).mockRejectedValue(new github.GitHubApiError(404, 'repos'))

    const res = await call('yok-boyle-kullanici-1')
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.notFound).toBe(true)
    expect(body.message).toContain('bulunamadı')
    // Mesaj NE YAPILACAGINI soylemeli, "sonra tekrar dene" dememeli
    expect(body.message).toContain('kullanıcı adı')
    expect(body.message).not.toContain('tekrar deneyin')
  })

  it('gercek bir kesinti (404 DEGIL) ise 500 + gecici mesaj doner', async () => {
    vi.mocked(github.fetchUserProfile).mockRejectedValue(new github.GitHubApiError(503, 'profile'))
    vi.mocked(github.fetchUserRepos).mockRejectedValue(new github.GitHubApiError(503, 'repos'))

    const res = await call('gecici-hata-2')
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.notFound).toBeUndefined()
    expect(body.message).toContain('tekrar deneyin')
  })

  it('ag hatasi (GitHubApiError degil) 500 doner, 404 DEMEZ', async () => {
    vi.mocked(github.fetchUserProfile).mockRejectedValue(new Error('ETIMEDOUT'))
    vi.mocked(github.fetchUserRepos).mockRejectedValue(new Error('ETIMEDOUT'))

    const res = await call('ag-hatasi-3')
    expect(res.status).toBe(500)
    expect((await res.json()).notFound).toBeUndefined()
  })

  it('basarili yanitta profil ve repolari doner', async () => {
    vi.mocked(github.fetchUserProfile).mockResolvedValue({
      login: 'tarikelertarnak',
      name: 'TARIK ELER',
    } as Awaited<ReturnType<typeof github.fetchUserProfile>>)
    vi.mocked(github.fetchUserRepos).mockResolvedValue([])

    const res = await call('basarili-4')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.profile.login).toBe('tarikelertarnak')
  })

  it('profil duser ama repo gelirse yine 200 (kismi basari)', async () => {
    vi.mocked(github.fetchUserProfile).mockRejectedValue(new github.GitHubApiError(500, 'profile'))
    vi.mocked(github.fetchUserRepos).mockResolvedValue([])

    const res = await call('kismi-5')
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

describe('GitHubApiError / isGitHubNotFound', () => {
  it('durum kodunu tasir', () => {
    const err = new github.GitHubApiError(404, 'profile: x')
    expect(err.status).toBe(404)
    expect(err.name).toBe('GitHubApiError')
    expect(err.message).toContain('404')
    expect(err.message).toContain('profile: x')
  })

  it('yalnizca 404 icin true doner', () => {
    expect(github.isGitHubNotFound(new github.GitHubApiError(404))).toBe(true)
    expect(github.isGitHubNotFound(new github.GitHubApiError(500))).toBe(false)
    expect(github.isGitHubNotFound(new Error('GitHub hatası: 404'))).toBe(false)
    expect(github.isGitHubNotFound(null)).toBe(false)
  })
})
