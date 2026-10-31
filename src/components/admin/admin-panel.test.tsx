import type { SiteContent } from '@/lib/content'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPanel } from '@/components/admin/admin-panel'

import rawContent from '../../../data/content.json'

/**
 * Admin paneli sözleşmesi (2026-10-13).
 *
 * Panel 11 sekmeden 5 gruba indirildi. Bu test GRUPLAMANIN doğruluğunu ve
 * hiçbir bölümün kaybolmadığını kanıtlar: her sekme açıldığında eski
 * sekmelerin gövdeleri alt bölüm olarak görünüyor mu?
 *
 * Neden ağır çocuklar mock'lanmış: amaç panelin kendi (sekme/alt bölüm)
 * mantığı; `DataManager`/`ChatPanel` vb. kendi testlerine sahip ve burada
 * gerçek fetch yapmaları testi yavaş/kırılgan yapardı.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
  }: {
    children?: React.ReactNode
    onPress?: () => void
    isDisabled?: boolean
  }) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value?: string
    onValueChange?: (v: string) => void
    placeholder?: string
  }) => (
    <input
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => onValueChange?.(e.target.value)}
    />
  ),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onValueChange,
  }: {
    value?: string
    onValueChange?: (v: string) => void
  }) => (
    <textarea
      value={value ?? ''}
      onChange={e => onValueChange?.(e.target.value)}
    />
  ),
}))

vi.mock('@/components/admin/overview-panel', () => ({
  OverviewPanel: () => <div data-testid="overview-panel" />,
}))
vi.mock('@/components/admin/data-manager', () => ({
  DataManager: () => <div data-testid="data-manager" />,
}))
// Gerçek kart yerine işaretli sürüm: "her repoyu TEK kart render eder"
// sözleşmesini test etmek için (üstteki ölü kopya geri gelmesin).
vi.mock('@/components/admin/github-repos-admin', () => ({
  GitHubReposAdmin: () => <div data-testid="github-repos-admin" />,
}))
vi.mock('@/components/admin/sections-editor', () => ({
  SectionsEditor: () => <div data-testid="sections-editor" />,
}))
vi.mock('@/components/admin/profile-photo-uploader', () => ({
  ProfilePhotoUploader: () => <div data-testid="photo-uploader" />,
}))
vi.mock('@/components/admin/users-panel', () => ({
  UsersPanel: () => <div data-testid="users-panel" />,
}))
vi.mock('@/lib/github-client', () => ({
  clientFetchUserRepos: () => Promise.resolve([]),
}))

const content = rawContent as unknown as SiteContent

function renderPanel() {
  return render(
    <AdminPanel
      initialContent={content}
      initialBlogPosts={[]}
      username="test@example.com"
      roleLabel="Yönetici"
    />,
  )
}

let consoleError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('adminPanel', () => {
  it('başlık ana sayfa başlıklarıyla aynı bileşenle çizilir (h1 + mavi alt çizgi)', () => {
    renderPanel()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('ADMİN PANELİ')
    expect(heading.className).toContain('border-primary')
    expect(heading.className).toContain('uppercase')
  })

  it('sekme sayısı 7; geliştirme fazı adı (Faz 6) hiçbir yerde kalmadı', () => {
    renderPanel()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map(t => t.textContent)).toEqual([
      'Genel Bakış',
      'Profil',
      'Sayfa Düzenle',
      'Şifre & Güvenlik',
      'Site Ayarları',
      'Veri Yönetimi',
      'Kullanıcılar',
    ])
    expect(document.body.textContent).not.toMatch(/Faz\s*6|phase6/i)
  })

  it('profil "Ad" alanına yazarken odak alanda kalır (odak çalınmaz)', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Profil/ }))

    // "Profil" alt bölümünün ilk alanı "Ad (First Name)" — değeriyle doğrula.
    // [0] = sekme arama inputu, [1] = ilk içerik inputu.
    const input = screen.getAllByRole('textbox')[1] as HTMLInputElement
    expect(input.value).toBe(content.profile.firstName)

    input.focus()
    expect(document.activeElement).toBe(input)

    for (const value of ['T', 'TA', 'TAR', 'TARI', 'TARIK']) {
      fireEvent.change(input, { target: { value } })
      expect(document.activeElement).toBe(input)
    }
    expect(input.value).toBe('TARIK')
  })

  it('github Repoları kartı SADECE BİR kez render edilir (üstteki ölü kopya geri gelmedi)', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Sayfa Düzenle/ }))
    await waitFor(() => expect(screen.getAllByText('HAKKIMDA').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('tab', { name: /PROJELER/ }))
    // Sayfa Düzenle İÇ SEKMELİ: varsayılan iç sekme HAKKIMDA, PROJELER'a geçince GitHubReposAdmin çizer.
    await waitFor(() => expect(screen.getAllByTestId('github-repos-admin')).toHaveLength(1))
  })

  it('genel bakış sekmesinde özet panel görünür', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Genel Bakış/ }))
    expect(screen.getByTestId('overview-panel')).toBeTruthy()
  })

  it('profil & hakkımda sekmesi profil ve hakkımda bölümlerini birlikte gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Profil/ }))
    await waitFor(() => expect(screen.getByTestId('photo-uploader')).toBeTruthy())
    expect(screen.getByText('Profil Bilgileri')).toBeTruthy()
  })

  it('sayfa düzenle sekmesi İÇ SEKMELİDİR: PROJELER / BLOG / SAYFA BÖLÜMLERİ / EK BÖLÜMLER', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Sayfa Düzenle/ }))
    // 2026-10-21 (kullanıcı): "Veri Yönetimi gibi alt gruplar, PROJELER/BLOG
    // şeklinde büyük harfli". Beş iç sekme etiketi de görünür olmalı.
    await waitFor(() => expect(screen.getAllByText('HAKKIMDA').length).toBeGreaterThan(0))
    expect(screen.getByText('PROJELER')).toBeTruthy()
    expect(screen.getByText('BLOG')).toBeTruthy()
    expect(screen.getByText('SAYFA BÖLÜMLERİ')).toBeTruthy()
    expect(screen.getByText('EK BÖLÜMLER')).toBeTruthy()
    // Varsayılan iç sekme HAKKIMDA — bölüm başlıkları kartı görünür.
    expect(screen.getByText('Bölüm Başlıkları')).toBeTruthy()
    // Veri Yönetimi artık ayrı sekmede; buranın parçası değil.
    expect(screen.queryByText('Veri Yönetimi (Tablolar)')).toBeNull()
  })

  it('sayfa düzenle > EK BÖLÜMLER iç sekmesi sections-editor gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Sayfa Düzenle/ }))
    await waitFor(() => expect(screen.getByText('EK BÖLÜMLER')).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: /EK BÖLÜMLER/ }))
    await waitFor(() => expect(screen.getByTestId('sections-editor')).toBeTruthy())
  })

  it('sayfa düzenle > SAYFA BÖLÜMLERİ iç sekmesi tüm sayfa metinlerini içerir (GitHub/Chat/İletişim/Footer)', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Sayfa Düzenle/ }))
    await waitFor(() => expect(screen.getByText('SAYFA BÖLÜMLERİ')).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: /SAYFA BÖLÜMLERİ/ }))
    await waitFor(() => expect(screen.getByText('GitHub Bölümü')).toBeTruthy())
    const cards = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
    // Kullanıcı isteği: bu kartlar "Site Ayarları"ndan buraya taşındı.
    expect(cards).toContain('Chat Bölümü')
    expect(cards).toContain('İletişim Bölümü')
    expect(cards).toContain('Footer')
  })

  it('veri yönetimi sekmesi tablo CRUD bileşenini gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Veri Yönetimi/ }))
    await waitFor(() => expect(screen.getByTestId('data-manager')).toBeTruthy())
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map(h => h.textContent)
    expect(headings).toContain('Veri Yönetimi (Tablolar)')
  })

  it('site ayarları sekmesi genel ve sosyal medya bölümlerini gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Site Ayarları/ }))
    await waitFor(() => expect(screen.getByText('Genel')).toBeTruthy())
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map(h => h.textContent)
    expect(headings).toContain('Genel')
    expect(headings).toContain('Sosyal Medya')
  })

  it('şifre ve güvenlik sekmesi şifre değiştir formunu gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Şifre & Güvenlik/ }))
    await waitFor(() => expect(screen.getByText('Şifre Değiştir')).toBeTruthy())
  })

  it('hero: Emoji/Logo alanı GİTTİ, metin alanları panelden KALDIRILDI (2026-10-21)', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Site Ayarları/ }))
    await waitFor(() => expect(screen.getByText('Hero (Ana Ekran)')).toBeTruthy())

    // Eski ölü alan kaldırıldı (2026-10-20, kullanıcı isteği).
    expect(screen.queryByText('Emoji / Logo')).toBeNull()
    expect(screen.getByText('Logo (dosya yükle veya link)')).toBeTruthy()
    // Kullanıcı isteği (2026-10-21): üç dilli metin alanı + dil combobox'ı
    // panelden SİLİNDİ. `hero.i18n` verisi korunur ama arayüzü yoktur.
    expect(screen.queryByText('Alt Başlık (Tagline)')).toBeNull()
    expect(screen.queryByText('Proje Butonu Yazısı')).toBeNull()
    expect(screen.queryByText('İletişim Butonu Yazısı')).toBeNull()
    expect(screen.queryByLabelText('Metnin dili')).toBeNull()
  })

  it('kaydetme çubuğu değişiklik yokken GİZLİ, değişince görünür', async () => {
    renderPanel()
    // Başlangıçta temiz: ne Kaydet ne İptal Et.
    expect(screen.queryByRole('button', { name: 'İptal Et' })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /Site Ayarları/ }))
    await waitFor(() => expect(screen.getByText('Hero (Ana Ekran)')).toBeTruthy())
    const nameInput = screen.getAllByRole('textbox')[1] as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'DEĞİŞTİ' } })

    // Dirty → sabit çubuk (Kaydet + İptal Et) görünür.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'İptal Et' })).toBeTruthy(),
    )
  })

  it('kullanıcılar sekmesi kullanıcı yönetimini gösterir (chat paneli kaldırıldı)', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Kullanıcılar/ }))
    await waitFor(() => expect(screen.getByTestId('users-panel')).toBeTruthy())
    // "Chat Mesajları" bölümü kaldırıldı — /chat'ten yönetiliyor.
    expect(screen.queryByTestId('chat-panel')).toBeNull()
  })

  it('kaydedilmemiş değişiklik varken sekme değişimi onay ister', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPanel()
    // Önce profil sekmesine geç (dirty değil → onay sorulmaz).
    fireEvent.click(screen.getByRole('tab', { name: /Profil/ }))
    await waitFor(() => expect(screen.getByTestId('photo-uploader')).toBeTruthy())

    const firstName = document.querySelectorAll('input')[1] as HTMLInputElement
    fireEvent.change(firstName, { target: { value: 'Değişti' } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'İptal Et' })).toBeTruthy(),
    )

    fireEvent.click(screen.getByRole('tab', { name: /Genel Bakış/ }))
    expect(confirm).toHaveBeenCalledTimes(1)
    // Onay reddedildi: eski sekme ekranda kalır.
    expect(screen.queryByTestId('overview-panel')).toBeNull()
    expect(screen.getByTestId('photo-uploader')).toBeTruthy()
  })

  it('kaydedilmemiş değişiklik onaylanırsa sekme değişir', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Profil/ }))
    await waitFor(() => expect(screen.getByTestId('photo-uploader')).toBeTruthy())
    fireEvent.change(document.querySelectorAll('input')[1] as HTMLInputElement, {
      target: { value: 'Değişti' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'İptal Et' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('tab', { name: /Genel Bakış/ }))
    await waitFor(() => expect(screen.getByTestId('overview-panel')).toBeTruthy())
  })

  it('panel render edilirken konsola React uyarısı bırakmaz', () => {
    renderPanel()
    expect(consoleError).not.toHaveBeenCalled()
  })
})
