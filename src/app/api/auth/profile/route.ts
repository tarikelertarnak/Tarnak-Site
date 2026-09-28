import { NextResponse } from 'next/server'
import { E164_MAX_DIGITS, normalizePhone } from '@/lib/phone'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

const MAX_LEN: Record<string, number> = {
  fullName: 100,
  username: 50,
  phone: 16, // E.164: 15 hane + 1 (leading plus)
  occupation: 60,
  occupationOther: 60,
  contact: 300,
  avatarUrl: 500,
}

/**
 * Profil güncelleme (oturum açık kullanıcı).
 * Body (hepsi opsiyonel): { fullName, username, phone, occupation,
 * occupationOther, contact, avatarUrl } → user_metadata + profiles tablosu.
 *
 * profiles tablosu yoksa bile user_metadata güncellenir ve getSessionUser
 * metadata'dan okur — hata yalnızca güncelleme bölümünde sessizce tolere edilir.
 */
export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Giriş yapılmadı.' }, { status: 401 })
  }
  // Admin hesabı profil düzenleyemez — Supabase kimliği yok (admin_session).
  if (user.id.startsWith('admin:')) {
    return NextResponse.json({ success: false, message: 'Yönetici profili düzenlenemez.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: 'Geçersiz istek.' }, { status: 400 })
  }

  const metadata: Record<string, string> = {}
  for (const key of ['fullName', 'username', 'phone', 'occupation', 'occupationOther', 'contact', 'avatarUrl'] as const) {
    const v = body[key]
    if (typeof v === 'string') {
      metadata[key] = v.trim().slice(0, MAX_LEN[key] ?? 200)
    }
  }

  // Telefon E.164'a göre denetlenir (en fazla 15 hane, "+" hariç).
  if (typeof body.phone === 'string' && body.phone.trim()) {
    const check = normalizePhone(body.phone)
    if (!check.ok) {
      return NextResponse.json(
        {
          success: false,
          message: check.verdict === 'invalid'
            ? 'Telefon yalnızca rakamlardan oluşmalı.'
            : `Telefon en fazla ${E164_MAX_DIGITS} rakam olabilir.`,
        },
        { status: 400 },
      )
    }
    metadata.phone = check.value
  }

  // Supabase oturumunun kullanıcı kimliği → user_metadata güncelle
  const supabase = await createClient()
  const { data: { user: sbUser } } = await supabase.auth.getUser()
  if (!sbUser) {
    return NextResponse.json({ success: false, message: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const nextMetadata = {
    full_name: metadata.fullName ?? sbUser.user_metadata?.full_name ?? '',
    username: metadata.username ?? sbUser.user_metadata?.username ?? '',
    phone: metadata.phone ?? sbUser.user_metadata?.phone ?? '',
    occupation: metadata.occupation ?? sbUser.user_metadata?.occupation ?? '',
    occupationOther: metadata.occupationOther ?? sbUser.user_metadata?.occupationOther ?? '',
    contact: metadata.contact ?? sbUser.user_metadata?.contact ?? '',
    avatar_url: metadata.avatarUrl ?? sbUser.user_metadata?.avatar_url ?? '',
  }

  const { error } = await supabase.auth.updateUser({ data: nextMetadata })
  if (error) {
    return NextResponse.json({ success: false, message: 'Profil güncellenemedi. Lütfen tekrar deneyin.' }, { status: 400 })
  }

  // profiles tablosu (varsa) senkron — service role ile, RLS'yi aşar.
  // NOT: bu tablonun şemasında yalnızca username/full_name/avatar_url gibi
  // temel kolonlar var (telefon/meslek/iletişim user_metadata'da tutulur).
  // Upsert BAŞARISIZ olursa sessizce geç — metadata zaten tek doğru kaynak.
  try {
    const admin = createAdminClient()
    await admin.from('profiles').upsert({
      id: sbUser.id,
      username: nextMetadata.username || null,
      full_name: nextMetadata.full_name || null,
      avatar_url: nextMetadata.avatar_url || null,
    }, { onConflict: 'id' })
  }
  catch {
    /* metadata yeterli — tablo yoksa sorun değil */
  }

  return NextResponse.json({ success: true })
}