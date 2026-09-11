import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/session'

export async function GET() {
  const user = await getSessionUser()
  return NextResponse.json({ success: true, user })
}
