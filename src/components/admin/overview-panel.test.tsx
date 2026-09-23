import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OverviewPanel } from '@/components/admin/overview-panel'

/**
 * Genel Bakis paneli testleri.
 *
 * En onemli iddia: `count === null` (tablo YOK) ile `count === 0`
 * (gercekten sifir kayit) AYNI gosterilmemeli. Ikisini "0" yapan bir hata
 * kullaniciya "veri var ama bos" diye yanlis bilgi verir; bu projede
 * daha once tam olarak bu sinifta bir hata yasandi (head:true tuzagi).
 *
 * Neden Button mock'lanmis:
 *  - Lobehub `Button` saglayici ister ("wrap your app with <ConfigProvider>").
 *  - `@lobehub/ui` BARREL'i `@emoji-mart/data/.../native.json` cekiyor ve
 *    vitest "needs an import attribute of type: json" ile patliyor.
 *  - `MotionProvider` bir alt-yol olarak export EDILMEMIS.
 * Testin amaci Lobehub'u dogrulamak degil, PANEL mantigini dogrulamak —
 * bu yuzden butonu basit bir <button>'a indiriyoruz.
 */
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    startContent,
  }: {
    children?: React.ReactNode
    onPress?: () => void
    isDisabled?: boolean
    startContent?: React.ReactNode
  }) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>
      {startContent}
      {children}
    </button>
  ),
}))

const PAYLOAD = {
  success: true,
  generatedAt: '2026-09-22T19:00:00.000Z',
  tables: [
    {
      key: 'posts',
      label: 'Blog Yazıları',
      icon: 'mdi:post-outline',
      description: 'Blog yazılarını yönet.',
      count: 12,
      status: 'ok',
    },
    {
      key: 'ad-slots',
      label: 'Reklamlar',
      icon: 'mdi:bullhorn-outline',
      description: 'Reklam birimleri.',
      count: null,
      status: 'missing',
      message: 'Tablo veritabanında yok.',
    },
  ],
  messages: { total: 5, unread: 2 },
  ads: {
    totalViews: 40,
    completedViews: 31,
    todayViews: 3,
    source: 'db',
    recent: [
      { id: 1, slot_slug: 'pixelshield', completed: true, watched_seconds: 15, created_at: '2026-09-22T18:00:00.000Z' },
    ],
  },
  recent: {
    posts: [
      { id: 1, title: 'İlk Yazı', slug: 'ilk-yazi', published: true, created_at: '2026-09-22T17:00:00.000Z' },
      { id: 2, title: 'Taslak Yazı', slug: 'taslak', published: false, created_at: '2026-09-21T17:00:00.000Z' },
    ],
    projects: [],
    messages: [
      { id: 1, name: 'Ahmet', email: 'a@b.c', subject: 'Merhaba', is_read: false, created_at: '2026-09-22T16:00:00.000Z' },
    ],
  },
  warnings: ['"Reklamlar" tablosu (ad-slots) veritabanında yok — ilgili SQL dosyasını Supabase SQL Editor\'de çalıştır.'],
}

function mockFetch(body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  // vitest `globals: false` oldugu icin testing-library'nin otomatik temizligi
  // DEVREYE GIRMEZ. cleanup() olmadan onceki testin DOM'u kalir ve
  // "Found multiple elements with the text: ..." hatalari cikar.
  cleanup()
  vi.unstubAllGlobals()
})

