import { NextResponse } from 'next/server'
import { checkLimit, LIMITS } from '@/lib/rate-limit-kv'
import { createOptionalAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const list = url.searchParams.get('list')
    const title = url.searchParams.get('title')

    const supabase = createOptionalAdminClient()
    if (!supabase) {
      return NextResponse.json({ success: true, items: [] })
    }

    if (list) {
      const { data, error } = await supabase
        .from('project_stats')
        .select('title, views, downloads')
      if (error) {
        return NextResponse.json({ success: true, items: [] })
      }
      const items = (data ?? []).map(r => ({
        title: r.title as string,
        views: (r.views as number) ?? 0,
        downloads: (r.downloads as number) ?? 0,
      }))
      return NextResponse.json({ success: true, items })
    }

    if (!title) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }
    const { data } = await supabase
      .from('project_stats')
      .select('views, downloads')
      .eq('title', title)
      .maybeSingle()
    return NextResponse.json({
      views: (data?.views as number) ?? 0,
      downloads: (data?.downloads as number) ?? 0,
    })
  }
  catch {
    return NextResponse.json({ success: true, items: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string
      type?: 'view' | 'download'
    }
    const title = body?.title
    const type = body?.type
    if (!title || typeof title !== 'string' || title.length > 200) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }
    if (type !== 'view' && type !== 'download') {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }

    const supabase = createOptionalAdminClient()
    if (!supabase) {
      return NextResponse.json({ counted: false, views: 0, downloads: 0 })
    }

    // Rate limit — sayma engellenir, işlem engellenmez (stars ile aynı desen).
    const rl = await checkLimit(
      'project-stats',
      { ...LIMITS.counter, failClosed: false },
      request,
    )

    // Mevcut satırı oku (yoksa 0).
    const { data: existing } = await supabase
      .from('project_stats')
      .select('views, downloads')
      .eq('title', title)
      .maybeSingle()
    const views = (existing?.views as number) ?? 0
    const downloads = (existing?.downloads as number) ?? 0

    if (!rl.ok) {
      return NextResponse.json(
        { counted: false, views, downloads },
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
          },
        },
      )
    }

    const nextViews = type === 'view' ? views + 1 : views
    const nextDownloads = type === 'download' ? downloads + 1 : downloads
    await supabase
      .from('project_stats')
      .upsert(
        { title, views: nextViews, downloads: nextDownloads, updated_at: new Date().toISOString() },
        { onConflict: 'title' },
      )

    return NextResponse.json({ counted: true, views: nextViews, downloads: nextDownloads })
  }
  catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
