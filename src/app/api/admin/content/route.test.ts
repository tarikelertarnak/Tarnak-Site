import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `/api/admin/content` yazma ucunun güvenilir sınır testleri (2026-10-17).
 *
 * NEDEN: bu uç, `contentSchema`'nın (zod 4) BİLİNMEYEN ANAHTARLARI SESSİZCE
 * SİLMESİ yüzünden gerçek bir veri kaybı yaşadı — `phase6` şemada olmadığı için
 * her kaydetmede ek bölümler yok oluyordu. Aynı sınıf hatanın geri gelmemesi
 * için üç sözleşme ölçülür:
 *   1. istemci alanı göndermezse MEVCUT değer korunur (veri kaybı yok),
 *   2. geçersiz `aboutPage` 400 ile reddedilir (doğrulama sunucuda),
 *   3. yetkisiz istek 401 — hiçbir yazma denemesi yapılmaz.
 */

const getContentMock = vi.fn()
const saveContentMock = vi.fn()
const isAdminUserMock = vi.fn()
const guardWriteMock = vi.fn()

vi.mock('@/lib/content', () => ({
  getContent: (...a: unknown[]) => getContentMock(...a),
  saveContent: (...a: unknown[]) => saveContentMock(...a),
}))
vi.mock('@/lib/supabase/session', () => ({
  isAdminUser: () => isAdminUserMock(),
}))
vi.mock('@/lib/rate-guard', () => ({
  guardWrite: (...a: unknown[]) => guardWriteMock(...a),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/blog', () => ({ getPosts: vi.fn(async () => []) }))
vi.mock('@/lib/chat', () => ({ getMessages: vi.fn(async () => []) }))

const { POST } = await import('@/app/api/admin/content/route')

/** Panelin gönderdiği en küçük geçerli gövde: gerçek `data/content.json` şekli. */
function govde(over: Record<string, unknown> = {}): Record<string, unknown> {
  const temel = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'content.json'), 'utf-8'),
  ) as Record<string, unknown>
  return { ...temel, ...over }
}

function istek(body: unknown) {
  return new Request('http://localhost/api/admin/content', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** `data/content.json` içindeki `about` bloğu (kısmi override için taban). */
function tabanAbout(): Record<string, unknown> {
  const temel = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'content.json'), 'utf-8'),
  ) as { about: Record<string, unknown> }
  return temel.about
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminUserMock.mockResolvedValue(true)
  guardWriteMock.mockResolvedValue(null)
  saveContentMock.mockResolvedValue({ ok: true })
  getContentMock.mockResolvedValue({
    siteName: 'ESKI',
    phase6: { sections: [{ id: 'mevcut' }] },
    aboutPage: { title: { tr: 'HAKKIMDA' } },
    about: { cv: { href: '/cv/eski.pdf' } },
    contact: { email: 'a@b.c', phone: '1', location: 'İstanbul' },
  })
})

describe('/api/admin/content POST — yetki ve hız sınırı', () => {
  it('yetkisiz istek 401 döner ve HİÇ yazmaz', async () => {
    isAdminUserMock.mockResolvedValue(false)
    const res = await POST(istek(govde()))
    expect(res.status).toBe(401)
    expect(saveContentMock).not.toHaveBeenCalled()
  })

  it('hız sınırı engeli yanıtı olduğu gibi döner', async () => {
    const { NextResponse } = await import('next/server')
    guardWriteMock.mockResolvedValue(
      NextResponse.json({ success: false, message: 'çok istek' }, { status: 429 }),
    )
    const res = await POST(istek(govde()))
    expect(res.status).toBe(429)
    expect(saveContentMock).not.toHaveBeenCalled()
  })
})

