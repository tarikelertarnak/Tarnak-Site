import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { NextResponse } from 'next/server'
import { getContent, saveContent } from '@/lib/content'
import { isAdminUser } from '@/lib/supabase/session'

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

// Verify the content is actually an image (magic byte) — scripts cannot be embedded, including SVG
function looksLikeImage(data: Buffer, ext: string): boolean {
  if (data.length < 8) {
    return false
  }
  if (ext === '.png') {
    return data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF
  }
  if (ext === '.gif') {
    return data.toString('latin1', 0, 6) === 'GIF89a' || data.toString('latin1', 0, 6) === 'GIF87a'
  }
  if (ext === '.webp') {
    return data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP'
  }
  return false
}

export async function POST(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  }
  catch {
    return NextResponse.json({ success: false, message: 'Form verisi okunamadı.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, message: 'Dosya gerekli.' }, { status: 400 })
  }

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { success: false, message: 'Yalnızca PNG, JPG, WEBP veya GIF yükleyebilirsin.' },
      { status: 400 },
    )
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: 'Dosya çok büyük. En fazla 8 MB.' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    if (!looksLikeImage(buffer, ext)) {
      return NextResponse.json(
        { success: false, message: 'Dosya içeriği geçerli bir görsel değil.' },
        { status: 400 },
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })
    const filename = `background${ext}`
    await fs.writeFile(path.join(uploadDir, filename), buffer)

    const content = await getContent()
    content.settings.backgroundImage = `/uploads/${filename}`
    const saved = await saveContent(content)
    if (!saved.ok) {
      return NextResponse.json({ success: false, message: saved.error || 'İçerik kaydedilemedi.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Arka plan görseli güncellendi.',
      backgroundImage: content.settings.backgroundImage,
    })
  }
  catch {
    return NextResponse.json({ success: false, message: 'Dosya kaydedilemedi.' }, { status: 500 })
  }
}

export async function DELETE() {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  try {
    const content = await getContent()
    content.settings.backgroundImage = ''
    const saved = await saveContent(content)
    if (!saved.ok) {
      return NextResponse.json({ success: false, message: saved.error || 'İçerik kaydedilemedi.' }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Arka plan görseli kaldırıldı.' })
  }
  catch {
    return NextResponse.json({ success: false, message: 'Kaldırılamadı.' }, { status: 500 })
  }
}
