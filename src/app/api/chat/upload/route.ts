import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import { MAX_UPLOAD_BYTES, saveUploadedFile } from '@/lib/chat'
import { LIMITS, checkLimit, rateLimitResponse } from '@/lib/rate-limit-kv'
import { getSessionUser, hasSessionPermission } from '@/lib/supabase/session'

export async function POST(req: Request) {
  // File upload is only available to logged-in users with the files.upload permission
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json(
      { success: false, message: 'Giriş gerekli. Dosya yüklemek için giriş yap.' },
      { status: 401 },
    )
  }
  if (!hasSessionPermission(sessionUser, 'files.upload')) {
    return NextResponse.json(
      { success: false, message: 'Dosya yükleme yetkin yok.' },
      { status: 403 },
    )
  }

  /*
    HIZ SINIRI — 2026-10-05: in-memory dizi -> KV sabit pencere
    (`LIMITS.chatUpload` = IP başına dakikada 10). Dosya yükleme pahalı:
    10 MB'a kadar `formData()` ayrıştırma + diske yazma, dağıtık olarak
    sınırsız çağrılırsa Workers diski/CPU'yu tüketir.
    `failClosed: true`: KV okunamazsa yüklemeyi reddet (depolama maliyeti).
    Kontrol `formData()` ÖNCESİNDE — gövdeyi ayrıştırmadan reddediyoruz.
  */
  const rl = await checkLimit('chat-upload', { ...LIMITS.chatUpload, failClosed: true }, req)
  if (!rl.ok)
    return rateLimitResponse(rl)

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

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { success: false, message: 'Dosya çok büyük. En fazla 10 MB yükleyebilirsin.' },
      { status: 400 },
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const saved = await saveUploadedFile(buffer, file.name, file.type)
    return NextResponse.json({ success: true, file: saved })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Dosya kaydedilemedi.'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
