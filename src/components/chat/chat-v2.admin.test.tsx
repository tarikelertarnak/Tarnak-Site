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

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom'da `Element.prototype.scrollIntoView` YOK; mesaj eklenince sohbet
  // sonuna kaydırma denenir → ortam eksikliğini tamamla.
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('admin kullanıcı menüsü', () => {
  it('sağ tık menüsünü açar: profil, takma ad, favori, önemli, engelle, temizle, sil', async () => {
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
      // 2026-10-13: "Sohbeti sabitle" → "Önemli kişi olarak işaretle" (aynı
      // `important` bayrağı; etiket kullanıcının istediği ad oldu).
      /Önemli kişi olarak işaretle/,
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
    Nokta renkleri (2026-10-12'de SADELEŞTİ): yeşil = çevrimiçi, kırmızı =
    çevrimdışı. Sarı nokta TAMAMEN KALDIRILDI — "yazıyor" artık listede mavi
    "@kullanıcı yazıyor…" METNİ olarak görünür.
  */
  it('avatarsız da olsa durum noktası var (yeşil/kırmızı); yazan kişide mavi yazıyor metni', async () => {
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

    // Ayşe + Zeynep çevrimiçi (yazan kişi de çevrimiçidir), Mehmet çevrimdışı.
    expect(screen.getAllByLabelText('Çevrimiçi').length).toBe(2)
    expect(screen.getAllByLabelText('Çevrimdışı').length).toBe(1)
    // Sarı nokta KALDIRILDI: yazan kişi artık mavi metinle anılır.
    expect(screen.getByText('@zeynep yazıyor…')).not.toBeNull()
    expect(screen.queryByLabelText(/yazıyor/)).toBeNull()
  })

  /*
    Hiyerarşi: sabitlenen en üstte, YAZAN kişi (eski "sarı nokta" kovası)
    konuşmaların üstünde, konuşulanlar kendi içinde en yeni önce. Sıralamanın
    saf mantığı `lib/chat-peers.test.ts`te; burada LİSTEDE göründüğü kanıtlanır.
  */
  it('liste hiyerarşisi: sabitlenen → yazan → en son konuşulan', async () => {
    mockFetch((url, init) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          users: [
            { id: 'u-1', username: 'busra', fullName: 'Büşra', avatarUrl: null },
            { id: 'u-2', username: 'cem', fullName: 'Cem', avatarUrl: null, lastSeenAt: new Date().toISOString(), presenceState: 'typing' },
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

    // Sabitlenen (Büşra) ve YAZAN (Cem) listenin ilk iki satırı olmalı.
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

/**
 * YAZMA DURUMU + BOŞ SOHBET (2026-10-12 kullanıcı isteği).
 *
 *  · "gecikme çok uzun" → ilk tuşta sinyal gider (sarı nokta beklemesi yok),
 *  · kendi yazdığımız karşı tarafta METİN olarak görünür (nokta değil),
 *  · boş sohbetteki "Merhaba de!" TIKLANABİLİR ve dil uygun selamlamayı yollar,
 *  · gönderim sürerken düğme kilitlenir → çift tıklamada iki mesaj gitmez.
 */
describe('yazma sinyali ve boş sohbet', () => {
  it('ilk tuşta "typing" sinyali gider, yazma durunca "durdu" (null) gider', async () => {
    const spy = await renderAdminChat()
    fireEvent.click(screen.getByText('Ayşecik'))
    const box = await screen.findByRole('textbox')

    fireEvent.change(box, { target: { value: 'merhaba' } })

    // Throttle ilk sinyali GEÇİRİR: gecikme yok.
    await waitFor(() => {
      expect(spy.mock.calls.some(([, init]) => init?.method === 'POST'
        && String(init.body).includes('"state":"typing"'))).toBe(true)
    })

    // Debounce (2.5 sn) sonra "durdu": karşı taraf sonsuz "yazıyor" görmez.
    await waitFor(() => {
      expect(spy.mock.calls.some(([, init]) => init?.method === 'POST'
        && String(init.body).includes('"state":null'))).toBe(true)
    }, { timeout: 6_000 })
  })

  it('boş sohbetteki "Merhaba de!" tıklanınca selamlama gönderir ve gönderim sırasında kilitlenir', async () => {
    const deferred: { resolve?: (r: Response) => void } = {}
    const hung = new Promise<Response>((resolve) => {
      deferred.resolve = resolve
    })
    const spy = await renderAdminChat((url, init) => {
      // Mesaj gönderimi (POST + conversationId) yanıtı ASILI kalır: düğmenin
      // gönderim sırasındaki kilitli hâlini ölçebilmek için.
      if (url.includes('/api/chat/v2') && init?.method === 'POST' && String(init.body).includes('conversationId')) {
        return hung
      }
      return jsonResponse({ success: true, conversation: { id: 'conv-1' }, messages: [] })
    })

    fireEvent.click(screen.getByText('Ayşecik'))
    const button = await screen.findByRole('button', { name: /Merhaba de/ })
    // Tıklanabilir görünüm: mavi + el imleci (kullanıcı isteği).
    expect(button.className).toContain('text-primary')
    expect(button.className).toContain('cursor-pointer')

    fireEvent.click(button)
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(true))

    deferred.resolve?.({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        data: {
          id: 'm-1',
          sender_id: 'admin:OWNER',
          text: 'Merhaba 👋',
          kind: 'text',
          created_at: new Date().toISOString(),
        },
      }),
    } as Response)

    await waitFor(() => {
      const sent = spy.mock.calls.find(([, init]) => init?.method === 'POST'
        && String(init.body).includes('conversationId'))
      expect(sent).toBeTruthy()
      // DİL: tr sözlüğü → "Merhaba 👋" (ayrı gönderme mantığı yok, `send` kullanılır).
      expect(JSON.parse(String(sent?.[1]?.body)).text).toBe('Merhaba 👋')
    })
  })
})
