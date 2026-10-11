import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

/**
 * Kayıtlı kullanıcı listesi — YÖNETİCİ sohbet paneli için.
 *
 * 2026-10-11 (kullanıcı isteği): "Henüz başka kullanıcı yok" yazısı
 * olmayacak — "kendim bile her kim kayıtlıysa herkez orada gözüksün". Bu
 * yüzden:
 *   · `username is not null` filtresi KALDIRILDI (henüz kullanıcı adı
 *     seçmemiş kayıtlar da listede çıkar),
 *   · admin'in KENDİ profili de döner (gizleme istemcide yapılmaz).
 * Ayrıca çevrimiçi nabzı (`last_seen_at` / `presence_state`) döner; yeşil /
 * sarı / kırmızı nokta istemcide `lib/chat-peers.ts` ile hesaplanır.
 *
 * YETKİ: yalnızca admin. Normal kullanıcı listeyi görmez (sohbeti site
 * sahibiyle kendiliğinden açılır) — aksi hâlde kayıtlı herkesin adı,
 * fotoğrafı ve çevrimiçi durumu her giriş yapmış kullanıcıya açık olurdu.
 */
export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json(
      { success: false, message: 'Giriş gerekli.' },
      { status: 401 },
    )
  }
  if (sessionUser.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Yetki yok.' },
      { status: 403 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    // `id` şart: sohbet açmak için `action:'open'` peerId bekliyor (kullanıcı
    // adı değil, uuid). 2026-10-11: admin "kime yazayım?" listesini görüyordu.
    .select('id, username, full_name, nickname, avatar_url, last_seen_at, presence_state')
    .order('full_name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, message: 'Kullanıcılar alınamadı.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
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
