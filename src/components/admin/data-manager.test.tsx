import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataManager } from '@/components/admin/data-manager'

/**
 * Veri Yonetimi (genel CRUD tablosu) testleri.
 *
 * Neden UI primitifleri mock'lanmis: Lobehub bilesenleri saglayici ister ve
 * `@lobehub/ui` barrel'i vitest'in cozemedigi bir JSON cekiyor (ayrinti:
 * overview-panel.test.tsx). Testin amaci PANEL mantigi — hangi istegin
 * gittigi, hangi butonun gorundugu, satirin nasil guncellendigi.
 *
 * Mock'lar gercek DOM elemanlari uretir (input/textarea), boylece yazma ve
 * tiklama gercekten test edilebilir.
 */
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode
    onPress?: () => void
    isDisabled?: boolean
    'aria-label'?: string
  }) => (
    <button type="button" disabled={isDisabled} aria-label={ariaLabel} onClick={onPress}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onValueChange,
    placeholder,
    label,
  }: {
    value: string
    onValueChange?: (v: string) => void
    placeholder?: string
    label?: string
  }) => (
    // label'i GERCEK <label> olarak sar: getByLabelText ancak boyle calisir.
    <label>
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onValueChange?.(e.target.value)}
      />
    </label>
  ),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onValueChange,
    label,
  }: {
    value: string
    onValueChange?: (v: string) => void
    label?: string
  }) => (
    <label>
      {label}
      <textarea value={value} onChange={e => onValueChange?.(e.target.value)} />
    </label>
  ),
}))

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({
    open,
    children,
    title,
  }: {
    open: boolean
    children?: React.ReactNode
    title?: string
  }) => (open ? <div data-testid="drawer"><h2>{title}</h2>{children}</div> : null),
}))

// ---------------------------------------------------------------- yardimcilar

interface Call {
  url: string
  method: string
  body?: Record<string, unknown>
}

const POST_ROWS = [
  { id: 1, slug: 'ilk-yazi', title: 'İlk Yazı', published: true, created_at: '2026-09-01T10:00:00Z' },
  { id: 2, slug: 'taslak', title: 'Taslak Yazı', published: false, created_at: '2026-09-02T10:00:00Z' },
]

function installFetch(
  responder: (url: string, method: string) => unknown,
): { calls: Call[] } {
  const calls: Call[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })
    return {
      ok: true,
      status: 200,
      json: async () => responder(url, method),
    }
  }))
  return { calls }
}

function listResponse(rows: unknown[], total = rows.length) {
  return { success: true, rows, total, page: 1, perPage: 25 }
}

/** jsdom Blob'unda `.text()` yok → FileReader ile oku. */
function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

function lastListUrl(calls: Call[]): string {
  const gets = calls.filter(c => c.method === 'GET')
  return gets.length ? gets[gets.length - 1].url : ''
}

beforeEach(() => {
  vi.restoreAllMocks()
})

// jsdom'da createObjectURL yok; testte taklit ediyoruz ve sonra geri koyuyoruz.
const ORIG_CREATE_OBJECT_URL = URL.createObjectURL
const ORIG_REVOKE_OBJECT_URL = URL.revokeObjectURL

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  URL.createObjectURL = ORIG_CREATE_OBJECT_URL
  URL.revokeObjectURL = ORIG_REVOKE_OBJECT_URL
})

// ---------------------------------------------------------------- testler

