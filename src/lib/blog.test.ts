import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Blog yazma sonucu (PostWriteResult) testleri.
 *
 * REGRESYON: `upsertPost`/`deletePost` Supabase hatasini yalnizca
 * `console.error` ile yazip YUTUYORDU ve `void` donuyordu. Route da kosulsuz
 * `{ success: true, message: 'Yazı kaydedildi.' }` dondugu icin yazim
 * basarisiz olsa bile panel "kaydedildi" diyordu — kullanici yazisinin
 * yayinlandigini saniyordu.
 *
 * Burada ozellikle sunu kilitliyoruz: Supabase yapilandirilmissa ve yazim
 * basarisizsa sonuc `ok: false` OLMALI — "yerel yedek dosyaya yazdim" diye
 * basarili sayilmamali (production'da yerel dosya kalici degil).
 */

const writeFileMock = vi.fn()
const readFileMock = vi.fn()

vi.mock('node:fs', () => {
  const promises = {
    readFile: (...args: unknown[]) => readFileMock(...args),
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  }
  // Bazi moduller `import fs from 'node:fs'` yapiyor → default da sart.
  return { promises, default: { promises } }
})

const createClientMock = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

/** Zincirlenebilir sahte Supabase istemcisi. */
function makeClient(opts: {
  existing?: { id: number } | null
  error?: { code: string, message: string } | null
  /** delete().eq().select() sonucu — silinen satirlar (yok = kayit bulunamadi) */
  deleted?: { id: number }[] | null
} = {}) {
  const error = opts.error ?? null
  const result = Promise.resolve({ error })
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.existing ?? null }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error }),
      update: vi.fn(() => ({ eq: vi.fn().mockReturnValue(result) })),
      // Silme artik `.select('id')` ile GERCEKTEN silinen satiri ister
      // ("kayit yok" ile "sildim" ayrimi icin).
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ error, data: opts.deleted ?? null }),
        })),
      })),
    })),
  }
}

const POST = {
  id: 'test-id',
  title: 'Test',
  slug: 'test-slug',
  date: '2026-09-23',
  excerpt: 'ozet',
  content: 'icerik',
}

beforeEach(() => {
  vi.resetModules()
  writeFileMock.mockReset().mockResolvedValue(undefined)
  readFileMock.mockReset().mockRejectedValue(new Error('ENOENT'))
  createClientMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('upsertPost', () => {
  it('Supabase YAPILANDIRILMAMISSA yerel dosyaya yazar ve ok:true doner', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', '')

    const { upsertPost } = await import('@/lib/blog')
    const result = await upsertPost(POST)

    expect(result.supabaseConfigured).toBe(false)
    expect(result.ok).toBe(true)
    expect(result.localOk).toBe(true)
  })

  it('Supabase yazimi BASARISIZSA ok:false doner — sessiz basari YOK (regresyon)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    createClientMock.mockReturnValue(makeClient({
      error: { code: '42501', message: 'permission denied' },
    }))

    const { upsertPost } = await import('@/lib/blog')
    const result = await upsertPost(POST)

    expect(result.supabaseConfigured).toBe(true)
    expect(result.ok).toBe(false)
    expect(result.supabaseOk).toBe(false)
    expect(result.error).toContain('permission denied')
    // Yerel dosyaya yazilmis olsa bile basarili SAYILMAMALI
    expect(result.localOk).toBe(true)
  })

  it('Supabase yazimi basariliysa ok:true doner', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    createClientMock.mockReturnValue(makeClient({ error: null }))

    const { upsertPost } = await import('@/lib/blog')
    const result = await upsertPost(POST)

    expect(result.ok).toBe(true)
    expect(result.supabaseOk).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('var olan yaziyi guncelleme yolunda da sonuc dogru', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    createClientMock.mockReturnValue(makeClient({ existing: { id: 42 }, error: null }))

    const { upsertPost } = await import('@/lib/blog')
    const result = await upsertPost(POST)
    expect(result.ok).toBe(true)
  })
})

describe('deletePost', () => {
  it('Supabase silme BASARISIZSA ok:false doner', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    createClientMock.mockReturnValue(makeClient({
      error: { code: '42501', message: 'permission denied' },
    }))

    const { deletePost } = await import('@/lib/blog')
    const result = await deletePost('15')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('permission denied')
  })

  it('sayisal olmayan id ve yerel kayit yoksa SESSIZCE basarili DEMEZ (regresyon)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    createClientMock.mockReturnValue(makeClient({ error: null }))
    // Yerel dosya bos → UUID eslesmesi bulunamaz
    readFileMock.mockRejectedValue(new Error('ENOENT'))

    const { deletePost } = await import('@/lib/blog')
    const result = await deletePost('bilinmeyen-uuid')

    // Eskiden burada hicbir sey silinmiyordu ama API "Yazı silindi." diyordu.
    expect(result.ok).toBe(false)
    expect(result.error).toContain('bulunamadı')
    // 404 ile 500 AYRILMALI: bu bir ISTEK hatasi, sunucu hatasi degil
    expect(result.notFound).toBe(true)
  })

  it('sayisal id ile basarili silme ok:true doner', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    // Silinen satir GERI DONMELI — yoksa "kayit yok" sayilir
    createClientMock.mockReturnValue(makeClient({ error: null, deleted: [{ id: 15 }] }))

    const { deletePost } = await import('@/lib/blog')
    const result = await deletePost('15')
    expect(result.ok).toBe(true)
    expect(result.notFound).toBe(false)
  })

  it('var olmayan SAYISAL id 500 degil notFound doner', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    // Hata yok ama silinen satir da yok → kayit bulunamadi
    createClientMock.mockReturnValue(makeClient({ error: null, deleted: [] }))

    const { deletePost } = await import('@/lib/blog')
    const result = await deletePost('999999')

    expect(result.ok).toBe(false)
    expect(result.notFound).toBe(true)
    expect(result.error).toContain('bulunamadı')
  })
})

describe('clearPostsCache', () => {
  it('cagrildiktan sonra onbellek temizlenir (process geneli)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'fake-key')
    const client = makeClient({ error: null })
    createClientMock.mockReturnValue(client)

    const { getPosts, clearPostsCache } = await import('@/lib/blog')

    await getPosts()
    const callsAfterFirst = client.from.mock.calls.length

    // Onbellek sicakken Supabase'e tekrar GIDILMEMELI
    await getPosts()
    expect(client.from.mock.calls.length).toBe(callsAfterFirst)

    // Temizledikten sonra tekrar okumali
    clearPostsCache()
    await getPosts()
    expect(client.from.mock.calls.length).toBeGreaterThan(callsAfterFirst)
  })
})
