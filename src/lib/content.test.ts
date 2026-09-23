import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Icerik/yonetici kalicilastirma sonucu testleri.
 *
 * REGRESYON: `saveContent`/`saveAdmin` yalnizca YEREL dosya sistemine yaziyor
 * ve hatayi YUTUYORDU. Production **Vercel** (`Server: Vercel`) ve Vercel'de
 * proje dizini salt-okunurdur (`/tmp` disinda) → yazim `EROFS` ile duser,
 * hata yutulur, API yine de "Kaydedildi." der. Kullanici kaydettigini sanar,
 * degisiklik KAYBOLUR. Sifre degistirmede daha da kotu: ESKI sifre gecerli kalir.
 *
 * Bu testler salt-okunur senaryoyu taklit eder ve ok:false + ACIKLAYICI mesaj
 * donmesini kilitler.
 */

const writeFileMock = vi.fn()
const readFileMock = vi.fn()
const mkdirMock = vi.fn()

vi.mock('node:fs', () => {
  const promises = {
    readFile: (...a: unknown[]) => readFileMock(...a),
    writeFile: (...a: unknown[]) => writeFileMock(...a),
    mkdir: (...a: unknown[]) => mkdirMock(...a),
  }
  return { promises, default: { promises } }
})

/** Gercek EROFS hatasi gibi davranan hata. */
function readonlyError() {
  return Object.assign(new Error('EROFS: read-only file system, open \'data/content.json\''), {
    code: 'EROFS',
  })
}

beforeEach(() => {
  vi.resetModules()
  writeFileMock.mockReset().mockResolvedValue(undefined)
  readFileMock.mockReset().mockRejectedValue(new Error('ENOENT'))
  mkdirMock.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('saveContent', () => {
  it('yazim basariliysa ok:true doner', async () => {
    const { saveContent } = await import('@/lib/content')
    const result = await saveContent({} as never)
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('SALT-OKUNUR dosya sisteminde ok:false + aciklayici mesaj doner (regresyon)', async () => {
    writeFileMock.mockRejectedValue(readonlyError())

    const { saveContent } = await import('@/lib/content')
    const result = await saveContent({} as never)

    expect(result.ok).toBe(false)
    // Mesaj NE OLDUGUNU ve SONUCUNU soylemeli
    expect(result.error).toContain('kalıcı olarak yazılamadı')
    expect(result.error).toMatch(/salt-okunur|Vercel/)
  })

  it('yazim basarisiz olsa bile cagriyi PATLATMAZ (firlatmaz)', async () => {
    writeFileMock.mockRejectedValue(readonlyError())
    const { saveContent } = await import('@/lib/content')
    await expect(saveContent({} as never)).resolves.toMatchObject({ ok: false })
  })
})

describe('saveAdmin', () => {
  it('yazim basariliysa ok:true doner', async () => {
    const { saveAdmin } = await import('@/lib/content')
    const result = await saveAdmin({ username: 'x', passwordHash: 'y' })
    expect(result.ok).toBe(true)
  })

  it('SALT-OKUNUR sistemde ok:false doner ve ESKI SIFRENIN gecerli kaldigini soyler', async () => {
    writeFileMock.mockRejectedValue(readonlyError())

    const { saveAdmin } = await import('@/lib/content')
    const result = await saveAdmin({ username: 'x', passwordHash: 'y' })

    expect(result.ok).toBe(false)
    // Sifre degistirmede en kritik bilgi: eski sifre hala gecerli
    expect(result.error).toContain('ESKİ ŞİFRE')
  })
})
