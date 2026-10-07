import { guardWrite } from '@/lib/rate-guard'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Oturum açık kullanıcının ŞİFRESİNİ değiştirir.
 *
 *   POST /api/auth/password  { password, confirm }
 *
 * Neden route: `supabase.auth.updateUser({ password })` sunucu tarafında
 * kullanıcının KENDİ oturumuyla çağrılır — service-role anahtarı istemciye
 * hiç sızmaz. Doğrulama (min uzunluk + eşleşme) tek yerde, burada yapılır;
 * istemci de aynı kuralları kullanıcıya gösterir.
 */
export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına auth-password dakikada 20 yazma.
   * Pahalı işlemden (Supabase auth UPDATE) ÖNCE kontrol edilir. */
  const denied = await guardWrite(req, 'auth-password')
  if (denied)
    return denied

  const body = await req.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''
  const confirm = typeof body?.confirm === 'string' ? body.confirm : ''

  // /admin (admin_session) hesabının Supabase kimliği yoktur.
  if (!password) {
    return NextResponse.json(
      { success: false, message: 'Yeni şifre gerekli.' },
      { status: 400 },
    )
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, message: 'Şifre en az 8 karakter olmalı.' },
      { status: 400 },
    )
  }
  if (password !== confirm) {
    return NextResponse.json(
      { success: false, message: 'Şifreler eşleşmiyor.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Giriş yapılmadı.' },
      { status: 401 },
    )
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return NextResponse.json(
      { success: false, message: error.message || 'Şifre güncellenemedi.' },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true })
}