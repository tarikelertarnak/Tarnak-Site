import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminUser } from '@/lib/supabase/session'
import { deletePost, upsertPost } from '@/lib/blog'
import type { BlogPost } from '@/lib/content'

export async function POST(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const action = body?.action

  if (action === 'upsert') {
    const post = body?.post as BlogPost | undefined
    if (
      !post ||
      typeof post.id !== 'string' ||
      typeof post.title !== 'string' ||
      typeof post.slug !== 'string' ||
      typeof post.date !== 'string' ||
      typeof post.excerpt !== 'string' ||
      typeof post.content !== 'string'
    ) {
      return NextResponse.json({ success: false, message: 'Geçersiz yazı verisi.' }, { status: 400 })
    }
    if (!post.title.trim() || !post.slug.trim()) {
      return NextResponse.json({ success: false, message: 'Başlık ve slug zorunlu.' }, { status: 400 })
    }

    await upsertPost(post)
    revalidatePath('/', 'layout')
    revalidatePath('/blog')
    revalidatePath(`/blog/${post.slug}`)
    return NextResponse.json({ success: true, message: 'Yazı kaydedildi.' })
  }

  if (action === 'delete') {
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) {
      return NextResponse.json({ success: false, message: 'Yazı ID gerekli.' }, { status: 400 })
    }

    await deletePost(id)
    revalidatePath('/', 'layout')
    revalidatePath('/blog')
    return NextResponse.json({ success: true, message: 'Yazı silindi.' })
  }

  return NextResponse.json({ success: false, message: 'Geçersiz işlem.' }, { status: 400 })
}