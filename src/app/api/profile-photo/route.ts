import type { ImageMime } from '@/lib/image-crop'
import { NextResponse } from 'next/server'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/image-crop'
import { guardWrite } from '@/lib/rate-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/session'

/**
 * Profil fotoğrafı yükleme — SADECE depolama. İçeriğe (`content.json`) yazmaz;
 * dönen `url` paneldeki mevcut kayıt mekanizmasıyla `profile.profileImage`
 * alanına yazılır. Böylece bu uç nokta hem kırpılmış görseli hem de
 * `profile.originalImage` için saklanan orijinali aynı kova yükleyebilir.
 *
 * Edge/Workers: `node:fs` YOK. Dosya sistemi Workers'ta yok; bu yüzden
 * görseller Supabase Storage'a yazılır ve CDN/ public URL ile sunulur.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'profile-photos'
const FOLDER = 'profile'
/** Dosya adı her seferinde değişsin ki tarayıcı önbelleği eski görseli getirmesin. */
const CACHE_CONTROL = '31536000'

/** MIME → beyaz listeli uzantı. Kullanıcı dosya adı ASLA kullanılmaz. */
const EXT_BY_MIME: Record<ImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Sihirli bayt (magic byte) kontrolü — `Content-Type` istemciden geldiği için
 * tek başına güvenilmez; script gizlenmiş bir dosya yüklenmesin diye içerik
 * de doğrulanır (SVG dahil her şey reddedilir).
 */
function looksLikeImage(bytes: Uint8Array, mime: ImageMime): boolean {
  const tag = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end))

  switch (mime) {
    case 'image/png':
      return (
        bytes[0] === 0x89
        && bytes[1] === 0x50
        && bytes[2] === 0x4E
        && bytes[3] === 0x47
      )
    case 'image/jpeg':
      return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    case 'image/webp':
      return bytes.length >= 12 && tag(0, 4) === 'RIFF' && tag(8, 12) === 'WEBP'
    default:
      return false
  }
}

export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına profile-photo dakikada 20 yazma.
   * Dosya yükleme pahalı; OTURUM KONTROLÜNDEN ÖNCE limiti uygularız ki
   * anonim istekler kotayı doldurup admin'in yüklemesini engellemesin. */
  const denied = await guardWrite(req, 'profile-photo')
  if (denied) {
    return denied
  }

  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 })
  }

  // Depolama yoksa SUNUCU ÇÖKMEMELİ — istemciye anlaşılır mesaj dön.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL
    || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)
  ) {
    return NextResponse.json(
      { ok: false, error: 'Depolama yapılandırılmamış' },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  }
 catch {
    return NextResponse.json(
      { ok: false, error: 'Form verisi okunamadı.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Dosya gerekli.' },
      { status: 400 },
    )
  }

  // İstemci doğrulaması güvenlik değildir — sunucuda tekrar doğrulanır.
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as ImageMime)) {
    return NextResponse.json(
      { ok: false, error: 'Yalnızca JPG, PNG veya WEBP yükleyebilirsin.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Dosya çok büyük. En fazla 5 MB olabilir.' },
      { status: 400 },
    )
  }

  const mime = file.type as ImageMime
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!looksLikeImage(bytes, mime)) {
    return NextResponse.json(
      { ok: false, error: 'Dosya içeriği geçerli bir görsel değil.' },
      { status: 400 },
    )
  }

  try {
    // Kullanıcı adı/uzantısı YOK: adı biz üretiyoruz, uzantı beyaz listeden.
    const path = `${FOLDER}/${crypto.randomUUID()}.${EXT_BY_MIME[mime]}`
    const url = await uploadToStorage(path, file, mime)
    return NextResponse.json({ ok: true, url, path })
  }
 catch (error) {
    // Sunucu logunda ayrıntı, kullanıcıda tek cümle — iç hata sızdırma.
    console.error('[profile-photo] yükleme başarısız:', error)
    return NextResponse.json(
      { ok: false, error: 'Fotoğraf yüklenemedi. Depolamayı kontrol et.' },
      { status: 500 },
    )
  }
}

/**
 * Storage'a yazar, kova yoksa ilk kullanımda oluşturup bir kez daha dener
 * (idempotent — kova zaten varsa hata döner, o hata yok sayılır).
 */
async function uploadToStorage(
  path: string,
  file: File,
  mime: ImageMime,
): Promise<string> {
  const supabase = createAdminClient()
  const storage = supabase.storage.from(BUCKET)
  const upload = () =>
    storage.upload(path, file, {
      contentType: mime,
      cacheControl: CACHE_CONTROL,
      upsert: false,
    })

  let result = await upload()
  if (result.error) {
    const created = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: [...ALLOWED_IMAGE_TYPES],
    })
    if (created.error) {
      throw result.error
    }
    result = await upload()
    if (result.error) {
      throw result.error
    }
  }

  return storage.getPublicUrl(path).data.publicUrl
}
