import assert from 'node:assert'
import { describe, it } from 'vitest'
import {
  ALLOWED_IMAGE_TYPES,
  canvasToFile,
  dataUrlToFile,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from '@/lib/image-crop'

function gecerliDosya(overrides: { type?: string; size?: number } = {}): File {
  const { type = 'image/png', size = 1024 } = overrides
  return { type, size, name: 'x.png' } as File
}

describe('profil fotoğrafı dosya doğrulaması', () => {
  it('izinli türler ve boyut sınırı sabit', () => {
    assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024)
    assert.deepEqual(
      [...ALLOWED_IMAGE_TYPES],
      ['image/jpeg', 'image/png', 'image/webp'],
    )
  })

  it('jpg/png/webp kabul edilir', () => {
    for (const type of ALLOWED_IMAGE_TYPES) {
      assert.equal(validateImageFile(gecerliDosya({ type })).ok, true, type)
    }
  })

  it('gif ve svg reddedilir (svg = script riski)', () => {
    for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', '']) {
      const sonuc = validateImageFile(gecerliDosya({ type }))
      assert.equal(sonuc.ok, false, type)
      assert.match(sonuc.ok ? '' : sonuc.error, /JPG, PNG veya WEBP/u)
    }
  })

  it('5 MB üstü ve boş dosya reddedilir, hata Türkçe', () => {
    const buyuk = validateImageFile(gecerliDosya({ size: MAX_IMAGE_BYTES + 1 }))
    assert.equal(buyuk.ok, false)
    assert.match(buyuk.ok ? '' : buyuk.error, /5 MB/u)

    const bos = validateImageFile(gecerliDosya({ size: 0 }))
    assert.equal(bos.ok, false)
    assert.match(bos.ok ? '' : bos.error, /boş/u)
  })

  it('sınırın tam kendisi kabul edilir (>= değil >)', () => {
    assert.equal(
      validateImageFile(gecerliDosya({ size: MAX_IMAGE_BYTES })).ok,
      true,
    )
  })
})

describe('dataUrlToFile', () => {
  it("base64 PNG verisini gerçek MIME'li File'a çevirir", () => {
    const file = dataUrlToFile('data:image/png;base64,aGVsbG8=', 'profil.png')
    assert.equal(file.name, 'profil.png')
    assert.equal(file.type, 'image/png')
    assert.equal(file.size, 5)
  })
})

describe('canvasToFile', () => {
  it('webp destekleyen tarayıcıda .webp uzantısını verir', () => {
    const canvas = {
      toDataURL: () => 'data:image/webp;base64,aGVsbG8=',
    } as unknown as HTMLCanvasElement
    assert.equal(canvasToFile(canvas).name, 'profil.webp')
  })

  it('webp desteklemeyen tarayıcıda png uzantısına düşer', () => {
    const canvas = {
      toDataURL: () => 'data:image/png;base64,aGVsbG8=',
    } as unknown as HTMLCanvasElement
    const file = canvasToFile(canvas)
    assert.equal(file.name, 'profil.png')
    assert.equal(file.type, 'image/png')
  })
})
