import { guardWrite } from '@/lib/rate-guard'
import { NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/auth'
import { getAdmin } from '@/lib/content'
import { verifyGoogleIdToken } from '@/lib/google-auth'

/**
 * "Google ile devam et" girişi (popup → id_token).
 * Doğrulama başarılıysa mevcut admin_session cookie'yi kurar
 * (kelimenin tam anlamıyla admin login'in cookie kuralının aynısı).
 */
export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına auth-google dakikada 20 yazma.
   * Pahalı işlemden (Supabase INSERT / dosya yazımı) ÖNCE kontrol edilir. */
  const denied = await guardWrite(req, 'auth-google')
  if (denied)
    return denied
  const body = await req.json().catch(() => null)
  const idToken = typeof body?.id_token === 'string' ? body.id_token : ''
  const nextParam = typeof body?.next === 'string' ? body.next : '/'

  // next: yalnızca yerel göreli yol (open redirect koruması)
  const next
    = nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.includes('\\')
      ? nextParam.slice(0, 500)
      : '/'

  const result = await verifyGoogleIdToken(idToken)
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status },
    )
  }

  // verifyGoogleIdToken zaten GOOGLE_ADMIN_EMAIL'le eşleşmeyi zorunlu kılıyor;
  // burada sadece oturum admin kullanıcı adına kurulur.
  const admin = await getAdmin()

  const token = createSessionToken(admin.username)
  const res = NextResponse.json({ success: true, next })
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
