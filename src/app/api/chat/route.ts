import type { ChatFile } from '@/lib/content'
import { NextResponse } from 'next/server'
import { addMessage, deleteMessage, getMessages } from '@/lib/chat'
import { clientIp } from '@/lib/client-ip'
import {
  BODY_LIMITS,
  LIMITS,
  checkLimit,
  rateLimitResponse,
  withRateLimitHeaders,
} from '@/lib/rate-limit-kv'
import {
  getSessionUser,
  hasSessionPermission,
  isAdminUser,
  sessionUserName,
} from '@/lib/supabase/session'

/**
 * 2026-10-05 — dağıtık hız sınırı.
 *
 * ÖNCEKİ KORUMA: `COOLDOWN_MS` (10 sn kısa bekleme) + `lastPostAt` in-memory
 * Map. Workers'ta her izole ayrı bellek taşıdığı için bu ikisi tek
 * istemciyi durdurur, DAĞITIK spam'i durdurmaz. Yerini KV tabanlı
 * `checkLimit`'e bıraktı; gerekçe `lib/rate-limit-kv.ts`.
 *
 * Limit kontrolü YETKİ kontrolünden SONRA ve `addMessage`'ten ÖNCE:
 * pahalı yazım yapılmadan reddediyoruz.
 *
 * İKİ PENCERE: dakikada 10 + saatte 60. Tek pencere yetersiz —
 * dakikada 10'u dolduran biri saatte 600 istek yazabilirdi.
 *
 * Mesaj uzunluğu 500 → `BODY_LIMITS.chatMessageChars` (2000) olarak tek
 * yerden okunuyor. Uzun mesaj = pahalı otomatik yanıt üretimi.
 */
const COOLDOWN_MS = 10_000
const lastPostAt = new Map<string, number>()

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

  if (!text && !rawFile) {
    return NextResponse.json({ success: false, message: 'Mesaj veya dosya gerekli.' }, { status: 400 })
  }

  /*
    Mesaj uzunluğu sınırı (2026-10-05). Sabit `500` yerine
    `BODY_LIMITS.chatMessageChars` (2000): kullanıcı isteği doğrultusunda
    kota/fatura koruması için tek yerde tanımlı. Uzun mesaj pahalı
    otomatik yanıt üretimi tetikler.
    NOT: 500 -> 2000 bir GENİŞLETME; eski limit kısa mesajlara zorluyordu
    ve istemcide zaten `maxLength` ile sınırlı.
  */
  if (text.length > BODY_LIMITS.chatMessageChars) {
    return NextResponse.json(
      { success: false, message: `Mesaj en fazla ${BODY_LIMITS.chatMessageChars} karakter olabilir.` },
      { status: 400 },
    )
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

  /*
    HIZ SINIRI — pahalı yazımdan ÖNCE. İki pencere: dakika + saat.
    `failClosed: true`: KV erişilemezse reddet (chat en pahalı uç nokta;
    kota çalışmazken 200 dönmek faturayı korumaz).
  */
  const minute = await checkLimit('chat', { ...LIMITS.chat, failClosed: true }, req)
  if (!minute.ok)
    return rateLimitResponse(minute)

  const hourly = await checkLimit('chat-hour', { ...LIMITS.chatHourly, failClosed: true }, req)
  if (!hourly.ok)
    return rateLimitResponse(hourly)

  // Eski 10 sn bekleme koruması KORUNDU: dakikalık limit 10 olduğu için
  // dakikada 10 hızlı mesaj hâlâ mümkün; 10 sn cooldown kullanıcıyı
  // kelebek etmeyi engeller.
  const ip = clientIp(req)
  const now = Date.now()
  const last = lastPostAt.get(ip) ?? 0
  if (now - last < COOLDOWN_MS) {
    return rateLimitResponse({
      ok: false,
      authoritative: true,
      limit: 1,
      remaining: 0,
      retryAfter: Math.ceil((COOLDOWN_MS - (now - last)) / 1000),
      resetAt: last + COOLDOWN_MS,
    })
  }
  lastPostAt.set(ip, now)

  const message = await addMessage(name, text, { file, to })
  // 200 yanıtına da kalan kota başlıklarını ekliyoruz: arayüz butonu
  // kalan hakkı gösterip kendini erken kapatabilir.
  return withRateLimitHeaders(
    NextResponse.json({ success: true, message: 'Gönderildi!', data: message }),
    hourly,
  )
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
