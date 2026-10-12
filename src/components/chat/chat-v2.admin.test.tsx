import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/components/locale-provider'
import { ChatV2 } from './chat-v2'

/**
 * Admin sohbet yönetimi (2026-10-11 kullanıcı isteği).
 *
 * Sağ tık menüsü: profil incele · takma ad koy · favorilere ekle · sohbeti sabitle
 * · engelle · sohbeti temizle · sohbeti sil.
 *
 * EN ÖNEMLİ İDİA: "Profilini incele" şifre / e-posta(gmail) / telefon
 * GÖSTERMEZ. Kullanıcı bunu açıkça istedi ("canlı yayında olursa sıkıntı
 * yaratacak"). Sunucu bu alanları hiç göndermiyor; arayüz de göstermiyor.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children, onPress, isDisabled, startContent,
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

const PEERS = [
  { id: 'u-1', username: 'ayse', fullName: 'Ayşe Yılmaz', nickname: 'Ayşecik', avatarUrl: null },
  { id: 'u-2', username: 'mehmet', fullName: 'Mehmet Demir', nickname: null, avatarUrl: null },
]

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', spy)
  return spy
}

async function renderAdminChat(extra: (url: string, init?: RequestInit) => Promise<Response> = () =>
  jsonResponse({ success: true, conversation: { id: 'conv-1' }, messages: [] })) {
  const spy = mockFetch((url, init) => {
    if (url.includes('/api/admin/session')) {
      return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
    }
    if (url.includes('/api/chat/users')) {
      return jsonResponse({ success: true, users: PEERS })
    }
    return extra(url, init)
  })
  render(
    <LocaleProvider detectedLocale="tr">
      <ChatV2 />
    </LocaleProvider>,
  )
  await waitFor(() => expect(document.querySelector('[role="status"]')).toBeNull())
  return spy
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('admin kullanıcı menüsü', () => {
  it('sağ tık menüsünü açar: profil, takma ad, favori, sabitle, engelle, temizle, sil', async () => {
    await renderAdminChat()
    fireEvent.contextMenu(screen.getByText('Ayşecik'))

    /*
      Not: buton metinleri ikonla birleşik ("👤Profilini incele"), bu yüzden
      tam metin yerine regex kullanılıyor (testing-library doğrudan text node
      çocuklarını birleştirip regex ile karşılaştırır).
    */
    for (const label of [
      /Profilini incele/,
      /Takma ad koy/,
      /Favorilere ekle/,
      /Sohbeti sabitle/,
      /Engelle/,
      /Sohbeti temizle/,
      /Sohbeti sil/,
    ]) {
      expect(screen.getByText(label), String(label)).not.toBeNull()
    }
  })

  it('takma ad aramada çalışır — takma ad VE gerçek ad aynı kişiyi bulur', async () => {
    await renderAdminChat()
    const box = screen.getByRole('searchbox')

    // takma adla ara
    fireEvent.change(box, { target: { value: 'ayşecik' } })
    expect(screen.getByText('Ayşecik')).not.toBeNull()
    expect(screen.queryByText('Mehmet Demir')).toBeNull()

    // GERÇEK ADIYLA da ara (takma ad kondu diye kaybolmamalı — kullanıcı isteği)
    fireEvent.change(box, { target: { value: 'yılmaz' } })
    expect(screen.getByText('Ayşecik')).not.toBeNull()

    // kullanıcı adıyla da
    fireEvent.change(box, { target: { value: 'mehmet' } })
    expect(screen.getByText('Mehmet Demir')).not.toBeNull()
  })

  it('takma ad kaydedilir ve liste anında güncellenir', async () => {
    const spy = await renderAdminChat((url, init) => {
      if (url.includes('/api/chat/v2') && init?.method === 'POST' && String(init?.body).includes('nickname')) {
        return jsonResponse({ success: true, nickname: 'Yeni Takma' })
      }
      return jsonResponse({ success: true })
    })

    fireEvent.contextMenu(screen.getByText('Ayşecik'))
    fireEvent.click(screen.getByText(/Takma ad koy/))
    fireEvent.change(screen.getByLabelText('Takma ad koy'), { target: { value: 'Yeni Takma' } })
    fireEvent.click(screen.getByText(/Kaydet/))

    await waitFor(() => expect(screen.getByText('Yeni Takma')).not.toBeNull())
    const call = spy.mock.calls.find(c => String(c[1]?.body).includes('nickname'))
    expect(call).toBeTruthy()
    expect(JSON.parse(String(call![1]!.body))).toMatchObject({ action: 'nickname', userId: 'u-1', nickname: 'Yeni Takma' })
  })

  it('favori/engelle/sabitle istekleri doğru gövdeyle gider', async () => {
    const spy = await renderAdminChat((url, init) => {
      if (url.includes('/api/chat/v2') && init?.method === 'POST' && String(init?.body).includes('"action":"open"')) {
        return jsonResponse({ success: true, conversation: { id: 'conv-1' } })
      }
      return jsonResponse({ success: true })
    })

    fireEvent.contextMenu(screen.getByText('Ayşecik'))
    fireEvent.click(screen.getByText(/Favorilere ekle/))

    await waitFor(() => {
      const call = spy.mock.calls.find(c => String(c[1]?.body).includes('"action":"favorite"'))
      expect(call).toBeTruthy()
      expect(JSON.parse(String(call![1]!.body))).toMatchObject({
        action: 'favorite',
        favorite: true,
        conversationId: 'conv-1',
        userId: 'u-1',
      })
    })
  })

  it('"Profilini incele": gruplar ve sayılar görünür, GİZLİ alanlar GÖRÜNMEZ', async () => {
    await renderAdminChat((url, init) => {
      if (url.includes('/api/chat/v2') && String(init?.body).includes('"action":"profile"')) {
        return jsonResponse({
          success: true,
          profile: {
            id: 'u-1',
            username: 'ayse',
            fullName: 'Ayşe Yılmaz',
            nickname: 'Ayşecik',
            avatarUrl: null,
            bio: 'Yazılımcı',
            githubHandle: 'ayse',
            website: 'https://ayse.dev',
            role: 'user',
            isOwner: false,
            createdAt: '2026-01-02T00:00:00.000Z',
            messageCount: 12,
            groups: [{ conversationId: 'g1', title: 'Ekip' }],
          },
        })
      }
      return jsonResponse({ success: true })
    })

    fireEvent.contextMenu(screen.getByText('Ayşecik'))
    fireEvent.click(screen.getByText(/Profilini incele/))

    await waitFor(() => expect(screen.getByText(/Yazılımcı/)).not.toBeNull())
    expect(screen.getByText(/Ekip/)).not.toBeNull() // grup üyeliği
    expect(screen.getByText('12')).not.toBeNull() // mesaj sayısı
    expect(screen.getByText('2026-01-02')).not.toBeNull() // kayıt tarihi

    /*
      GÜVENLİK — kullanıcının isteği: şifre, gmail/e-posta ve telefon
      "canlı yayında sıkıntı yaratır", gizlenmeli.

      NOT: Arayüzdeki gizlilik NOTU bu kelimeleri (şifre/e-posta/telefon)
      bilerek SAYAR; bu yüzden kelimelerin değil GERÇEK DEĞERLERİ aranır:
        · e-posta adresi deseni
        · telefon numarası deseni
        · parola özeti (bcrypt) deseni
      Sunucu katmanındaki asıl garanti: getAdminProfileView() gizli sütunu
      SEÇİM bile yapmıyor (bkz. chat-v2.test.ts sözleşme testi).
    */
    const html = document.body.innerHTML
    expect(html, 'e-posta adresi sızdı').not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
    expect(html, 'telefon numarası sızdı').not.toMatch(/(?:\+90|\b0\d{2,3})[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/)
    expect(html, 'parola özeti sızdı').not.toMatch(/\$2[aby]?\$\d{2}\$|password_hash/i)
  })

  /*
    2026-10-11 (kullanıcı): "Henüz başka kullanıcı yok bu yazı olmasın kendim
    bile her kim kayıtlıysa herkez orada gözüksün". Yani admin'in KENDİ profili
    de listede olmalı ve o yazı hiçbir yerde görünmemeli.
  */
  it('kendim dahil her kayıtlı kişi listelenir — "Henüz başka kullanıcı yok" YOK', async () => {
    mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          users: [{ id: 'admin:OWNER', username: 'tarnak', fullName: 'TARIKELER', avatarUrl: null }],
        })
      }
      return jsonResponse({ success: true })
    })
    render(
      <LocaleProvider detectedLocale="tr">
        <ChatV2 />
      </LocaleProvider>,
    )
    await waitFor(() => expect(document.querySelector('[role="status"]')).toBeNull())

    expect(screen.getAllByText('TARIKELER').length).toBeGreaterThan(0)
    expect(screen.queryByText(/henüz başka kullanıcı yok/i)).toBeNull()
  })

  /*
    Nokta renkleri: yeşil = çevrimiçi, kırmızı = çevrimdışı, sarı = "bana bir
    şey gönderecek" (yazıyor / dosya yüklüyor / ses gönderiyor). İpucu metni
    (`aria-label`) tam durumu söyler.
  */
  it('avatarsız da olsa her kişide durum noktası var: yeşil / kırmızı / sarı', async () => {
    const iso = (ms: number) => new Date(Date.now() - ms).toISOString()
    mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          users: [
            { id: 'u-1', username: 'ayse', fullName: 'Ayşe Yılmaz', avatarUrl: null, lastSeenAt: iso(3_000), presenceState: null },
            { id: 'u-2', username: 'mehmet', fullName: 'Mehmet Demir', avatarUrl: null, lastSeenAt: iso(5 * 60_000), presenceState: null },
            { id: 'u-3', username: 'zeynep', fullName: 'Zeynep Ak', avatarUrl: null, lastSeenAt: iso(2_000), presenceState: 'typing' },
          ],
        })
      }
      return jsonResponse({ success: true })
    })
    render(
      <LocaleProvider detectedLocale="tr">
        <ChatV2 />
      </LocaleProvider>,
    )
    await waitFor(() => expect(document.querySelector('[role="status"]')).toBeNull())

    expect(screen.getByLabelText('Çevrimiçi')).not.toBeNull()
    expect(screen.getByLabelText('Çevrimdışı')).not.toBeNull()
    expect(screen.getByLabelText(/yazıyor/)).not.toBeNull()
  })

  /*
    Hiyerarşi: sabitlenen en üstte, sarı (şu an gönderiyor) konuşmaların
    üstünde, konuşulanlar kendi içinde en yeni önce. Sıralamanın saf mantığı
    `lib/chat-peers.test.ts`te; burada LİSTEDE göründüğü kanıtlanır.
  */
  it('liste hiyerarşisi: sabitlenen → sarı → en son konuşulan', async () => {
    mockFetch((url, init) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          users: [
            { id: 'u-1', username: 'busra', fullName: 'Büşra', avatarUrl: null },
            { id: 'u-2', username: 'cem', fullName: 'Cem', avatarUrl: null, lastSeenAt: new Date().toISOString(), presenceState: 'uploading' },
            { id: 'u-3', username: 'deniz', fullName: 'Deniz', avatarUrl: null },
          ],
        })
      }
      if (url.includes('/api/chat/v2') && !init?.method) {
        return jsonResponse({
          success: true,
          conversations: [
            { id: 'c-1', direct_key: 'admin:OWNER|u-1', important: true, favorite: false, blocked: false, updated_at: null, last_preview: null, last_sender_name: null },
          ],
        })
      }
      return jsonResponse({ success: true })
    })
    render(
      <LocaleProvider detectedLocale="tr">
        <ChatV2 />
      </LocaleProvider>,
    )
    await waitFor(() => expect(document.querySelector('[role="status"]')).toBeNull())

    // Sabitlenen (Büşra) ve sarı (Cem) listenin ilk iki satırı olmalı.
    const rows = screen.getAllByRole('button')
      .map(b => b.textContent ?? '')
      .filter(text => /Büşra|Cem|Deniz/.test(text))
    expect(rows[0]).toContain('Büşra')
    expect(rows[1]).toContain('Cem')
    expect(rows[2]).toContain('Deniz')
  })

  /*
    2026-10-12 (kullanıcı): "chat gerçek çalışır tam olsun". Kullanıcının
    gördüğü hâl: kişi listesi sorgusu hataya düştüğünde ekran SONSUZA KADAR
    "Sohbet yükleniyor…" diyordu. Sebep: `peers === null` hem "yükleniyor" hem
    "başarısız" demekti ve hata yutuluyordu — `peers` bir daha set edilmediği
    için yükleme ekranı hiç değişmiyordu.
  */
  it('kişi listesi sorgusu patlarsa "yükleniyor"da takılı kalmaz, hatayı gösterir', async () => {
    mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({ success: false, message: 'boom' }, 500)
      }
      return jsonResponse({ success: true })
    })
    render(
      <LocaleProvider detectedLocale="tr">
        <ChatV2 />
      </LocaleProvider>,
    )

    await waitFor(() => expect(screen.getByText('Bir hata oluştu.')).not.toBeNull())
    expect(document.querySelector('[role="status"]')).toBeNull()
  })

  /*
    Şema hiç yoksa (tablolar oluşturulmamış) kişi listesi de anlamsız: kalıcı
    "yükleniyor" yerine tek ve anlaşılır uyarı gösterilir.
  */
  it('chat tabloları yoksa şema uyarısı gösterilir, "yükleniyor"da kalınmaz', async () => {
    mockFetch((url, init) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({ success: true, users: [] })
      }
      if (url.includes('/api/chat/v2') && !init?.method) {
        return jsonResponse({ success: false, code: 'CHAT_SCHEMA_MISSING', message: 'tablo yok' }, 503)
      }
      return jsonResponse({ success: true })
    })
    render(
      <LocaleProvider detectedLocale="tr">
        <ChatV2 />
      </LocaleProvider>,
    )

    await waitFor(() => expect(screen.getByText(/supabase\/chat\.sql/)).not.toBeNull())
    expect(document.querySelector('[role="status"]')).toBeNull()
  })
})
