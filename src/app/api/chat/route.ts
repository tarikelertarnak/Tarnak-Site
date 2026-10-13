import { NextResponse } from 'next/server'
import { canSeeAllPeers } from '@/lib/chat-access'
import {
  ChatSchemaMissing,
  clearConversation,
  deleteConversation,
  deleteForAll,
  getAdminProfileView,
  getOrCreateDirectConversation,
  isParticipant,
  listForUser,
  listMessages,
  markDelivered,
  markRead,
  resolveChatIdentity,
  setBlocked,
  setFavorite,
  setImportant,
  setNickname,
  setPinned,
  siteOwnerId,
  touchPresence,
} from '@/lib/chat-db'
import { isPresenceState } from '@/lib/chat-peers'
import { BODY_LIMITS, checkLimit, LIMITS, rateLimitResponse } from '@/lib/rate-limit-kv'
import { getSessionUser, hasSessionPermission, sessionUserName } from '@/lib/supabase/session'

/**
 * Chat API (2026-10-11) — konuşma tabanlı sohbet.
 *
 * ESKİ `/api/chat` (lib/chat.ts, messages.json) dosya tabanlıydı ve Workers'ta
 * sessizce kayboluyordu. Bu route kalıcı Postgres deposunu kullanır.
 *
 * TABLO YOKSA: 503 + açıklayıcı mesaj (uygulama çökmez). Tabloyu kurmak için
 * `supabase/chat.sql` SQL Editor'da çalıştırılır.
 *
 * Yetki: her istek `getSessionUser()` ile doğrulanır; kullanıcı YALNIZCA
 * katıldığı sohbetleri okur/yazar.
 */

function schemaMissing() {
  return NextResponse.json(
    {
      success: false,
      message: 'Sohbet şeması kurulmamış. supabase/chat.sql dosyasını SQL Editor\'da çalıştır.',
      code: 'CHAT_SCHEMA_MISSING',
    },
    { status: 503 },
  )
}

/** GET /api/chat?conversationId=X → mesajlar; parametre yoksa sohbet listesi. */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Giriş gerekli.' }, { status: 401 })
  }
  if (!hasSessionPermission(user, 'chat.read')) {
    return NextResponse.json({ success: false, message: 'Sohbet iznin yok.' }, { status: 403 })
  }

  // Sohbet kimliği (2026-10-12): `/login` sahibi ile Supabase profili TEK
  // geçmiş paylaşır; okuma/katılım bu kimlikle yapılır.
  const chatId = await resolveChatIdentity(user.id, user.username)

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  try {
    if (!conversationId) {
      const conversations = await listForUser(chatId)
      return NextResponse.json({ success: true, conversations })
    }

    if (!(await isParticipant(conversationId, chatId))) {
      return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
    }
    const admin = user.role === 'admin'
    const messages = await listMessages(conversationId, admin)
    // sohbeti açan kullanıcı okumuştur → ✓ (okundu)
    await markRead(conversationId)
    await markDelivered(conversationId)
    return NextResponse.json({ success: true, messages })
  }
  catch (e) {
    if (e instanceof ChatSchemaMissing) {
      return schemaMissing()
    }
    return NextResponse.json({ success: false, message: 'Sohbet okunamadı.' }, { status: 500 })
  }
}

/** Yalnızca site sahibinin (admin) kullanabileceği eylemler. */
const ADMIN_ACTIONS
  = ['favorite', 'block', 'clear', 'deleteConversation', 'nickname', 'profile'] as const

