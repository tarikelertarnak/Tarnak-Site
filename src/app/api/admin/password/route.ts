import { NextResponse } from 'next/server'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { getAdmin, saveAdmin } from '@/lib/content'
import { isAdminUser } from '@/lib/supabase/session'

export async function POST(req: Request) {
  const adminUser = await isAdminUser()
  if (!adminUser) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, message: 'Tüm alanları doldur.' }, { status: 400 })
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ success: false, message: 'Yeni şifre en az 4 karakter olmalı.' }, { status: 400 })
  }

  const admin = await getAdmin()
  const currentOk = await verifyPassword(currentPassword, admin.passwordHash)
  if (!currentOk) {
    return NextResponse.json({ success: false, message: 'Mevcut şifre hatalı.' }, { status: 400 })
  }

  const newHash = await hashPassword(newPassword)
  await saveAdmin({ username: admin.username, passwordHash: newHash })

  return NextResponse.json({ success: true, message: 'Şifre güncellendi.' })
}
