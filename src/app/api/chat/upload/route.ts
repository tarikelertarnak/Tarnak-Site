import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import { MAX_UPLOAD_BYTES, saveUploadedFile } from '@/lib/chat'
import { getSessionUser, hasSessionPermission } from '@/lib/supabase/session'

// Simple in-memory rate limit: max 5 files per IP within 60 s
const UPLOAD_LIMIT_MS = 60_000
const UPLOAD_MAX_PER_WINDOW = 5
const uploadAttempts = new Map<string, number[]>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    // Must match an IP address format (prevents header spoofing)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(first)) {
      return first
    }
  }
  return 'local'
}

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

  const ip = getClientIp(req)

  // Rate limit check
  const now = Date.now()
  const attempts = (uploadAttempts.get(ip) ?? []).filter(t => now - t < UPLOAD_LIMIT_MS)
  if (attempts.length >= UPLOAD_MAX_PER_WINDOW) {
    return NextResponse.json(
      { success: false, message: 'Çok fazla dosya yükledin. Lütfen biraz bekle.' },
      { status: 429 },
    )
  }
  attempts.push(now)
  uploadAttempts.set(ip, attempts)

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
