import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/components/locale-provider'
import { LoadMoreButton } from './load-more-button'

/**
 * "Daha Fazlasını Göster (+açılacak) · görünen/toplam" (2026-10-13 kullanıcı).
 *
 * Kullanıcı: "'−6' kısmı kafa karıştırıcı, tamamen kaldır" → gizli sayı YOK.
 * Yerine `{görünen}/{toplam}` geldi ve tümü açıldığında düğme
 * "Daha Az Göster · toplam/toplam"a döner.
 *
 * Sayılar `useRowPagination`ten gelir; burada yalnız biçim sınanır.
 * Dar ekranda rozet düğmenin ALTINDA yazıldığı için "{görünen}/{toplam}"
 * metni DOM'da İKİ kez bulunur (biri `sm` üstü, biri altı için).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children, onPress, endContent, ...rest
  }: {
    'children'?: React.ReactNode
    'onPress'?: () => void
    'endContent'?: React.ReactNode
    'aria-label'?: string
    'className'?: string
  }) => (
    <button type="button" onClick={onPress} aria-label={rest['aria-label']}>
      {children}
      {endContent}
    </button>
  ),
}))

function draw(props: {
  visible: number
  total: number
  opening: number
  expanded: boolean
}) {
  // Dil cerezle sabitlenir (2026-10-30): `detectedLocale` otomatik algılamada
  // kullanılmıyor, jsdom'un `navigator.language` değeri 'en-US' olduğu için
  // Türkçe metin beklentisi karşılanmıyordu.
  document.cookie = 'site-locale=tr; path=/'
  return render(
    <LocaleProvider detectedLocale="tr">
      <LoadMoreButton {...props} onClick={() => {}} />
    </LocaleProvider>,
  )
}

afterEach(cleanup)

describe('loadMoreButton — "+N · görünen/toplam" rozeti', () => {
  it('açılacak sayıyı ve görünen/toplam oranını birlikte gösterir', () => {
    draw({ visible: 6, total: 10, opening: 4, expanded: false })
    expect(screen.getByText(/Daha Fazlasını Göster \(\+4\)/)).not.toBeNull()
    expect(screen.getAllByText(/6\/10/)).toHaveLength(2)
  })

  it('son adımda kalan kadar yazar (açılacak sayı kalandan büyük olmaz)', () => {
    draw({ visible: 8, total: 10, opening: 2, expanded: false })
    expect(screen.getByText(/Daha Fazlasını Göster \(\+2\)/)).not.toBeNull()
  })

  it('eski "−gizli" biçimi, köşeli parantez ve "kaldı" yazısı kullanılmaz', () => {
    const { container } = draw({ visible: 6, total: 10, opening: 4, expanded: false })
    expect(container.textContent).not.toContain('−')
    expect(container.textContent).not.toContain('[')
    expect(container.textContent).not.toContain('kaldı')
  })

  it('tümü açıkken "Daha Az Göster · toplam/toplam"a döner', () => {
    draw({ visible: 10, total: 10, opening: 0, expanded: true })
    expect(screen.getByText(/Daha Az Göster/)).not.toBeNull()
    expect(screen.getAllByText(/10\/10/)).toHaveLength(2)
    expect(screen.queryByText(/Daha Fazlasını Göster/)).toBeNull()
  })

  it('aria-label görünen/açılacak/toplam sayıyı birlikte söyler (ekran okuyucu)', () => {
    draw({ visible: 6, total: 10, opening: 4, expanded: false })
    const label = screen.getByRole('button').getAttribute('aria-label') ?? ''
    expect(label).toMatch(/4/)
    expect(label).toMatch(/6/)
    expect(label).toMatch(/10/)
  })

  it('açılacak öğe yoksa düğme HİÇ çizilmez', () => {
    const { container } = draw({ visible: 4, total: 4, opening: 0, expanded: false })
    expect(container.innerHTML).toBe('')
  })

  it('dar ekran için rozet düğmenin dışında ayrı yazılır', () => {
    const { container } = draw({ visible: 6, total: 10, opening: 4, expanded: false })
    // `sm:hidden` = yalnız dar ekranda görünen yedek satır
    expect(container.querySelector('.sm\\:hidden')?.textContent).toBe('6/10')
  })
})