describe('DataManager', () => {
  it('acilista listeyi ceker ve satirlari gosterir', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    expect(screen.getByText('Taslak Yazı')).toBeTruthy()
    expect(calls[0].url).toContain('/api/admin/data/posts')
    expect(calls[0].url).toContain('perPage=25')
  })

  it('bos listede "Kayıt yok." gosterir', async () => {
    installFetch(() => listResponse([], 0))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('Kayıt yok.')).toBeTruthy())
  })

  it('boolean kolonu Evet/Hayır butonu olarak cizer', async () => {
    installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    expect(screen.getByText('Evet')).toBeTruthy()
    expect(screen.getByText('Hayır')).toBeTruthy()
  })

  it('boolean butonuna tiklayinca PATCH atar ve satiri gunceller', async () => {
    const { calls } = installFetch((url, method) => {
      if (method === 'PATCH')
        return { success: true, row: { ...POST_ROWS[1], published: true } }
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('Hayır')).toBeTruthy())
    fireEvent.click(screen.getByText('Hayır'))

    await waitFor(() => {
      const patch = calls.find(c => c.method === 'PATCH')
      expect(patch).toBeTruthy()
      expect(patch!.url).toContain('/api/admin/data/posts/2')
      expect(patch!.body).toEqual({ published: true })
    })

    // Iyimser guncelleme: buton artik "Evet" olmali (2 tane Evet)
    await waitFor(() => expect(screen.getAllByText('Evet')).toHaveLength(2))
  })

  it('kaynak degistirince yeni kaynagi ceker ve basligi degistirir', async () => {
    const { calls } = installFetch((url) => {
      if (url.includes('/projects'))
        return listResponse([{ id: 9, slug: 'p', title: 'PixelShield', featured: true, sort_order: 1 }])
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getByText('Projeler'))

    await waitFor(() => expect(screen.getByText('PixelShield')).toBeTruthy())
    expect(lastListUrl(calls)).toContain('/api/admin/data/projects')
  })

  it('arama yazinca gecikmeden sonra q parametresiyle istek atar', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText('Ara…'), { target: { value: 'taslak' } })

    await waitFor(
      () => expect(lastListUrl(calls)).toContain('q=taslak'),
      { timeout: 2500 },
    )
  })

  it('kolon basligina tiklayinca siralama parametresi gonderir ve yon degisir', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.click(screen.getByText('Başlık'))
    await waitFor(() => expect(lastListUrl(calls)).toContain('sort=title'))
    expect(lastListUrl(calls)).toContain('dir=asc')

    fireEvent.click(screen.getByText('Başlık'))
    await waitFor(() => expect(lastListUrl(calls)).toContain('dir=desc'))
  })

  it('silme onaylanmazsa DELETE atmaz', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    vi.stubGlobal('confirm', vi.fn(() => false))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getAllByLabelText('Sil')[0])

    await new Promise(r => setTimeout(r, 50))
    expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  })

  it('silme onaylanirsa DELETE atar', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getAllByLabelText('Sil')[0])

    await waitFor(() => {
      const del = calls.find(c => c.method === 'DELETE')
      expect(del).toBeTruthy()
      expect(del!.url).toContain('/api/admin/data/posts/1')
    })
  })

  it('Yeni ile cekmeceyi acar ve Kaydet POST atar', async () => {
    const { calls } = installFetch((url, method) => {
      if (method === 'POST')
        return { success: true, row: { id: 3 }, message: 'Kayıt oluşturuldu.' }
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getByText('Yeni'))

    const drawer = within(screen.getByTestId('drawer'))
    expect(screen.getByText(/Yeni · Blog Yazıları/)).toBeTruthy()

    fireEvent.change(drawer.getByLabelText('Başlık'), { target: { value: 'Yepyeni' } })
    fireEvent.change(drawer.getByLabelText('İçerik'), { target: { value: 'gövde' } })
    fireEvent.click(screen.getByText('Kaydet'))

    await waitFor(() => {
      const post = calls.find(c => c.method === 'POST')
      expect(post).toBeTruthy()
      expect(post!.url).toContain('/api/admin/data/posts')
      expect(post!.body?.title).toBe('Yepyeni')
      expect(post!.body?.content).toBe('gövde')
    })
  })

  it('zorunlu alan bosken POST atmaz, hata gosterir', async () => {
    const { calls } = installFetch((url, method) => {
      if (method === 'POST')
        return { success: false, message: 'Başlık zorunlu.' }
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getByText('Yeni'))
    fireEvent.click(screen.getByText('Kaydet'))

    await waitFor(() => expect(screen.getByText('Başlık zorunlu.')).toBeTruthy())
  })

  it('duzenle cekmecesinde mevcut degerler dolu gelir', async () => {
    installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getAllByLabelText('Düzenle')[0])

    expect(screen.getByText(/Düzenle · Blog Yazıları/)).toBeTruthy()
    const drawer = within(screen.getByTestId('drawer'))
    expect((drawer.getByLabelText('Başlık') as HTMLInputElement).value).toBe('İlk Yazı')
  })

  it('tablo yoksa yol gosteren uyari kutusunu cizer', async () => {
    installFetch(() => ({
      success: false,
      rows: [],
      total: 0,
      missingTable: true,
      message: '"ad_slots" tablosu veritabanında yok.',
    }))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('Tablolar henüz oluşturulmadı')).toBeTruthy())
    expect(screen.getByText('scripts/schema-ads.sql')).toBeTruthy()
    expect(screen.getByText('scripts/schema-fixes.sql')).toBeTruthy()
  })

  it('eksik kolon uyarisini sari bildirim olarak gosterir', async () => {
    installFetch(() => ({
      success: true,
      rows: [],
      total: 0,
      droppedColumns: ['phone'],
      message: 'Şu kolonlar veritabanında yok, listeden çıkarıldı: phone.',
    }))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText(/listeden çıkarıldı: phone/)).toBeTruthy())
  })

  it('tek satirlik kaynakta (İstatistikler) sil butonu cikmaz', async () => {
    installFetch((url) => {
      if (url.includes('/stats'))
        return listResponse([{ id: 1, projects: 5, technologies: 12, focus: 80, experience_years: 4 }])
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getByText('İstatistikler'))

    await waitFor(() => expect(screen.getByText('Proje sayısı')).toBeTruthy())
    // Duzenle var, Sil yok
    expect(screen.queryByLabelText('Sil')).toBeNull()
    expect(screen.getByLabelText('Düzenle')).toBeTruthy()
  })

  it('sayfalama kayit sayisini ve sayfa numarasini gosterir', async () => {
    installFetch(() => listResponse(POST_ROWS, 60))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText(/60/)).toBeTruthy())
    // 60 kayit / 25 = 3 sayfa
    expect(screen.getByText(/sayfa\s*1\s*\/\s*3/)).toBeTruthy()
  })

  // ------------------------------------------------------------ CSV disa aktarma

  it('CSV indir: all=1 ile ceker, dosya uretir ve icerigi dogru olur', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    const blobs: Blob[] = []
    URL.createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b)
      return 'blob:fake'
    })
    URL.revokeObjectURL = vi.fn()
    // jsdom'da gercek indirme yok; navigasyon denemesini engelle
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataManager />)
    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.click(screen.getByText('CSV indir'))

    await waitFor(() => expect(calls.some(c => c.url.includes('all=1'))).toBe(true))
    await waitFor(() => expect(blobs.length).toBe(1))

    const bytes = await readBlobBytes(blobs[0])
    // BOM'u BAYT seviyesinde dogrula (TextDecoder onu kendiliginden siler).
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xEF, 0xBB, 0xBF])

    const text = new TextDecoder('utf-8').decode(bytes)
    expect(text).toContain('İlk Yazı')
    expect(text).toContain('Taslak Yazı')
    // Turkce Excel icin noktali virgul ayirici
    expect(text.split('\r\n')[0]).toContain(';')

    await waitFor(() => expect(screen.getByText(/2 kayıt CSV olarak indirildi/)).toBeTruthy())
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('CSV indir: aktif arama filtresini korur', async () => {
    const { calls } = installFetch(() => listResponse([POST_ROWS[0]]))
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataManager />)
    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText('Ara…'), { target: { value: 'ilk' } })
    await waitFor(() => expect(lastListUrl(calls)).toContain('q=ilk'), { timeout: 2500 })

    fireEvent.click(screen.getByText('CSV indir'))

    await waitFor(() => {
      const exp = calls.find(c => c.url.includes('all=1'))
      expect(exp).toBeTruthy()
      expect(exp!.url).toContain('q=ilk')
    })
  })

  it('CSV indir: kayit yoksa uyarir, dosya uretmez', async () => {
    installFetch(() => listResponse([], 0))
    const createSpy = vi.fn(() => 'blob:fake')
    URL.createObjectURL = createSpy
    URL.revokeObjectURL = vi.fn()

    render(<DataManager />)
    await waitFor(() => expect(screen.getByText('Kayıt yok.')).toBeTruthy())

    fireEvent.click(screen.getByText('CSV indir'))

    await waitFor(() => expect(screen.getByText('Dışa aktarılacak kayıt yok.')).toBeTruthy())
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('CSV indir: ust sinira takilirsa kullaniciyi uyarir', async () => {
    installFetch(() => ({ ...listResponse(POST_ROWS, 9000), truncated: true }))
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataManager />)
    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.click(screen.getByText('CSV indir'))

    await waitFor(() => expect(screen.getByText(/toplam 9000 kayıt var/)).toBeTruthy())
  })

  // ------------------------------------------------------------------ FILTRELER

  it('filtre seceneklerini kaynak tanimindan cizer', async () => {
    installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    // posts icin "Durum" filtresi tanimli (Yayında / Taslak)
    const select = screen.getByLabelText('Durum') as HTMLSelectElement
    expect(select).toBeTruthy()
    const labels = Array.from(select.options).map(o => o.textContent)
    expect(labels).toEqual(['Tümü', 'Yayında', 'Taslak'])
  })

  it('filtre secilince f_<kolon> parametresiyle istek atar', async () => {
    const { calls } = installFetch(() => listResponse([POST_ROWS[0]]))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Durum'), { target: { value: 'true' } })

    await waitFor(() => expect(lastListUrl(calls)).toContain('f_published=true'))
    // Filtre degisince sayfa 1'e donmeli
    expect(lastListUrl(calls)).toContain('page=1')
  })

  it('filtre secilince temizle butonu cikar ve temizleyince filtre kalkar', async () => {
    const { calls } = installFetch(() => listResponse(POST_ROWS))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    expect(screen.queryByText('Filtreleri temizle')).toBeNull()

    fireEvent.change(screen.getByLabelText('Durum'), { target: { value: 'false' } })
    await waitFor(() => expect(lastListUrl(calls)).toContain('f_published=false'))
    expect(screen.getByText('Filtreleri temizle')).toBeTruthy()

    fireEvent.click(screen.getByText('Filtreleri temizle'))
    await waitFor(() => expect(lastListUrl(calls)).not.toContain('f_published'))
    expect(screen.queryByText('Filtreleri temizle')).toBeNull()
  })

  it('filtresiz kaynakta (Yetenekler) filtre satiri cizilmez', async () => {
    installFetch((url) => {
      if (url.includes('/skills'))
        return listResponse([{ id: 1, label: 'React', icon: 'logos:react', level: 90, years: 5, sort_order: 1 }])
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.click(screen.getByText('Yetenekler'))

    await waitFor(() => expect(screen.getByText('React')).toBeTruthy())
    expect(screen.queryByLabelText('Durum')).toBeNull()
    expect(screen.queryByText('Filtreleri temizle')).toBeNull()
  })

  it('kaynak degisince filtre sifirlanir', async () => {
    const { calls } = installFetch((url) => {
      if (url.includes('/messages'))
        return listResponse([{ id: 1, name: 'Ahmet', email: 'a@b.c', subject: 'Selam', is_read: false, created_at: '2026-09-01T10:00:00Z' }])
      return listResponse(POST_ROWS)
    })
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Durum'), { target: { value: 'true' } })
    await waitFor(() => expect(lastListUrl(calls)).toContain('f_published=true'))

    fireEvent.click(screen.getByText('Mesajlar'))

    await waitFor(() => expect(screen.getByText('Ahmet')).toBeTruthy())
    // Yeni kaynagin isteginde onceki kaynagin filtresi OLMAMALI
    expect(lastListUrl(calls)).not.toContain('f_published')
    // Mesajlarin kendi filtresi var, degeri bos
    expect((screen.getByLabelText('Okunma') as HTMLSelectElement).value).toBe('')
  })

  it('CSV indir aktif filtreyi de tasir', async () => {
    const { calls } = installFetch(() => listResponse([POST_ROWS[0]]))
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataManager />)
    await waitFor(() => expect(screen.getByText('İlk Yazı')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Durum'), { target: { value: 'true' } })
    await waitFor(() => expect(lastListUrl(calls)).toContain('f_published=true'))

    fireEvent.click(screen.getByText('CSV indir'))

    await waitFor(() => {
      const exp = calls.find(c => c.url.includes('all=1'))
      expect(exp).toBeTruthy()
      expect(exp!.url).toContain('f_published=true')
    })
  })

  it('uygulanamayan filtre varsa kullaniciyi uyarir', async () => {
    installFetch(() => ({
      ...listResponse(POST_ROWS),
      ignoredFilters: ['published'],
      message: 'Şu filtreler uygulanamadı (kolon veritabanında yok): published. Sonuçlar filtresiz olabilir.',
    }))
    render(<DataManager />)

    await waitFor(() => expect(screen.getByText(/filtreler uygulanamadı/)).toBeTruthy())
  })
})
