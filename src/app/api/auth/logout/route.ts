import { NextResponse } from 'next/server'
import { guardWrite } from '@/lib/rate-guard'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına dakikada 20 yazma.
   * `req` parametresi eklendi: limit IP'ye bağlı, IP için istek gerekiyor. */
  const denied = await guardWrite(req, 'auth-logout')
  if (denied)
    return denied

  const supabase = await createClient()
  await supabase.auth.signOut()
  // Admin session cookie'sini de temizle — "çıkış yaptığımızda gerçekten çıkış yapar"
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}