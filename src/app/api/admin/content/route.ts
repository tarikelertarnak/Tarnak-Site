import type { SiteContent } from '@/lib/content'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getPosts } from '@/lib/blog'
import { getMessages } from '@/lib/chat'
import { getContent, saveContent } from '@/lib/content'
import { guardWrite } from '@/lib/rate-guard'
import { isAdminUser } from '@/lib/supabase/session'
import { contentSchema } from '@/lib/validations'

/*
 * 2026-10-13: GET eklendi.
 *
 * Neden: `/admin` sayfası kök layout'un `force-static`'i yüzünden istek
 * zamanlı cookie GÖREMİYOR (bkz. src/app/admin/page.tsx) — bu yüzden panel
 * artık istemci tarafında açılıyor. Panelin ilk verisi sunucu render'ında
 * build zamanına donmasın (bayat içerikle kaydetme = sessiz veri kaybı)
 * diye üç liste de tek uçtan, her istekte taze okunur.
 */
export async function GET() {
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  const [content, messages, blogPosts] = await Promise.all([
    getContent(),
    getMessages(),
    getPosts('tr'),
  ])

  return NextResponse.json({ success: true, content, messages, blogPosts })
}

export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına admin-content dakikada 20 yazma.
   * Pahalı işlemden (Supabase INSERT / dosya yazımı) ÖNCE kontrol edilir. */
  const denied = await guardWrite(req, 'admin-content')
  if (denied)
    return denied
  const admin = await isAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = contentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Geçersiz içerik verisi.',
        details: parsed.error.issues,
      },
      { status: 400 },
    )
  }

  // CV is not edited in the admin panel — keep the current value when saving
  const current = await getContent()
  const contentToSave: Record<string, unknown> = {
    ...parsed.data,
    about: {
      ...parsed.data.about,
      // `cv.href` panelde duzenlenebilir; gonderilmediyse MEVCUT degeri koru.
      // Eskiden `parsed.data.about?.cv ?? current.about.cv` yaziyordu: semada
      // `href` olmadigi icin parse edilen nesne href'siz geliyordu ve her
      // kaydetmede CV linki varsayilana geri donuyordu (sessiz veri kaybi).
      cv: parsed.data.about?.cv
        ? {
            ...parsed.data.about.cv,
            href: parsed.data.about.cv.href ?? current.about.cv?.href,
          }
        : current.about.cv,
    },
    // Contact card values are not edited in the admin panel — keep the current values
    contact: {
      ...parsed.data.contact,
      email: parsed.data.contact.email ?? current.contact.email ?? '',
      phone: parsed.data.contact.phone ?? current.contact.phone ?? '',
      location: parsed.data.contact.location ?? current.contact.location ?? '',
      locationYandex:
        parsed.data.contact.locationYandex
        ?? current.contact.locationYandex
        ?? '',
    },
  }

  // Admin body passes the schema fully + completes cv with the current value → full SiteContent
  const saved = await saveContent(contentToSave as unknown as SiteContent)

  if (!saved.ok) {
    // Sessizce "Kaydedildi." DEME — yazim basarisizsa degisiklik KALICI DEGIL.
    return NextResponse.json(
      { success: false, message: saved.error || 'İçerik kaydedilemedi.' },
      { status: 500 },
    )
  }

  // Clear the ISR cache: content changed, must reflect immediately
  try {
    revalidatePath('/', 'layout')
  }
  catch { /* Workers: no-op */ }

  return NextResponse.json({ success: true, message: 'Kaydedildi.' })
}