describe('/api/admin/content POST — veri kaybı koruması', () => {
  it('istemci `phase6` göndermezse MEVCUT ek bölümler korunur', async () => {
    await POST(istek(govde()))
    const kaydedilen = saveContentMock.mock.calls[0]![0] as Record<string, unknown>
    expect(kaydedilen.phase6).toEqual({ sections: [{ id: 'mevcut' }] })
  })

  it('istemci `aboutPage` göndermezse MEVCUT hakkımda içeriği korunur', async () => {
    await POST(istek(govde()))
    const kaydedilen = saveContentMock.mock.calls[0]![0] as Record<string, unknown>
    expect(kaydedilen.aboutPage).toEqual({ title: { tr: 'HAKKIMDA' } })
  })

  it('cV `href` gönderilmezse mevcut bağlantı korunur (varsayılana dönmez)', async () => {
    const cv = tabanAbout().cv as Record<string, unknown>
    await POST(istek(govde({ about: { ...tabanAbout(), cv: { ...cv, href: undefined } } })))
    const kaydedilen = saveContentMock.mock.calls[0]![0] as Record<string, unknown>
    const about = kaydedilen.about as { cv?: { href?: string } }
    expect(about.cv?.href).toBe('/cv/eski.pdf')
  })

  it('istemci gerçekten yeni bir değer gönderirse o değer yazılır', async () => {
    await POST(istek(govde({ phase6: { sections: [{ id: 'yeni' }] } })))
    const kaydedilen = saveContentMock.mock.calls[0]![0] as Record<string, unknown>
    expect(kaydedilen.phase6).toEqual({ sections: [{ id: 'yeni' }] })
  })
})

describe('/api/admin/content POST — sunucu tarafı doğrulama', () => {
  it('geçersiz `aboutPage` (benzersiz olmayan anahtar) 400 ile reddedilir', async () => {
    const res = await POST(
      istek(
        govde({
          aboutPage: {
            title: { tr: 'H', en: 'A' },
            areas: [
              { key: 'ayni', title: { tr: 'a', en: 'a' } },
              { key: 'ayni', title: { tr: 'b', en: 'b' } },
            ],
          },
        }),
      ),
    )
    expect(res.status).toBe(400)
    const json = (await res.json()) as { message: string }
    expect(json.message).toBe('Hakkımda içeriği geçersiz.')
    expect(saveContentMock).not.toHaveBeenCalled()
  })

  it('geçersiz `aboutPage` (kebab-case olmayan anahtar) 400 ile reddedilir', async () => {
    const res = await POST(
      istek(
        govde({
          aboutPage: {
            title: { tr: 'H', en: 'A' },
            values: [{ key: 'Büyük Harf!', title: { tr: 'a', en: 'b' } }],
          },
        }),
      ),
    )
    expect(res.status).toBe(400)
    expect(saveContentMock).not.toHaveBeenCalled()
  })

  it('geçerli `aboutPage` kabul edilir ve kaydedilir', async () => {
    const aboutPage = {
      title: { tr: 'HAKKIMDA', en: 'ABOUT ME' },
      intro: { tr: 'bir', en: 'one' },
      areas: [
        { key: 'web', title: { tr: 'Web', en: 'Web' }, description: { tr: 'd', en: 'd' } },
      ],
      journey: [
        {
          key: 'ilk-adim',
          title: { tr: 'İlk', en: 'First' },
          description: { tr: 'd', en: 'd' },
          period: '',
        },
      ],
      values: [
        {
          key: 'durustluk',
          title: { tr: 'Dürüstlük', en: 'Honesty' },
          description: { tr: 'd', en: 'd' },
        },
      ],
      closing: { tr: 'son', en: 'end' },
    }
    const res = await POST(istek(govde({ aboutPage })))
    expect(res.status).toBe(200)
    const kaydedilen = saveContentMock.mock.calls[0]![0] as Record<string, unknown>
    expect(kaydedilen.aboutPage).toEqual(aboutPage)
  })

  it('boş `period` serbest kabul edilir (uydurma yıl yazma zorunluluğu yok)', async () => {
    const res = await POST(
      istek(
        govde({
          aboutPage: {
            journey: [
              {
                key: 'x',
                title: { tr: 't', en: 't' },
                description: { tr: '', en: '' },
                period: '',
              },
            ],
          },
        }),
      ),
    )
    expect(res.status).toBe(200)
  })
})
