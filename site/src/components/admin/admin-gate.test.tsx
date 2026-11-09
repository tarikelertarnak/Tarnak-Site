import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminGate } from '@/components/admin/admin-gate'

/**
 * `/admin` istemci kapısı sözleşmesi (2026-10-13).
 *
 * REGRESYON: /admin sunucu tarafında oturum okuyordu
 * (`getSessionUser()` + `redirect('/login')`) ama kök layout
 * `dynamic = 'force-static'` olduğu için Next alt rotalarda `cookies()`'ı BOŞ
 * döndürüyor → guard HER ZAMAN null görüyor → geçerli admin cookie'siyle bile
 * sonsuz `/login` yönlendirmesi (panel tamamen kullanılamaz). Aynı tuzak
 * /chat'te 2026-10-11'de yaşanmış ve çözüm "oturumu istemcide çöz" olmuştu
 * (bkz. src/components/chat/chat.test.ts); /admin aynı desene taşındı.
 */
const h = vi.hoisted(() => ({
  replaceCalls: [] as string[],
  /**
   * useRouter() GERÇEKTE stabil bir nesne döndürür; mock da öyle olmalı —
   *  yoksa kapının `[router]` bağımlılığı her render'da değişir ve effect
   *  sonsuz döngüye girer (test 2026-10-13'te tam bu yüzden kırmızıydı).
   */
  router: { replace: (url: string) => { h.replaceCalls.push(url) } },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => h.router,
}))

/** AdminPanel'i taklit et: kapının KENDİ mantığı test ediliyor. */
vi.mock('@/components/admin/admin-panel', () => ({
  AdminPanel: ({ username }: { username: string }) => (
    <div data-testid="panel">{username}</div>
  ),
}))

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8')
}

/**
 * Yorumları SİL, sonra iddia et. Gerekçe: sayfa/kapı dosyalarının en değerli
 * kısmı bu tuzağı anlatan yorumlar; yorumda koddan alıntı geçiyor diye test
 * kırmızı olmamalı. Kural gerçek koda bakar.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const PAGE_CODE = stripComments(read('src/app/admin/page.tsx'))
const GATE_SRC = stripComments(read('src/components/admin/admin-gate.tsx'))
const LAYOUT_CODE = stripComments(read('src/app/layout.tsx'))
const CONTENT_ROUTE_CODE = stripComments(read('src/app/api/admin/content/route.ts'))

function replace(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const ADMIN_USER = {
  id: 'admin:TARIKELERTARNAK',
  email: null,
  username: 'TARIKELERTARNAK',
  fullName: 'TARIKELERTARNAK',
  avatarUrl: null,
  role: 'admin' as const,
  isOwner: false,
  roles: ['admin'],
  permissions: [],
}

describe('adminGate', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    h.replaceCalls.length = 0
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('oturum yoksa panele girmez ve /login?next=/admin yönlendirmesi yapar', async () => {
    fetchMock.mockImplementation(async () => replace({ success: true, user: null }))

    render(<AdminGate />)

    expect(await screen.findByText('Giriş Gerekli')).toBeTruthy()
    expect(h.replaceCalls).toEqual(['/login?next=/admin'])
    expect(screen.queryByTestId('panel')).toBeNull()
  })

  it('admin olmayan oturumda yetkisiz ekranı gösterir (panel açılmaz)', async () => {
    fetchMock.mockImplementation(async () =>
      replace({ success: true, user: { ...ADMIN_USER, role: 'user' } }),
    )

    render(<AdminGate />)

    expect(await screen.findByText('Yetkisiz Erişim')).toBeTruthy()
    expect(h.replaceCalls).toEqual([])
    expect(screen.queryByTestId('panel')).toBeNull()
  })

  it('admin oturumunda paneli AÇAR ve ilk veriyi API\'den taze çeker', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/admin/session')) {
        return replace({ success: true, user: ADMIN_USER })
      }
      if (url.includes('/api/admin/content')) {
        return replace({
          success: true,
          content: { hero: { title: 'Taze' } },
          messages: [{ id: 'm1' }],
          blogPosts: [{ id: 'p1' }],
        })
      }
      throw new Error(`beklenmeyen istek: ${url}`)
    })

    render(<AdminGate />)

    expect(await screen.findByTestId('panel')).toBeTruthy()
    // İçerik sunucu render'ında donmuş olmamalı: ayrı bir GET ile tazelenir.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/content', { cache: 'no-store' })
    })
  })
})

describe('/admin sunucu tarafı oturum okumaz (force-static tuzağı)', () => {
  it('sayfa oturumu SUNUCUDA okumaya çalışmaz', () => {
    expect(PAGE_CODE).not.toMatch(/^import \{[^}]*getSessionUser/m)
    expect(PAGE_CODE).not.toMatch(/await getSessionUser\(/)
    expect(PAGE_CODE).not.toContain('supabase/session')
    expect(PAGE_CODE).not.toMatch(/^\s*redirect\(/m)
  })

  it('sayfa istemci kapısını render eder', () => {
    expect(PAGE_CODE).toContain('AdminGate')
  })

  it('kök layout force-static kaldığı sürece bu kural geçerlidir', () => {
    // force-static kök layout'ta DURMALI (public sayfaların statik kalması
    // Cloudflare Free 10 ms CPU bütçesinin şartı). Bu iddia iki kararı birbirine
    // bağlar: biri layout'tan ayarı kaldırır da sayfaya sunucu tarafı guard
    // geri koyarsa test kırmızıya döner.
    const forcedStatic = /export const dynamic = 'force-static'/.test(LAYOUT_CODE)
    expect(forcedStatic, 'kök layout force-static beklenirdi').toBe(true)
    expect(PAGE_CODE).not.toContain('getSessionUser')
  })

  it('kapı oturumu çerezi doğru okuyan uçtan alır', () => {
    expect(GATE_SRC).toContain('/api/admin/session')
  })

  it('panel verisi GET /api/admin/content ile tazelenir (bayat veriyle kaydetme yok)', () => {
    expect(CONTENT_ROUTE_CODE).toMatch(/export async function GET\(\)/)
    expect(CONTENT_ROUTE_CODE).toContain('isAdminUser()')
  })
})
