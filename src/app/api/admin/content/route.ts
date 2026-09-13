import type { SiteContent } from '@/lib/content'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getContent, saveContent } from '@/lib/content'
import { isAdminUser } from '@/lib/supabase/session'
import { contentSchema } from '@/lib/validations'

export async function POST(req: Request) {
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
      cv: parsed.data.about?.cv ?? current.about.cv,
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
  await saveContent(contentToSave as unknown as SiteContent)

  // Clear the ISR cache: content changed, must reflect immediately
  try {
    revalidatePath('/', 'layout')
  }
  catch { /* Workers: no-op */ }

  return NextResponse.json({ success: true, message: 'Kaydedildi.' })
}
