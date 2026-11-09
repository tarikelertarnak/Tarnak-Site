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
  vi.unstubAllGlobals()
  cleanup()
})

describe('emoji-picker-element bağlantısı', () => {
  /**
   * VERİ KAYNAĞI (2026-10-13): resmî paket yalnız 5 dil yayınlıyor; tr/de/es/pt/ar
   * için `scripts/build-emoji-data.mjs` ile üretilen yerel dosya kullanılır.
   * Yerel dosyanın varlığı `HEAD` ile bir kez ölçülür → testte `fetch` sabitlenir.
   */
  function stubFetch(ok: boolean) {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok })))
  }

  it('yerel veri varsa onu kullanır (tr): veri kaynağı + depo dili + seçim', async () => {
    stubFetch(true)
    const onPick = vi.fn()
    render(<EmojiPicker locale="tr" onPick={onPick} onClose={() => {}} />)

    const el = await waitFor(() => {
      const node = document.querySelector('.emoji-picker-host > div')
      expect(node).not.toBeNull()
      return node as HTMLElement & { dataSource?: string, locale?: string }
    })

    expect(el.className).toBe('dark')
    // Yerel birleşik veri: TR + İngilizce anahtar kelimeler birlikte.
    expect(el.dataSource).toBe('/emoji-data/tr.json')
    expect(el.locale).toBe('tr')

    el.dispatchEvent(new CustomEvent('emoji-click', { detail: { unicode: '🔥' } }))
    expect(onPick).toHaveBeenCalledWith('🔥')
  })

  it('yerel veri yoksa İngilizce veriye düşer ve tek satır uyarı yazar', async () => {
    stubFetch(false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<EmojiPicker locale="de" onPick={() => {}} onClose={() => {}} />)

    const el = await waitFor(() => {
      const node = document.querySelector('.emoji-picker-host > div')
      expect(node).not.toBeNull()
      return node as HTMLElement & { dataSource?: string, locale?: string }
    })

    expect(el.dataSource).toContain('emoji-picker-element-data')
    expect(el.dataSource).toContain('/en/emojibase/data.json')
    expect(el.locale).toBe('en')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('scripts/build-emoji-data.mjs'))
    warn.mockRestore()
  })

  it('resmî pakette verisi olan dil CDN\'den alınır (ja)', async () => {
    stubFetch(false)
    render(<EmojiPicker locale="ja" onPick={() => {}} onClose={() => {}} />)

    const el = await waitFor(() => {
      const node = document.querySelector('.emoji-picker-host > div')
      expect(node).not.toBeNull()
      return node as HTMLElement & { dataSource?: string, locale?: string }
    })

    expect(el.dataSource).toContain('/ja/emojibase/data.json')
    expect(el.locale).toBe('ja')
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
