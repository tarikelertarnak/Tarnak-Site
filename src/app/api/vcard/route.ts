import type { VCard } from '@/lib/phase6'
import { SITE_URL } from '@/lib/site-url'
import { buildVCard, vcardFilename } from '@/lib/vcard'

/**
 * GET /api/vcard — kartvizit indirme (Faz 6 · 2)
 *
 * Tarayıcı tarafında `Blob` + `URL.createObjectURL` ile de yapılabilirdi;
 * ama `download` özniteliği için doğru `Content-Type` ve
 * `Content-Disposition` gerekiyor — route bunu standart verir.
 *
 * Önbellek YOK (`no-store`): içerik değişince eski kartvizit
 * tarayıcıda kalmasın. Dosya adı kişi adından türetilir.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  // İçeriği burada okumak yerine doğrudan env'den kuruyoruz: kartvizit
  // kimlik bilgisi, içerik dosyasının tamamını sunucuda gezmeye gerek yok.
  // Ancak özel alanlar (telefon, adres) `data/content.json` içinde.
  // Bu yüzden içerik burada okunur.
  const { getContent } = await import('@/lib/content')
  const content = await getContent()

  const p = content.profile
  const c = content.contact
  const vcard = ((content as unknown as Record<string, unknown>).vcard ??
    {}) as VCard

  if (vcard.enabled === false) {
    return new Response('Not found', { status: 404 })
  }

  const ad =
    [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.displayName
  const vcardText = buildVCard({
    firstName: p.firstName,
    lastName: p.lastName,
    displayName: p.displayName,
    nickname: p.nickname,
    title: 'Yazılımcı & Sistem Mimarisi',
    organization: content.profile.displayName,
    email: c.email,
    phone: c.phone,
    url: SITE_URL,
    social: (content.social ?? []).map((s) => s?.href).filter(Boolean)[0],
    note: vcard.note,
  })

  const dosya = vcardFilename(ad)

  return new Response(vcardText, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${dosya}"`,
      'Cache-Control': 'no-store',
    },
  })
}
