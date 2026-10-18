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
vi.mock('@/components/admin/chat-panel', () => ({
  ChatPanel: () => <div data-testid="chat-panel" />,
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
      initialMessages={[]}
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

  it('sekme sayısı 5; geliştirme fazı adı (Faz 6) hiçbir yerde kalmadı', () => {
    renderPanel()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map(t => t.textContent)).toEqual([
      'Genel Bakış',
      'Profil & Hakkımda',
      'İçerik & Veri',
      'Site Ayarları',
      'Mesajlar & Kullanıcılar',
    ])
    expect(document.body.textContent).not.toMatch(/Faz\s*6|phase6/i)
  })

  it('profil "Ad" alanına yazarken odak alanda kalır (odak çalınmaz)', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Profil & Hakkımda/ }))

    // "Profil" alt bölümünün ilk alanı "Ad (First Name)" — değeriyle doğrula.
    const input = screen.getAllByRole('textbox')[0] as HTMLInputElement
    expect(input.value).toBe(content.profile.firstName)

    input.focus()
    expect(document.activeElement).toBe(input)

    for (const value of ['T', 'TA', 'TAR', 'TARI', 'TARIK']) {
      fireEvent.change(input, { target: { value } })
      expect(document.activeElement).toBe(input)
    }
    expect(input.value).toBe('TARIK')
  })

  it('genel bakış sekmesinde özet panel görünür', () => {
    renderPanel()
    expect(screen.getByTestId('overview-panel')).toBeTruthy()
  })

  it('profil & hakkımda sekmesi profil ve hakkımda bölümlerini birlikte gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Profil & Hakkımda/ }))
    await waitFor(() => expect(screen.getByTestId('photo-uploader')).toBeTruthy())
    expect(screen.getByText('Profil Bilgileri')).toBeTruthy()
    expect(screen.getByText('Bölüm Başlıkları')).toBeTruthy()
  })

  it('içerik & veri sekmesi projeler, blog, ek bölümler ve veri yönetimini gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /İçerik & Veri/ }))
    await waitFor(() => expect(screen.getByTestId('data-manager')).toBeTruthy())
    expect(screen.getByText('Ek Bölümler')).toBeTruthy()
    expect(screen.getByTestId('sections-editor')).toBeTruthy()
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map(h => h.textContent)
    expect(headings).toContain('Projeler')
    expect(headings).toContain('Blog Yazıları')
    expect(headings).toContain('Veri Yönetimi (Tablolar)')
  })

  it('site ayarları sekmesi genel, sosyal medya ve güvenlik bölümlerini gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Site Ayarları/ }))
    await waitFor(() => expect(screen.getByText('Şifre & Güvenlik')).toBeTruthy())
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map(h => h.textContent)
    expect(headings).toContain('Genel')
    expect(headings).toContain('Sosyal Medya')
    expect(headings).toContain('Şifre Değiştir')
  })

  it('mesajlar & kullanıcılar sekmesi sohbet panelini ve kullanıcı yönetimini gösterir', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: /Mesajlar & Kullanıcılar/ }))
    await waitFor(() => expect(screen.getByTestId('chat-panel')).toBeTruthy())
    expect(screen.getByTestId('users-panel')).toBeTruthy()
  })

  it('kaydedilmemiş değişiklik varken sekme değişimi onay ister', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPanel()
    // Önce profil sekmesine geç (dirty değil → onay sorulmaz).
    fireEvent.click(screen.getByRole('tab', { name: /Profil & Hakkımda/ }))
    await waitFor(() => expect(screen.getByTestId('photo-uploader')).toBeTruthy())

    const firstName = document.querySelector('input') as HTMLInputElement
    fireEvent.change(firstName, { target: { value: 'Değişti' } })
    await waitFor(() =>
      expect(screen.getByText(/Kaydedilmemiş değişiklikler var/)).toBeTruthy(),
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
    fireEvent.click(screen.getByRole('tab', { name: /Profil & Hakkımda/ }))
    await waitFor(() => expect(screen.getByTestId('photo-uploader')).toBeTruthy())
    fireEvent.change(document.querySelector('input') as HTMLInputElement, {
      target: { value: 'Değişti' },
    })
    await waitFor(() =>
      expect(screen.getByText(/Kaydedilmemiş değişiklikler var/)).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('tab', { name: /Genel Bakış/ }))
    await waitFor(() => expect(screen.getByTestId('overview-panel')).toBeTruthy())
  })

  it('panel render edilirken konsola React uyarısı bırakmaz', () => {
    renderPanel()
    expect(consoleError).not.toHaveBeenCalled()
  })
})
