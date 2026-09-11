import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminUser } from '@/lib/supabase/session'
import {
  addPuckVersion,
  deletePuckPage,
  getPuckPage,
  getPuckPages,
  getPuckVersion,
  getPuckVersions,
  removePuckVersion,
  savePuckPage,
} from '@/lib/puck/store'

export const dynamic = 'force-dynamic'

// GET /api/admin/puck?page=home → { success, data }
// GET /api/admin/puck?page=home&action=versions → { success, versions }
// DELETE /api/admin/puck?page=home → delete the page
export async function GET(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }
  const url = new URL(req.url)
  const page = url.searchParams.get('page') || 'home'
  const action = url.searchParams.get('action')
  if (action === 'versions') {
    const versions = await getPuckVersions(page)
    return NextResponse.json({ success: true, versions })
  }
  const data = await getPuckPage(page)
  return NextResponse.json({ success: true, data })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/admin/puck
//   { page, data }                    → publish/save
//   { page, action:'saveVersion', name, data }   → store the layout as a version
//   { page, action:'loadVersion', id }           → return the version
//   { page, action:'deleteVersion', id }         → delete the version
export async function POST(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body.page !== 'string') {
    return NextResponse.json({ success: false, message: 'Geçersiz veri.' }, { status: 400 })
  }

  const action = body.action || 'publish'

  if (action === 'saveVersion') {
    if (typeof body.data !== 'object' || !body.data) {
      return NextResponse.json({ success: false, message: 'Veri gerekli.' }, { status: 400 })
    }
    const versions = await addPuckVersion(body.page, String(body.name || ''), body.data)
    return NextResponse.json({ success: true, versions })
  }

  if (action === 'loadVersion') {
    const v = await getPuckVersion(body.page, String(body.id || ''))
    if (!v) {
      return NextResponse.json({ success: false, message: 'Sürüm bulunamadı.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: v.data })
  }

  if (action === 'deleteVersion') {
    const versions = await removePuckVersion(body.page, String(body.id || ''))
    return NextResponse.json({ success: true, versions })
  }

  // default: publish
  if (typeof body.data !== 'object' || !body.data) {
    return NextResponse.json({ success: false, message: 'Geçersiz veri.' }, { status: 400 })
  }
  await savePuckPage(body.page, body.data)
  revalidatePath(`/puck/${body.page}`, 'page')
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/puck?page=home
export async function DELETE(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }
  const page = new URL(req.url).searchParams.get('page')
  if (!page) {
    return NextResponse.json({ success: false, message: 'page gerekli.' }, { status: 400 })
  }
  await deletePuckPage(page)
  revalidatePath(`/puck/${page}`, 'page')
  return NextResponse.json({ success: true })
}