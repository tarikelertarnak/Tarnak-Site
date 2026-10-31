'use client'

/**
 * GÖRSEL DÜZENLEME ÇALIŞMA ZAMANI (2026-10-30).
 *
 * Neden ayrı bir istemci bileşen: kayıtlar `content.design` içinde veri olarak
 * durur, sayfa bileşenleri ise bunlardan habersiz. Bu bileşen her public
 * sayfada bir kez mount olur ve üç iş yapar:
 *
 *   1. O sayfaya ait kayıtları TEK bir `<style>` bloğuna derler.
 *   2. Hedef öğeleri `data-tar-el="<id>"` ile işaretler (seçici her render'da
 *      aynı düğümü bulsun diye).
 *   3. Dile özel metin / HTML / JS varsa uygular.
 *
 * NEDEN DOM'A DOKUNUYORUZ: admin "her öğeyi kodsuz düzenleyebileyim" dedi;
 * her bileşene ayrı prop dizisi geçirmek 40+ dosyaya dokunmak demekti.
 * DOM mutasyonu React'in dışında kalır, bir sonraki tam render'da effect
 * yeniden çalışır ve aynı sonucu yazar (idempotent).
 */

import type { DesignOverride } from '@/lib/design'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useLocale } from '@/components/locale-provider'
import { buildDesignCss, resolveOverrideText, safeId } from '@/lib/design'

const STYLE_ID = 'tar-design-css'

/** `content.design` her zaman `unknown` gelir; güvenli daraltma. */
export function asOverrides(value: unknown): DesignOverride[] {
  if (!Array.isArray(value))
    return []
  return value.filter(
    (o): o is DesignOverride =>
      !!o
      && typeof o === 'object'
      && typeof (o as DesignOverride).id === 'string'
      && typeof (o as DesignOverride).selector === 'string',
  )
}

/** Çalışma zamanı yalnızca public içerik alanına dokunur. */
const ROOT_ID = 'layout-main-content'

export function DesignRuntime({ design }: { design?: unknown }) {
  const pathname = usePathname() ?? '/'
  const { locale } = useLocale()
  const overrides = useMemo(() => asOverrides(design), [design])

  useEffect(() => {
    // 1) Stil bloğu — sayfa başına tek.
    const existing = document.getElementById(STYLE_ID)
    const css = buildDesignCss(overrides, pathname)
    if (existing) {
      existing.textContent = css
    }
    else if (css) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = css
      document.head.appendChild(style)
    }

    const root = document.getElementById(ROOT_ID)
    if (!root)
      return

    const forPage = overrides.filter(o => o.page === pathname)

    for (const override of forPage) {
      let nodes: Element[] = []
      try {
        nodes = [...root.querySelectorAll(override.selector)]
      }
      catch {
        // Geçersiz seçici tek kaydı düşürür, sayfayı değil.
        continue
      }

      for (const node of nodes) {
        const id = safeId(override.id)
        const marker = `data-tar-el`
        const previous = node.getAttribute(marker)
        // Aynı düğüm iki kayda bağlanmasın: ilk işaretleyen kazanır.
        if (!previous || previous === id)
          node.setAttribute(marker, id)

        // 3a) Metin — dile özel, yoksa `all`; hiçbiri yoksa özgün metne dön.
        if (override.text) {
          const text = resolveOverrideText(override, locale)
          if (text !== undefined) {
            if (!node.hasAttribute('data-tar-orig'))
              node.setAttribute('data-tar-orig', node.textContent ?? '')
            node.textContent = text
          }
          else if (node.hasAttribute('data-tar-orig')) {
            node.textContent = node.getAttribute('data-tar-orig') ?? ''
          }
        }

        // 3b) HTML — yalnızca admin yazdığı için güven sınırı API'de.
        if (typeof override.html === 'string' && override.html.trim())
          node.innerHTML = override.html

        // 3c) JS — CSP üretimde engelleyebilir; sessizce yut, sayfayı düşürme.
        if (typeof override.js === 'string' && override.js.trim()) {
          try {
            // eslint-disable-next-line no-new-func
            new Function('element', 'root', override.js)(node, root)
          }
          catch {
            // Yönetici betiği hatalıysa yalnız o kayıt etkisiz kalır.
          }
        }
      }
    }
  }, [pathname, locale, design, overrides])

  return null
}
