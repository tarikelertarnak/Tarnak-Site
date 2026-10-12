import { NextResponse } from 'next/server'
import { canSeeAllPeers } from '@/lib/chat-access'
import { resolveChatIdentity, siteOwnerId } from '@/lib/chat-v2'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/supabase/session'

const COLUMNS = 'id, username, full_name, nickname, avatar_url, last_seen_at, presence_state'

/**
 * Sohbet kişi listesi — "kime yazmak istiyorum" paneli (2026-10-11; 2026-10-12
 * yenilendi).
 *
 * YETKİ (kullanıcı isteği 2026-10-12): "Erişim yok ekranı diye bişey olmaz —
 * sonuçta sadece konuşabileceklerini görecek. Ben bütün grup ve kişileri
 * görürüm."
 *   · site sahibi / admin → kayıtlı HERKES (kendi satırı dahil, gizleme yok),
 *   · normal kullanıcı    → yalnızca konuşabileceği kişiler: site sahibi
 *     (ileride: eklendiği gruplar ve kendisine izin verilen kişiler).
 *
 * Eski sürüm normal kullanıcıya 403 "Yetki yok." dönüyordu; liste
 * yüklenemediği için ekranda "erişim yok / kimse yok" hissi oluşuyordu.
 * Artık liste HERKESE döner; görünmeyen kişi listede olmadığı için 403'e
 * düşüp "Erişim yok." görmek mümkün değildir.
 *
 * `chatId`: isteği yapanın SOHBET kimliği. `/login` ile giren sahip
 * `admin:<ad>` kimliğini taşır ama sohbetler profil uuid'i ile tutulur
 * (bkz. `lib/chat-v2.ts:resolveChatIdentity`). İstemci `direct_key`i bu id ile
 * ayrıştırdığı için sunucu çözülmüş kimliği de döner — yoksa iki taraf farklı
 * kişiyi "karşı taraf" sanır.
 *
 * Okuma service-role ile: `profiles` tablosunun satır düzeyi güvenliği
 * oturum istemcisinde satır döndürmeyebiliyor (canlıda admin listesi boş
 * kalabiliyordu). Sızıntı yok — yanıt yalnız herkese açık alanları ve
 * YETKİSİ OLAN satır(lar)ı içerir.
 */
export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json(
      { success: false, message: 'Giriş gerekli.' },
      { status: 401 },
    )
  }

  const chatId = await resolveChatIdentity(sessionUser.id, sessionUser.username)
  const base = createAdminClient().from('profiles').select(COLUMNS)
  const scoped = canSeeAllPeers(sessionUser)
    ? base.order('full_name', { ascending: true })
    // Sahip profili yoksa `id = ''` hiçbir satırı döndürmez (boş liste, 403 değil).
    : base.eq('id', await siteOwnerId())

  const { data, error } = await scoped
  if (error) {
    return NextResponse.json(
      { success: false, message: 'Kullanıcılar alınamadı.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    chatId,
    users: (data ?? []).map(p => ({
      id: p.id,
      username: p.username,
      fullName: p.full_name,
      // Takma ad aramada da kullanılır (kullanıcı isteği: aynı kullanıcı hem
      // takma ad hem normal adla aranabilir, biri gitmemeli).
      nickname: p.nickname ?? null,
      avatarUrl: p.avatar_url,
      lastSeenAt: p.last_seen_at ?? null,
      presenceState: p.presence_state ?? null,
    })),
  })
}
