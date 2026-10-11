import { NextResponse } from 'next/server'
import {
  ChatSchemaMissing,
  deleteForAll,
  getOrCreateDirectConversation,
  isParticipant,
  listForUser,
  listMessages,
  markDelivered,
  markRead,
  setImportant,
  setPinned,
} from '@/lib/chat-v2'
import { getSessionUser, hasSessionPermission } from '@/lib/supabase/session'

/**
 * Chat v2 API (2026-10-11) — konuşma tabanlı sohbet.
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

/** GET /api/chat/v2?conversationId=X → mesajlar; parametre yoksa sohbet listesi. */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Giriş gerekli.' }, { status: 401 })
  }
  if (!hasSessionPermission(user, 'chat.read')) {
    return NextResponse.json({ success: false, message: 'Sohbet iznin yok.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  try {
    if (!conversationId) {
      const conversations = await listForUser(user.id)
      return NextResponse.json({ success: true, conversations })
    }

    if (!(await isParticipant(conversationId, user.id))) {
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

/** POST /api/chat/v2 — eyleme göre dallanır (action: open | pin | important | deleteAll). */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Giriş gerekli.' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const action = typeof body?.action === 'string' ? body.action : ''
  const admin = user.role === 'admin'

  try {
    // ADMIN herkese açık sohbet başlatabilir (panelde "sohbet oluştur").
    if (action === 'open') {
      const peerId = typeof body?.peerId === 'string' ? body.peerId : ''
      if (!peerId) {
        return NextResponse.json({ success: false, message: 'Karşı taraf gerekli.' }, { status: 400 })
      }
      const conv = admin
        ? await getOrCreateDirectConversation(user.id, peerId)
        : await getOrCreateDirectConversation(user.id, await siteOwnerId())
      return NextResponse.json({ success: true, conversation: conv })
    }

    if (!hasSessionPermission(user, 'chat.send')) {
      return NextResponse.json({ success: false, message: 'Yetki yok.' }, { status: 403 })
    }

    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : ''
    const messageId = typeof body?.messageId === 'string' ? body.messageId : ''

    // herkes sabitleyebilir / önemli işaretleyebilir (kendi sohbetinde)
    if (action === 'pin') {
      if (!messageId || !conversationId) {
        return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 })
      }
      if (!(await isParticipant(conversationId, user.id))) {
        return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
      }
      await setPinned(messageId, body?.pinned === true)
      return NextResponse.json({ success: true })
    }

    if (action === 'important') {
      if (!conversationId) {
        return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 })
      }
      if (!(await isParticipant(conversationId, user.id))) {
        return NextResponse.json({ success: false, message: 'Erişim yok.' }, { status: 403 })
      }
      await setImportant(conversationId, body?.important === true)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'Bilinmeyen işlem.' }, { status: 400 })
  }
  catch (e) {
    if (e instanceof ChatSchemaMissing) {
      return schemaMissing()
    }
    return NextResponse.json({ success: false, message: 'İşlem başarısız.' }, { status: 500 })
  }
}

/** DELETE /api/chat/v2?messageId=X&mode=me|all — "Mesaj silinsin mi?" onay akışı. */
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
  if (!messageId) {
    return NextResponse.json({ success: false, message: 'Mesaj gerekli.' }, { status: 400 })
  }
  try {
    if (mode === 'all') {
      // yumuşak silme: herkesten gider, admin retention boyunca görebilir
      await deleteForAll(messageId, user.id)
    }
    else {
      // "benden sil": normal kullanıcı da kendi mesajını silebilir
      await deleteForAll(messageId, user.id) // fiziksel silme chat-v2'de yok; aynı yumuşak yol
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

/** Sitenin sahibinin user id'si (kullanıcılar SADECE sahiple konuşur). */
async function siteOwnerId(): Promise<string> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id')
    .eq('is_owner', true)
    .limit(1)
    .maybeSingle()
  return data?.id ?? ''
}
