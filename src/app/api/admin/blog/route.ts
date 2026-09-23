import type { BlogPost } from '@/lib/content'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { deletePost, upsertPost } from '@/lib/blog'
import { isAdminUser } from '@/lib/supabase/session'

/** ISR invalidation — safe no-op on Cloudflare Workers (no ISR cache there). */
function invalidateBlog(slug?: string) {
  try {
    revalidatePath('/', 'layout')
    revalidatePath('/blog')
    if (slug)
      revalidatePath(`/blog/${slug}`)
  }
  catch { /* Workers: no-op */ }
}

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
      !post
      || typeof post.id !== 'string'
      || typeof post.title !== 'string'
      || typeof post.slug !== 'string'
      || typeof post.date !== 'string'
      || typeof post.excerpt !== 'string'
      || typeof post.content !== 'string'
    ) {
      return NextResponse.json({ success: false, message: 'Geçersiz yazı verisi.' }, { status: 400 })
    }
    if (!post.title.trim() || !post.slug.trim()) {
      return NextResponse.json({ success: false, message: 'Başlık ve slug zorunlu.' }, { status: 400 })
    }

    const result = await upsertPost(post)

    if (!result.ok) {
      // Sessizce "kaydedildi" DEME: yazim gercekten basarisiz olduysa
      // kullanici yazisinin yayinlandigini sanardi.
      return NextResponse.json(
        {
          success: false,
          message: result.supabaseConfigured
            ? `Yazı veritabanına kaydedilemedi: ${result.error || 'bilinmeyen hata'}`
            : `Yazı kaydedilemedi: ${result.error || 'bilinmeyen hata'}`,
        },
        { status: 500 },
      )
    }

    invalidateBlog(post.slug)

    return NextResponse.json({
      success: true,
      message: result.supabaseConfigured
        ? 'Yazı kaydedildi.'
        : 'Yazı yerel yedek dosyaya kaydedildi (Supabase yapılandırılmamış).',
    })
  }

  if (action === 'delete') {
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) {
      return NextResponse.json({ success: false, message: 'Yazı ID gerekli.' }, { status: 400 })
    }

    const result = await deletePost(id)

    if (!result.ok) {
      // "Kayit yok" (404) ile "silemedim" (500) AYRI seylerdir. Ikisini 500
      // dondurmek istemciyi yanlis yonlendirir.
      return NextResponse.json(
        { success: false, notFound: result.notFound || undefined, message: result.error || 'Yazı silinemedi.' },
        { status: result.notFound ? 404 : 500 },
      )
    }

    invalidateBlog()

    return NextResponse.json({ success: true, message: 'Yazı silindi.' })
  }

  return NextResponse.json({ success: false, message: 'Geçersiz işlem.' }, { status: 400 })
}
