import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

/**
 * Registered user list (to start a chat).
 * Login required; users who never wrote a message are also returned — "Other" group.
 */
export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json(
      { success: false, message: 'Giriş gerekli.' },
      { status: 401 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    // `id` şart: sohbet açmak için `action:'open'` peerId bekliyor (kullanıcı
    // adı değil, uuid). 2026-10-11: admin "kime yazayım?" listesini görüyordu.
    .select('id, username, full_name, nickname, avatar_url')
    .not('username', 'is', null)
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
    })),
  })
}
