import { NextResponse } from 'next/server'
import { E164_MAX_DIGITS, normalizePhone } from '@/lib/phone'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Basit isim → username slug (küçük harf, aksansız, boşluksuz). */
function slugify(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // aksanları at
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'user'
}

/**
 * Kayıt — Supabase Auth üzerinden gerçek kullanıcı hesabı oluşturur.
 * Body: { fullName, email, password, phone? }
 *
 * Akış: service-role client ile kullanıcı oluştur (email_confirm: true →
 * doğrulama e-postası beklemeden hemen giriş yapılabilir), ardından normal
 * SSR client ile oturum aç → kullanıcı anında giriş yapmış olur (cookie set).
 */
export async function POST(req: Request) {
  /*
    Hız sınırı: hesap üretimi kimlik doğrulamasızdı ve limitsizdi — sınırsız
    hesap + Supabase Auth kotasının tükenmesi. IP başına saatte 5 kayıt.
  */
  const rl = rateLimit(`signup:${clientIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, message: `Çok fazla deneme. ${rl.retryAfter} saniye sonra tekrar dene.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const body = await req.json().catch(() => null)
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 100) : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  // E.164: en fazla 15 hane ("+" hariç). Fazlası 400 döner.
  const phoneCheck = normalizePhone(typeof body?.phone === 'string' ? body.phone : '')
  const phone = phoneCheck.ok ? phoneCheck.value : ''

  // Temel doğrulama (tutarlı hata mesajları istemciyle paylaşılır)
  if (!fullName) {
    return NextResponse.json({ success: false, message: 'Ad gerekli.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, message: 'Geçerli bir e-posta adresi girin.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, message: 'Şifre en az 8 karakter olmalı.' }, { status: 400 })
  }
  if (!phoneCheck.ok) {
    return NextResponse.json(
      {
        success: false,
        message: phoneCheck.verdict === 'invalid'
          ? 'Telefon yalnızca rakamlardan oluşmalı.'
          : phoneCheck.verdict === 'tooShort'
            ? `Telefon en az ${phoneCheck.min ?? 4} rakam olmalı.`
            : `Telefon en fazla ${phoneCheck.max ?? E164_MAX_DIGITS} rakam olabilir.`,
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const username = slugify(fullName)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username,
      phone,
      avatar_url: '',
      occupation: '',
      occupationOther: '',
      contact: '',
    },
  })

  if (error) {
    // unique violation (auth.users email) — Supabase "already registered" verir
    const msg = error.message?.toLowerCase().includes('already registered')
      ? 'Bu e-posta ile zaten bir hesap var.'
      : 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.'
    return NextResponse.json({ success: false, message: msg }, { status: error.status || 400 })
  }

  // Otomatik giriş — cookie'leri SSR client kurar
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    // Hesap oluştu ama oturum kurulamadı — kullanıcı giriş sayfasına yönlendirilir
    return NextResponse.json({ success: true, sessionDelayed: true, user: data.user?.id ?? null })
  }

  return NextResponse.json({ success: true, user: data.user?.id ?? null })
}