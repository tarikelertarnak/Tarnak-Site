import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmojiPicker } from './emoji-picker'

/**
 * Emoji seçici (2026-10-12 kullanıcı isteği): `emoji-picker-element` özel
 * elementi. Arama kutusu, kaydırma ve kategori düzeni KÜTÜPHANENİN işi; burada
 * ölçülen şey BİZİM bağladığımız yer:
 *   · element yalnız istemcide (effect içinde) oluşturulur,
 *   · koyu tema sınıfı, veri kaynağı ve sabit yükseklik verilir,
 *   · `emoji-click` olayı `onPick`e unicode olarak düşer,
 *   · Esc ve dışa tıklama kapatır.
 *
 * Not: jsdom'da IndexedDB YOKTUR; kütüphane elementi bağlanınca DB açar. Bu
 * yüzden `document.createElement('emoji-picker')` sade bir div ile değiştirilir
 * (ölçülen ayarlar yine gerçek koddan geçer).
 */
let createSpy: { mockRestore: () => void }

beforeEach(() => {
  const original = document.createElement.bind(document)
  createSpy = vi.spyOn(document, 'createElement').mockImplementation(((
    tag: string,
    options?: ElementCreationOptions,
  ) => (tag === 'emoji-picker' ? original('div') : original(tag, options))) as typeof document.createElement)
})

afterEach(() => {
  createSpy.mockRestore()
  cleanup()
})

describe('emoji-picker-element bağlantısı', () => {
  it('koyu tema + veri kaynağı + sabit yükseklik verir; seçim onPick\'e düşer', async () => {
    const onPick = vi.fn()
    render(<EmojiPicker locale="tr" onPick={onPick} onClose={() => {}} />)

    const el = await waitFor(() => {
      const node = document.querySelector('.emoji-picker-host > div')
      expect(node).not.toBeNull()
      return node as HTMLElement & { dataSource?: string, locale?: string }
    })

    expect(el.className).toBe('dark')
    // TR emoji VERİSİ `emoji-picker-element-data` paketinde YOK (ölçüldü:
    // tr/de/es/ko → 404) → İngilizce veri; arayüz etiketleri site dilinde (i18n).
    expect(el.dataSource).toContain('emoji-picker-element-data')
    expect(el.dataSource).toContain('/en/emojibase/data.json')
    expect(el.locale).toBe('en')
    // Sabit yükseklik (350px) ama kısa ekranda taşmaz: `min(350px, 45svh)`.
    expect(el.style.height).toContain('350px')
    expect(el.style.height).toContain('svh')

    el.dispatchEvent(new CustomEvent('emoji-click', { detail: { unicode: '🔥' } }))
    expect(onPick).toHaveBeenCalledWith('🔥')
  })

  it('esc basılınca kapanır', async () => {
    const onClose = vi.fn()
    render(<EmojiPicker locale="en" onPick={() => {}} onClose={onClose} />)
    await waitFor(() => expect(document.querySelector('.emoji-picker-host')).not.toBeNull())

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('kap (yazma alanı) dışına tıklayınca kapanır, içine tıklayınca kapanmaz', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <div className="composer-wrap">
        <EmojiPicker locale="en" onPick={() => {}} onClose={onClose} />
      </div>,
    )
    await waitFor(() => expect(document.querySelector('.emoji-picker-host')).not.toBeNull())

    const wrap = container.querySelector('.composer-wrap') as HTMLElement
    wrap.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(onClose).not.toHaveBeenCalled()

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
