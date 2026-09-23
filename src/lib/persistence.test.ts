import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Kalicilik oz-testi.
 *
 * Amac: "yazabiliyor muyum?" sorusunu TAHMIN etmeden yanitlamak. Vercel'de
 * proje dizini salt-okunurdur ve `fs.access(W_OK)` bu durumu YANLIS
 * bildirebilir (izin bitleri yazilabilir gorunur, ama mount salt-okunurdur).
 * Bu yuzden gercek bir yazma denemesi yapilir.
 */

const writeFileMock = vi.fn()
const unlinkMock = vi.fn()
const mkdirMock = vi.fn()

vi.mock('node:fs', () => {
  const promises = {
    writeFile: (...a: unknown[]) => writeFileMock(...a),
    unlink: (...a: unknown[]) => unlinkMock(...a),
    mkdir: (...a: unknown[]) => mkdirMock(...a),
  }
  return { promises, default: { promises } }
})

beforeEach(() => {
  vi.resetModules()
  writeFileMock.mockReset().mockResolvedValue(undefined)
  unlinkMock.mockReset().mockResolvedValue(undefined)
  mkdirMock.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('checkPersistence', () => {
  it('yazilabiliyorsa ok:true ve aciklayici not doner', async () => {
    const { checkPersistence } = await import('@/lib/persistence')
    const result = await checkPersistence()

    expect(result.ok).toBe(true)
    expect(result.dataWritable).toBe(true)
    expect(result.uploadsWritable).toBe(true)
    expect(result.note).toContain('çalışıyor')
  })

  it('SALT-OKUNUR dosya sisteminde ok:false ve KRITIK uyari doner (Vercel senaryosu)', async () => {
    writeFileMock.mockRejectedValue(
      Object.assign(new Error('EROFS: read-only file system'), { code: 'EROFS' }),
    )

    const { checkPersistence } = await import('@/lib/persistence')
    const result = await checkPersistence()

    expect(result.ok).toBe(false)
    expect(result.dataWritable).toBe(false)
    expect(result.uploadsWritable).toBe(false)
    // Mesaj NE OLDUGUNU ve SONUCUNU soylemeli
    expect(result.note).toContain('SALT-OKUNUR')
    expect(result.note).toContain('KALICI DEĞİL')
  })

  it('yalnizca icerik dizini yazilamiyorsa bunu ayirt eder', async () => {
    // Ilk cagri data (basarisiz), ikincisi uploads (basarili)
    writeFileMock
      .mockRejectedValueOnce(Object.assign(new Error('EROFS'), { code: 'EROFS' }))
      .mockResolvedValueOnce(undefined)

    const { checkPersistence } = await import('@/lib/persistence')
    const result = await checkPersistence()

    expect(result.ok).toBe(false)
    expect(result.dataWritable).toBe(false)
    expect(result.uploadsWritable).toBe(true)
    expect(result.note).toContain('İçerik/şifre dizini yazılamıyor')
  })

  it('yalnizca gorsel dizini yazilamiyorsa bunu ayirt eder', async () => {
    writeFileMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('EROFS'), { code: 'EROFS' }))

    const { checkPersistence } = await import('@/lib/persistence')
    const result = await checkPersistence()

    expect(result.ok).toBe(false)
    expect(result.dataWritable).toBe(true)
    expect(result.uploadsWritable).toBe(false)
    expect(result.note).toContain('Görsel yükleme dizini yazılamıyor')
  })

  it('probe dosyasi basarili yazimdan sonra SILINIR (kalinti birakmaz)', async () => {
    const { checkPersistence } = await import('@/lib/persistence')
    await checkPersistence()

    expect(writeFileMock).toHaveBeenCalled()
    expect(unlinkMock).toHaveBeenCalled()
    const written = String(writeFileMock.mock.calls[0][0])
    const removed = String(unlinkMock.mock.calls[0][0])
    expect(written).toContain('.write-probe-')
    expect(removed).toBe(written)
  })
})
