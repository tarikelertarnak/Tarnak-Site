import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/components/locale-provider'
import { LoadMoreButton } from './load-more-button'

/**
 * "Daha Fazlasını Göster (+açılacak · −gizli)" (2026-10-11 kullanıcı isteği).
 *
 * Kullanıcı: "orada mesela daha fazlasını göster (+10 −278) gibi bişey olmalı
 * yani kaç tane açacağı ve kaç tane kapalı olduğu."
 *
 * İki sayı da düğmede GÖRÜNMELİ: `+N` bu basışta açılacak kart (`willOpen`),
 * `−M` hâlâ gizli kalan (`remaining`). Sayılar `useRowPagination`ün saf
 * fonksiyonlarından gelir (bkz. use-row-pagination.test.ts).
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

function draw(props: { remaining: number, opening: number }) {
  return render(
    <LocaleProvider detectedLocale="tr">
      <LoadMoreButton {...props} onClick={() => {}} />
    </LocaleProvider>,
  )
}

afterEach(cleanup)

describe('loadMoreButton — "+N · −M" rozeti', () => {
  it('açılacak ve gizli sayıyı birlikte gösterir', () => {
    draw({ remaining: 278, opening: 10 })
    expect(screen.getByText(/\(\+10 · −278\)/)).not.toBeNull()
  })

  it('tek kart kaldıysa "+1 · −1"', () => {
    draw({ remaining: 1, opening: 1 })
    expect(screen.getByText(/\(\+1 · −1\)/)).not.toBeNull()
  })

  it('aria-label iki sayıyı da söyler (ekran okuyucu)', () => {
    draw({ remaining: 278, opening: 10 })
    const label = screen.getByRole('button').getAttribute('aria-label') ?? ''
    expect(label).toMatch(/10/)
    expect(label).toMatch(/278/)
  })

  it('gizli kart yoksa düğme HİÇ çizilmez', () => {
    const { container } = draw({ remaining: 0, opening: 0 })
    expect(container.innerHTML).toBe('')
  })
})
