import type { ChatFile } from '@/lib/content'
import { NextResponse } from 'next/server'
import { addMessage, deleteMessage, getMessages } from '@/lib/chat'
import {
  getSessionUser,
  hasSessionPermission,
  isAdminUser,
  sessionUserName,
} from '@/lib/supabase/session'

const COOLDOWN_MS = 10_000
const lastPostAt = new Map<string, number>()

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const user = searchParams.get('user')?.trim() ?? ''

  // Thread-specific reads (user=X) are only available to logged-in users, and
  // they can only read their OWN thread (querying under another name is blocked).
  if (user) {
    const sessionUser = await getSessionUser()
    const ownName = sessionUserName(sessionUser)
    if (!sessionUser || !ownName || ownName !== user) {
      return NextResponse.json(
        { success: false, message: 'Giriş gerekli.' },
        { status: 401 },
      )
    }
  }

  const messages = await getMessages(user || undefined)
  return NextResponse.json({ success: true, messages })
}

export async function POST(req: Request) {
  // Chat is only open to logged-in users — the name is taken from the session
  const sessionUser = await getSessionUser()
  const name = sessionUserName(sessionUser)
  if (!sessionUser || !name) {
    return NextResponse.json(
      { success: false, message: 'Giriş gerekli. Sohbete katılmak için giriş yap.' },
      { status: 401 },
    )
  }
  if (!hasSessionPermission(sessionUser, 'chat.send')) {
    return NextResponse.json(
      { success: false, message: 'Mesaj gönderme yetkin yok.' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const rawFile = body?.file
  // Private message to a selected user (thread). Empty means a public general message.
  const to = typeof body?.to === 'string' ? body.to.trim().slice(0, 80) : ''

  if ((!text && !rawFile) || text.length > 500) {
    return NextResponse.json({ success: false, message: 'Mesaj veya dosya gerekli.' }, { status: 400 })
  }

  const admin = await isAdminUser()
  let file: ChatFile | undefined
  if (rawFile && typeof rawFile === 'object') {
    file = {
      name: String(rawFile.name ?? 'dosya').slice(0, 80),
      type: String(rawFile.type ?? 'application/octet-stream'),
      size: Number(rawFile.size ?? 0),
      url: String(rawFile.url ?? ''),
    }
    if (!file.url.startsWith('/uploads/chat/')) {
      return NextResponse.json({ success: false, message: 'Geçersiz dosya.' }, { status: 400 })
    }
  }

  if (admin) {
    const owner = body?.owner === true
    const message = await addMessage(name, text, { file, owner, to })
    return NextResponse.json({ success: true, message: 'Gönderildi!', data: message })
  }

  const ip = getClientIp(req)
  const now = Date.now()
  const last = lastPostAt.get(ip) ?? 0
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json(
      { success: false, message: 'Çok hızlı mesaj gönderiyorsun. Lütfen biraz bekle.' },
      { status: 429 },
    )
  }
  lastPostAt.set(ip, now)

  const message = await addMessage(name, text, { file, to })
  return NextResponse.json({ success: true, message: 'Gönderildi!', data: message })
}

export async function DELETE(req: Request) {
  const sessionUser = await getSessionUser()
  if (!hasSessionPermission(sessionUser, 'chat.delete')) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ success: false, message: 'Mesaj ID gerekli.' }, { status: 400 })
  }

  await deleteMessage(id)
  return NextResponse.json({ success: true, message: 'Mesaj silindi.' })
}
