import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyText } from '@/lib/clipboard'

/**
 * Panoya kopyalama testleri.
 *
 * Kritik iddia: `navigator.clipboard` YOKSA veya HATA VERIRSE gizli textarea
 * fallback'i devreye girmeli. Aksi halde HTTP uzerinden acilan sitede
 * kopyala butonu sessizce calismazdi.
 */

const ORIGINAL_CLIPBOARD = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
    writable: true,
  })
}

function setExecCommand(value: unknown) {
  Object.defineProperty(document, 'execCommand', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  if (ORIGINAL_CLIPBOARD) {
    Object.defineProperty(navigator, 'clipboard', ORIGINAL_CLIPBOARD)
  }
  else {
    // jsdom'da baslangicta yoksa tekrar yok et
    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'clipboard')
  }
  Reflect.deleteProperty(document as unknown as Record<string, unknown>, 'execCommand')
  vi.restoreAllMocks()
})

describe('copyText', () => {
  it('bos metin icin false doner ve hicbir sey denemez', async () => {
    const writeText = vi.fn()
    setClipboard({ writeText })
    expect(await copyText('')).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('modern Clipboard API varsa onu kullanir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    expect(await copyText('merhaba')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('merhaba')
  })

  it('navigator.clipboard YOKSA fallback (execCommand) kullanir', async () => {
    setClipboard(undefined)
    const exec = vi.fn().mockReturnValue(true)
    setExecCommand(exec)

    expect(await copyText('yedek')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
  })

  it('writeText HATA VERIRSE fallback kullanir', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('izin yok'))
    setClipboard({ writeText })
    const exec = vi.fn().mockReturnValue(true)
    setExecCommand(exec)

    expect(await copyText('yedek')).toBe(true)
    expect(writeText).toHaveBeenCalled()
    expect(exec).toHaveBeenCalledWith('copy')
  })

  it('execCommand false donerse false doner (sessiz basari YOK)', async () => {
    setClipboard(undefined)
    setExecCommand(vi.fn().mockReturnValue(false))

    expect(await copyText('olmadi')).toBe(false)
  })

  it('execCommand hic yoksa false doner', async () => {
    setClipboard(undefined)
    // execCommand tanimsiz birakilir
    expect(await copyText('olmadi')).toBe(false)
  })

  it('fallback gecici textarea`yi DOM`dan temizler', async () => {
    setClipboard(undefined)
    setExecCommand(vi.fn().mockReturnValue(true))

    const before = document.body.querySelectorAll('textarea').length
    await copyText('temizlik')
    const after = document.body.querySelectorAll('textarea').length

    expect(after).toBe(before)
  })

  it('fallback secilen degeri textarea`ya yazar', async () => {
    setClipboard(undefined)
    let captured = ''
    setExecCommand(vi.fn(() => {
      const area = document.body.querySelector('textarea')
      captured = area?.value ?? ''
      return true
    }))

    await copyText('yakalanan deger')
    expect(captured).toBe('yakalanan deger')
  })

  it('hicbir yol yoksa false doner (throw etmez)', async () => {
    setClipboard(undefined)
    await expect(copyText('x')).resolves.toBe(false)
  })
})
