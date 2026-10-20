import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Breadcrumb } from '@/components/breadcrumb'
import { LocaleProvider } from '@/components/locale-provider'
import { CRUMBS, postCrumbs, projectCrumbs } from '@/lib/breadcrumb'

/**
 * Breadcrumb dil regresyonu (2026-10-20).
 *
 * Eski hal: `CRUMBS` hardcode Türkçe `label` taşıyordu ('Ana sayfa',
 * 'Projeler', 'Hakkımda'…). Sunucu her zaman TR bastığı için
 * (`getStaticLocale` sabit 'tr', kök layout `force-static`) EN ziyaretçi
 * kırıntıları kalıcı Türkçe görüyordu.
 *
 * Yeni hal: `labelKey` → istemcide `t()` ile çözülür. Kullanıcı verisi
 * (`postCrumbs`/`projectCrumbs` başlığı) `__raw:` ön ekiyle çevrilmeden geçer.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

function setNavigatorLanguage(value: string) {
  Object.defineProperty(navigator, 'language', { value, configurable: true })
}

afterEach(cleanup)

function renderWith(locale: 'en' | 'tr', node: React.ReactNode) {
  setNavigatorLanguage(locale === 'en' ? 'en-US' : 'tr-TR')
  return render(<LocaleProvider detectedLocale={locale}>{node}</LocaleProvider>)
}

describe('Breadcrumb dil', () => {
  it('EN: kirintilar Ingilizce', () => {
    renderWith('en', <Breadcrumb items={CRUMBS['/about']} />)
    expect(screen.getByText('Home')).toBeDefined()
    expect(screen.getByText('About')).toBeDefined()
  })

  it('TR: kirintilar Turkce', () => {
    renderWith('tr', <Breadcrumb items={CRUMBS['/about']} />)
    expect(screen.getByText('Ana sayfa')).toBeDefined()
    expect(screen.getByText('Hakkımda')).toBeDefined()
  })

  it('EN modda hicbir nav TR metni sizmaz', () => {
    for (const yol of ['/about', '/projects', '/blog', '/contact', '/donate', '/credits']) {
      renderWith('en', <Breadcrumb items={CRUMBS[yol]} />)
      for (const trWord of ['Ana sayfa', 'Projeler', 'Hakkımda', 'İletişim', 'Destek Ol', 'Katkıda']) {
        expect(document.body.textContent).not.toContain(trWord)
      }
      cleanup()
    }
  })

  it('kullanici verisi basligi (`__raw:`) cevrilmeden gecer', () => {
    renderWith('en', <Breadcrumb items={projectCrumbs('Süper Proje', '/projects')} />)
    expect(screen.getByText('Süper Proje')).toBeDefined()
  })

  it('postCrumbs basligi da kullanici verisi', () => {
    renderWith('en', <Breadcrumb items={postCrumbs('Yazı Başlığı')} />)
    expect(screen.getByText('Yazı Başlığı')).toBeDefined()
    expect(screen.getByText('Blog')).toBeDefined()
  })

  it('tek ogeli zincir render edilmez', () => {
    const { container } = renderWith('en', <Breadcrumb items={[{ labelKey: 'nav.home', href: '/' }]} />)
    expect(container.querySelector('nav')).toBeNull()
  })
})
