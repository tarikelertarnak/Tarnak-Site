import { Buffer } from 'node:buffer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getContent, saveContent } from '@/lib/content'
import { guardWrite } from '@/lib/rate-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

// Verify the content is actually an image (magic byte)
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
  /* __RATE_GUARD__ KV hız sınırı: IP başına admin-profile dakikada 20 yazma.
   * Pahalı işlemden (Supabase INSERT / dosya yazımı) ÖNCE kontrol edilir. */
  const denied = await guardWrite(req, 'admin-profile')
  if (denied)
    return denied
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== 'admin') {
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

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: 'Dosya çok büyük. En fazla 5 MB.' }, { status: 400 })
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
    // ⚠️ KOK NEDEN (2026-10-06): dosya adi sabitti (`profile.png`). Ayni
    // uzantiyi tekrar yukleyince URL degismiyordu ve tarayici onbelleginden
    // ESKI gorseli getiriyordu → "kaydettim ama degismiyor" gorunumu.
    // Zaman damgali ad her yuklemede yeni URL verir.
    const filename = `profile-${Date.now()}${ext}`
    const profileImage = `/uploads/${filename}`
    await fs.writeFile(path.join(uploadDir, filename), buffer)

    const content = await getContent()
    content.profile.profileImage = profileImage
    const saved = await saveContent(content)
    if (!saved.ok) {
      return NextResponse.json({ success: false, message: saved.error || 'İçerik kaydedilemedi.' }, { status: 500 })
    }

    // Supabase auth metadata + `profiles.avatar_url` senkronu.
    // Profil panelden degisiyordu ama panel bunu GORMUYORDU: sidebar/chat
    // avatarini `profiles.avatar_url` uzerinden okuyor → kopukluk.
    // admin.json (admin:*) oturumunda Supabase kimligi yok, atlanir.
    if (sessionUser && !sessionUser.id.startsWith('admin:')) {
      await syncSupabaseAvatar(sessionUser.id, profileImage)
    }

    // ISR/Full Route cache: icerik degisti, sayfa aninda yenilenmeli
    // (/api/admin/content ile ayni davranis).
    try {
      revalidatePath('/', 'layout')
    }
    catch { /* Workers: no-op */ }

    return NextResponse.json({
      success: true,
      message: 'Profil fotoğrafı güncellendi.',
      profileImage,
    })
  }
  catch {
    return NextResponse.json({ success: false, message: 'Dosya kaydedilemedi.' }, { status: 500 })
  }
}

/**
 * Yeni avatarı Supabase'e yazar (user_metadata + profiles.avatar_url).
 *
 *  Service role anahtari SUNUCUDA kalir; route disina sizmaz. Panel zaten
 *  content.json'a yaziyor, bu yalnizca oturum/profil tarafini senkronlar.
 *  Hata olursa sessizce gecilir: content.json kaydi gecerli.
 */
async function syncSupabaseAvatar(userId: string, avatarUrl: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === userId) {
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl, avatarUrl },
      })
    }
  }
  catch { /* metadata yeterli degilse profiles yazilir */ }
  try {
    await createAdminClient()
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
  }
  catch { /* tablo yoksa paneldeki content kaydi yeterli */ }
}
