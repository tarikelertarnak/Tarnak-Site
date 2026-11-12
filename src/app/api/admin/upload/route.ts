import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { NextResponse } from 'next/server'
import { guardWrite } from '@/lib/rate-guard'
import { isAdminUser } from '@/lib/supabase/session'

/**
 * Proje medya yükleme (2026-11-11, kullanıcı isteği: "yükle" türü).
 *
 * Aynı mekanizma `api/admin/background` ile: `node:fs` ile `public/uploads`
 * altına yazılır. NOT: Cloudflare Workers'ta `fs` YOKtur → orada bu yol
 * çalışmaz; geliştirme (localhost/WSL) ve Node hedeflerinde geçerlidir.
 */

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.webm', '.mp4', '.mov']
const MAX_BYTES = 16 * 1024 * 1024

/** Gerçekten görsel mi (magic byte) — script gömülü SVG/HTML engellenir. */
function looksLikeImage(data: Buffer, ext: string): boolean {
  if (data.length < 8)
    return false
  if (ext === '.png')
    return data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
  if (ext === '.jpg' || ext === '.jpeg')
    return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
  if (ext === '.gif')
    return data.toString('latin1', 0, 6) === 'GIF89a' || data.toString('latin1', 0, 6) === 'GIF87a'
  if (ext === '.webp')
    return data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP'
  return false
}

/** Dosya adını güvenli hale getirir (yol geçişi / tuhaf karakter yok). */
function safeName(name: string): string {
  const base = path.basename(name).replace(/[^\w.-]/gi, '-').slice(-60)
  return base || 'dosya'
}

export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına admin-upload dakikada 20 yazma. */
  const denied = await guardWrite(req, 'admin-upload')
  if (denied)
    return denied
  const admin = await isAdminUser()
  if (!admin)
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  }
  catch {
    return NextResponse.json({ success: false, message: 'Form verisi okunamadı.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ success: false, message: 'Dosya gerekli.' }, { status: 400 })

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { success: false, message: 'Yalnızca PNG, JPG, WEBP, GIF, WEBM, MP4 veya MOV.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, message: 'Dosya çok büyük. En fazla 16 MB.' },
      { status: 400 },
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const isVideo = ext === '.webm' || ext === '.mp4' || ext === '.mov'
    if (!isVideo && !looksLikeImage(buffer, ext)) {
      return NextResponse.json(
        { success: false, message: 'Dosya içeriği geçerli bir görsel değil.' },
        { status: 400 },
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'projects')
    await fs.mkdir(uploadDir, { recursive: true })
    const filename = `${Date.now()}-${safeName(file.name)}`
    await fs.writeFile(path.join(uploadDir, filename), buffer)

    return NextResponse.json({
      success: true,
      url: `/uploads/projects/${filename}`,
      message: 'Dosya yüklendi.',
    })
  }
  catch {
    return NextResponse.json({ success: false, message: 'Dosya kaydedilemedi.' }, { status: 500 })
  }
}
