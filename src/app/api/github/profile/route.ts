import { NextResponse } from 'next/server'
import { fetchUserProfile } from '@/lib/github'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = (searchParams.get('username') ?? '').trim()

  if (!username) {
    return NextResponse.json({ success: false, message: 'Kullanıcı adı gerekli.' }, { status: 400 })
  }

  try {
    const profile = await fetchUserProfile(username)
    return NextResponse.json({ success: true, profile })
  } catch {
    return NextResponse.json({ success: false, message: 'Profil alınamadı.' }, { status: 500 })
  }
}