/** POST /api/chat — eyleme göre dallanır (action: open | pin | important | deleteAll). */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Giriş gerekli.' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const action = typeof body?.action === 'string' ? body.action : ''
  const admin = user.role === 'admin'
  // Kim kimi görür: sahip/admin HERKESİ, normal kullanıcı yalnız site sahibini.
  const seeAll = canSeeAllPeers(user)
  // Sohbet kimliği (2026-10-12): `/login` sahibi → profil uuid'i (tek geçmiş).
  const chatId = await resolveChatIdentity(user.id, user.username)

  /*
    YÖNETİCİ EYLEMLERİ (2026-10-11 kullanıcı isteği: sağ tık menüsü).
    Hepsi SADECE admin'e açık — normal kullanıcı favorileyemez, engelleyemez,
    sohbet silemez, takma ad veremez veya profili göremez.
  */
  if ((ADMIN_ACTIONS as readonly string[]).includes(action) && !admin) {
    return NextResponse.json({ success: false, message: 'Yetki yok.' }, { status: 403 })
  }

  try {
    // SİTE SAHİBİ / ADMIN herkesle sohbet açabilir (kendi listesinden seçer).
    // NORMAL KULLANICI yalnızca site sahibiyle (kullanıcı isteği: "kullanıcılar
    // sadece benle konuşabilir"; listede başkası zaten görünmez).
    if (action === 'open') {
      const peerId = typeof body?.peerId === 'string' ? body.peerId : ''
      if (seeAll) {
        if (!peerId) {
          return NextResponse.json({ success: false, message: 'Karşı taraf gerekli.' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          conversation: await getOrCreateDirectConversation(chatId, peerId),
        })
      }
      const ownerId = await siteOwnerId()
      if (!ownerId) {
        return NextResponse.json({ success: false, message: 'Sohbet sahibi bulunamadı.' }, { status: 503 })
      }
      if (ownerId === chatId) {
        return NextResponse.json({ success: false, message: 'Sahip kendi sohbetini açamaz.' }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        conversation: await getOrCreateDirectConversation(chatId, ownerId),
      })
    }

    /*
      ÇEVRİMİÇİ NABZI (2026-10-11). Her giriş yapmış kullanıcı KENDİ nabzını
      atar (başkasının durumunu yazamaz) — bu yüzden admin kapısı dışındadır.
    */
    if (action === 'presence') {
      const raw = body?.state
      await touchPresence(chatId, isPresenceState(raw) ? raw : null)
      return NextResponse.json({ success: true })
    }

    if (!hasSessionPermission(user, 'chat.send')) {
      return NextResponse.json({ success: false, message: 'Yetki yok.' }, { status: 403 })
    }

    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : ''
    const messageId = typeof body?.messageId === 'string' ? body.messageId : ''

    // ── yönetici eylemleri (yukarıda yetki denetlendi) ──
    const targetUserId = typeof body?.userId === 'string' ? body.userId : ''

    if (action === 'profile') {
      if (!targetUserId) {
        return NextResponse.json({ success: false, message: 'Kullanıcı gerekli.' }, { status: 400 })
      }
      // Yalnız beyaz listeli, hassas olmayan alanlar (şifre/e-posta/telefon YOK)
      return NextResponse.json({ success: true, profile: await getAdminProfileView(targetUserId) })
    }

    if (action === 'nickname') {
      if (!targetUserId) {
        return NextResponse.json({ success: false, message: 'Kullanıcı gerekli.' }, { status: 400 })
      }
      const nickname = typeof body?.nickname === 'string' ? body.nickname.slice(0, 40) : ''
      await setNickname(targetUserId, nickname)
      return NextResponse.json({ success: true, nickname: nickname.trim() || null })
    }

    if (!conversationId) {
      return NextResponse.json({ success: false, message: 'Sohbet gerekli.' }, { status: 400 })
    }
    if (!(await isParticipant(conversationId, chatId)) && action !== 'clear' && action !== 'deleteConversation') {
      return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
    }

    if (action === 'favorite') {
      await setFavorite(conversationId, body?.favorite === true)
      return NextResponse.json({ success: true })
    }
    if (action === 'block') {
      await setBlocked(conversationId, body?.blocked === true)
      return NextResponse.json({ success: true })
    }
    if (action === 'clear') {
      await clearConversation(conversationId)
      return NextResponse.json({ success: true, message: 'Sohbet temizlendi.' })
    }
    if (action === 'deleteConversation') {
      await deleteConversation(conversationId)
      return NextResponse.json({ success: true, message: 'Sohbet silindi.' })
    }

    // herkes sabitleyebilir / önemli işaretleyebilir (kendi sohbetinde)
    if (action === 'pin') {
      if (!messageId || !conversationId) {
        return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 })
      }
      if (!(await isParticipant(conversationId, chatId))) {
        return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
      }
      await setPinned(messageId, body?.pinned === true)
      return NextResponse.json({ success: true })
    }

    if (action === 'important') {
      if (!conversationId) {
        return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 })
      }
      if (!(await isParticipant(conversationId, chatId))) {
        return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
      }
      await setImportant(conversationId, body?.important === true)
      return NextResponse.json({ success: true })
    }

    // varsayılan: mesaj GÖNDER
    const { sendMessage } = await import('@/lib/chat-db')
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    const kind = ['text', 'image', 'file', 'audio', 'video'].includes(body?.kind)
      ? body.kind
      : 'text'
    const replyToId = typeof body?.replyToId === 'string' ? body.replyToId : ''
    const audioDuration = typeof body?.audioDuration === 'number'
      ? Math.min(600_000, Math.max(0, Math.round(body.audioDuration)))
      : undefined
    const file = body?.file && typeof body.file === 'object'
      ? {
          url: String(body.file.url ?? ''),
          name: String(body.file.name ?? 'dosya').slice(0, 80),
          type: String(body.file.type ?? 'application/octet-stream'),
          size: Number(body.file.size ?? 0),
        }
      : undefined

    if (!conversationId) {
      return NextResponse.json({ success: false, message: 'Sohbet gerekli.' }, { status: 400 })
    }
    if (!text && !file) {
      return NextResponse.json({ success: false, message: 'Mesaj veya dosya gerekli.' }, { status: 400 })
    }
    if (text.length > BODY_LIMITS.chatMessageChars) {
      return NextResponse.json(
        { success: false, message: `Mesaj en fazla ${BODY_LIMITS.chatMessageChars} karakter olabilir.` },
        { status: 400 },
      )
    }
    if (file && !file.url.startsWith('/uploads/chat/')) {
      return NextResponse.json({ success: false, message: 'Geçersiz dosya.' }, { status: 400 })
    }
    if (!(await isParticipant(conversationId, chatId))) {
      return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
    }

    // admin sınırsız; kullanıcı hız sınırına tabidir
    if (!admin) {
      const rl = await checkLimit('chat-send', { ...LIMITS.chat, failClosed: true }, req)
      if (!rl.ok) {
        return rateLimitResponse(rl)
      }
    }

    const senderName = sessionUserName(user) ?? 'bilinmeyen'
    const message = await sendMessage({
      conversationId,
      senderId: chatId,
      senderName,
      text,
      kind: file ? kind : 'text',
      file,
      audioDuration,
      replyToId: replyToId || undefined,
    })
    return NextResponse.json({ success: true, data: message })
  }
  catch (e) {
    if (e instanceof ChatSchemaMissing) {
      return schemaMissing()
    }
    return NextResponse.json({ success: false, message: 'İşlem başarısız.' }, { status: 500 })
  }
}