describe('OverviewPanel', () => {
  it('yukleniyor durumunu gosterir, sonra veriyi cizer', async () => {
    // Ilk iddia icin fetch BILEREK hic cozulmez: aksi halde testing-library'nin
    // act() sarmalayicisi mikrogorevleri de bosaltir ve veri aninda gelir,
    // "yukleniyor" durumu hic gozlenemez.
    let resolveFetch: (v: unknown) => void = () => {}
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    ))

    render(<OverviewPanel />)
    expect(screen.getByText(/yükleniyor/i)).toBeTruthy()

    resolveFetch({ ok: true, status: 200, json: async () => PAYLOAD })

    await waitFor(() => {
      expect(screen.getByText('Genel Bakış')).toBeTruthy()
    })
    expect(screen.getByText('Blog Yazıları')).toBeTruthy()
  })

  it('null sayimi "—" gosterir, "0" DEGIL (tablo yok != bos tablo)', async () => {
    mockFetch(PAYLOAD)
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Reklamlar')).toBeTruthy())

    const missingCard = screen.getByText('Reklamlar').closest('button')
    expect(missingCard).toBeTruthy()
    const text = missingCard!.textContent ?? ''
    expect(text).toContain('—')
    // "0" icermemeli: tablo yokken 0 gostermek yanlis bilgi olurdu.
    expect(text).not.toMatch(/\b0\b/)
  })

  it('gercek sifir sayimi normal sayi olarak gosterir', async () => {
    mockFetch({
      ...PAYLOAD,
      tables: [{ ...PAYLOAD.tables[0], count: 0, status: 'ok' }],
    })
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Blog Yazıları')).toBeTruthy())
    const card = screen.getByText('Blog Yazıları').closest('button')
    expect(card!.textContent).toContain('0')
    expect(card!.textContent).not.toContain('—')
  })

  it('okunmamis mesaj sayisini ve reklam sayacini gosterir', async () => {
    mockFetch(PAYLOAD)
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Okunmamış mesaj')).toBeTruthy())
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('5 toplam mesaj')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('40 toplam')).toBeTruthy()
  })

  it('uyarilari listeler', async () => {
    mockFetch(PAYLOAD)
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText(/dikkat gerektiren nokta/)).toBeTruthy())
    expect(screen.getByText(/Reklamlar.*veritabanında yok/)).toBeTruthy()
  })

  it('reklam tablolari yoksa sayaci "—" gosterir', async () => {
    mockFetch({
      ...PAYLOAD,
      ads: { totalViews: 0, completedViews: 0, todayViews: 0, source: 'fallback', recent: [] },
    })
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Bugün izlenen reklam')).toBeTruthy())
    expect(screen.getByText('reklam tabloları yok')).toBeTruthy()
  })

  it('tablo kartina tiklaninca onNavigate kaynak anahtariyla cagrilir', async () => {
    mockFetch(PAYLOAD)
    const onNavigate = vi.fn()
    render(<OverviewPanel onNavigate={onNavigate} />)

    await waitFor(() => expect(screen.getByText('Blog Yazıları')).toBeTruthy())
    screen.getByText('Blog Yazıları').closest('button')!.click()

    expect(onNavigate).toHaveBeenCalledWith('posts')
  })

  it('onNavigate verilmezse kartlar devre disi olur', async () => {
    mockFetch(PAYLOAD)
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Blog Yazıları')).toBeTruthy())
    const card = screen.getByText('Blog Yazıları').closest('button') as HTMLButtonElement
    expect(card.disabled).toBe(true)
  })

  it('API hata dondurunce hata mesajini gosterir', async () => {
    mockFetch({ success: false, message: 'Yetkisiz.' })
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Yetkisiz.')).toBeTruthy())
  })

  it('ag hatasinda kullaniciya haber verir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Sunucuya ulaşılamadı.')).toBeTruthy())
  })

  it('son kayitlari listeler (yayinda/taslak/yeni etiketleriyle)', async () => {
    mockFetch(PAYLOAD)
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    expect(screen.getByText('yayında')).toBeTruthy()
    expect(screen.getByText('taslak')).toBeTruthy()
    expect(screen.getByText('yeni')).toBeTruthy()
  })

  // ------------------------------------------------------- KALICILIK DURUMU

  it('kalicilik calisiyorsa olumlu durumu gosterir', async () => {
    mockFetch({
      ...PAYLOAD,
      persistence: {
        dataWritable: true,
        uploadsWritable: true,
        ok: true,
        note: 'Kalıcılık çalışıyor: içerik, şifre ve görsel yüklemeleri diske yazılabiliyor.',
      },
    })
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Kaydetme kalıcı')).toBeTruthy())
    expect(screen.getByText(/Kalıcılık çalışıyor/)).toBeTruthy()
  })

  it('SALT-OKUNUR sistemde KRITIK uyariyi gosterir (Vercel senaryosu)', async () => {
    mockFetch({
      ...PAYLOAD,
      persistence: {
        dataWritable: false,
        uploadsWritable: false,
        ok: false,
        note: 'Sunucu dosya sistemi SALT-OKUNUR (Vercel). İçerik/şifre kaydetme ve görsel yükleme KALICI DEĞİL.',
      },
    })
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Kaydetme KALICI DEĞİL')).toBeTruthy())
    expect(screen.getByText(/SALT-OKUNUR/)).toBeTruthy()
    // Hangi dizinin yazilamadigi da gorunmeli
    expect(screen.getAllByText(/YAZILAMIYOR/).length).toBe(2)
  })

  it('kalicilik bilgisi yoksa banner cizilmez (geriye donuk uyumlu)', async () => {
    mockFetch(PAYLOAD) // PAYLOAD'da persistence yok
    render(<OverviewPanel />)

    await waitFor(() => expect(screen.getByText('Genel Bakış')).toBeTruthy())
    expect(screen.queryByText('Kaydetme kalıcı')).toBeNull()
    expect(screen.queryByText('Kaydetme KALICI DEĞİL')).toBeNull()
  })
})
