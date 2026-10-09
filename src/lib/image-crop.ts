/**
 * Profil fotoğrafı kırpma yardımcıları (TARAYICI tarafı).
 *
 * Neden ayrı dosya: canvas çizimi + dosya doğrulama hem yükleme bileşeninde
 * hem kırpma modalında kullanılır. Tek yerde tutulmazsa kural (512×512,
 * 5 MB, izinli türler) iki yerde bozulur.
 *
 * Edge/Workers notu: burada `node:*` yok, saf tarayıcı API'si. Bu dosya
 * SUNUCUDA import edilmemeli. Sunucu tarafı doğrulaması ayrı ve ayrı
 * zorunludur — istemci doğrulaması güvenlik değildir.
 */

/** İstemci + sunucu aynı sınırı kullansın diye tek yerde tanımlı (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** İzinli MIME türleri. GIF/SVG kabul edilmiyor (SVG = script riski). */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** Profil görseli kare ve bu boyutta saklanır (96px avatar için 2x fazlası). */
export const OUTPUT_SIZE = 512

export type ImageMime = (typeof ALLOWED_IMAGE_TYPES)[number]

/** react-easy-crop'un bize verdiği kırpma dikdörtgeni (piksel). */
export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

export type ImageValidation = { ok: true } | { ok: false; error: string }

/** Tür + boyut kontrolü. Hata mesajları doğrudan kullanıcıya gösterilir. */
export function validateImageFile(file: File): ImageValidation {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as ImageMime)) {
    return { ok: false, error: 'Yalnızca JPG, PNG veya WEBP yükleyebilirsin.' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'Dosya boş.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Dosya çok büyük. En fazla 5 MB olabilir.' }
  }
  return { ok: true }
}

/**
 * Kırpılan bölgeyi `size`×`size` kare canvas'a çizer.
 *
 * DÖNDÜRME NOTU: react-easy-crop kırpma dikdörtgenini DÖNDÜRÜLMÜŞ doğal
 * boyuta göre bildirir (paket içi `computeCroppedArea` → `rotateSize`), yani
 * 90° çevirdiğimizde `pixelCrop` artık takas edilmiş koordinatlardır. Bu
 * yüzden önce görseli döndürülmüş kutuya çizip kırpma dikdörtgenini ondan
 * alıyoruz — yoksa kırpma 90° yanlış yere oturur.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  size: number = OUTPUT_SIZE,
): Promise<HTMLCanvasElement> {
  const image = await loadImage(imageSrc)
  const swap = Math.abs(rotation % 180) === 90

  let source: HTMLImageElement | HTMLCanvasElement = image
  if (rotation % 360 !== 0) {
    const turned = document.createElement('canvas')
    turned.width = swap ? image.naturalHeight : image.naturalWidth
    turned.height = swap ? image.naturalWidth : image.naturalHeight
    const ctx = turned.getContext('2d')
    if (!ctx) {
      throw new Error('Görsel döndürülemedi.')
    }
    ctx.translate(turned.width / 2, turned.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
    source = turned
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Görsel işlenemedi.')
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    source,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  )
  return canvas
}

/**
 * Kırpılan canvas'ı yüklenecek dosyaya çevirir.
 *
 * WEBP denenir, tarayıcı desteklemiyorsa `toDataURL` PNG'ye düşer — dosya
 * adını gerçek MIME'e göre veriyoruz ki sunucu uzantıyı yanlış yazmasın.
 */
export function canvasToFile(
  canvas: HTMLCanvasElement,
  baseName = 'profil',
): File {
  const dataUrl = canvas.toDataURL('image/webp', 0.92)
  const webp = dataUrl.startsWith('data:image/webp')
  return dataUrlToFile(dataUrl, webp ? `${baseName}.webp` : `${baseName}.png`)
}

/** `data:image/png;base64,...` → gerçek `File`. Sunucuya gönderilebilir. */
export function dataUrlToFile(dataUrl: string, name: string): File {
  const [header = '', payload = ''] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], name, { type: mime })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () =>
      reject(new Error('Görsel yüklenemedi.')),
    )
    image.src = src
  })
}