/** DELETE /api/chat?messageId=X&mode=me|all — "Mesaj silinsin mi?" onay akışı. */
export async function DELETE(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Giriş gerekli.' }, { status: 401 })
  }
  if (!hasSessionPermission(user, 'chat.delete')) {
    return NextResponse.json({ success: false, message: 'Silme yetkin yok.' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const messageId = searchParams.get('messageId')
  const mode = searchParams.get('mode') === 'all' ? 'all' : 'me'
  // Sohbet kimliği (2026-10-12): `/login` sahibi → profil uuid'i.
  const chatId = await resolveChatIdentity(user.id, user.username)
  if (!messageId) {
    return NextResponse.json({ success: false, message: 'Mesaj gerekli.' }, { status: 400 })
  }
  try {
    if (mode === 'all') {
      // yumuşak silme: herkesten gider, admin retention boyunca görebilir
      await deleteForAll(messageId, chatId)
    }
    else {
      // "benden sil": normal kullanıcı da kendi mesajını silebilir
      await deleteForAll(messageId, chatId) // fiziksel silme yok; aynı yumuşak yol
    }
    return NextResponse.json({ success: true, message: mode === 'all' ? 'Herkesten silindi.' : 'Silindi.' })
  }
  catch (e) {
    if (e instanceof ChatSchemaMissing) {
      return schemaMissing()
    }
    return NextResponse.json({ success: false, message: 'Silinemedi.' }, { status: 500 })
  }
}

/*
  `siteOwnerId()` 2026-10-12'de `lib/chat-db.ts`e taşındı: kişi listesi
  (`/api/chat/users`) de aynı sahibi bulmak zorunda.
*/
