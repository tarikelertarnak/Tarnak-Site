import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/supabase/session'
import { contentSchema } from '@/lib/validations'
import { PAGE_SPECS } from '@/lib/page-text-specs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = contentSchema.safeParse(body?.content ?? body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Geçersiz içerik verisi.' },
      { status: 400 },
    )
  }

  const pageId = typeof body?.pageId === 'string' ? body.pageId : 'about'
  const page = PAGE_SPECS.find(p => p.id === pageId)
  const path = page?.path ?? '/'

  const origin = new URL(req.url).origin
  const url = new URL(path, origin)

  try {
    const cookie = req.headers.get('cookie') ?? ''
    const res = await fetch(url.toString(), {
      headers: {
        cookie,
        'user-agent': req.headers.get('user-agent') ?? '',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ success: false, message: `HTTP ${res.status}` }, { status: 502 })
    }
    let html = await res.text()

    // Preview content'i client'a iletmek için localStorage'a yazdıran script enjekte et
    const previewScript = `<script>
(function(){
  try {
    window.__ADMIN_PREVIEW_CONTENT__ = ${JSON.stringify(parsed.data)};
    try { localStorage.setItem('__admin_preview_content', JSON.stringify(window.__ADMIN_PREVIEW_CONTENT__)); } catch(e){}
    try { sessionStorage.setItem('__admin_preview_content', JSON.stringify(window.__ADMIN_PREVIEW_CONTENT__)); } catch(e){}
  } catch(e) {}
})();
</script>`

    if (html.includes('</body>')) {
      html = html.replace('</body>', previewScript + '\n</body>')
    } else if (html.includes('</html>')) {
      html = html.replace('</html>', previewScript + '\n</html>')
    } else {
      html = html + previewScript
    }

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
    // Content'i de cookie olarak gönder (server component'ler okuyabilsin)
    response.cookies.set('admin_preview_content', Buffer.from(JSON.stringify(parsed.data)).toString('base64'), {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 300,
    })
    return response
  }
  catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Preview hatası' }, { status: 500 })
  }
}

