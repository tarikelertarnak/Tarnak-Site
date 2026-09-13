'use client'

import type { ReactNode } from 'react'
import { cache as emotionCssCache } from '@emotion/css'
import { CacheProvider } from '@emotion/react'
import { extractStaticStyle } from 'antd-style'
import { useServerInsertedHTML } from 'next/navigation'

/**
 * SSR registry for Emotion styles.
 *
 * Problem: @lobehub/ui's ThemeProvider does not provide an EmotionCacheContext
 * to @emotion/react's <Global> component. <Global> then creates a NEW cache
 * via `createCache({ key: 'css' })` on every render, and that cache has no
 * `compat` flag — so on SSR it renders styles to the DOM as <style> tags
 * (on the client it injects into head) → hydration mismatch.
 *
 * Fix: provide @emotion/css's default cache (compat=true, already registered
 * in antd-style's global cache manager) via CacheProvider. This way
 * <Global> uses that cache, returns null on SSR (styles are written to the cache)
 * and extractStaticStyle prints them into head.
 */
export function EmotionStyleRegistry({ children }: { children: ReactNode }) {
  useServerInsertedHTML(() => {
    // antd styles are printed by AntdRegistry — here only emotion styles are extracted
    const styles = extractStaticStyle(undefined, { includeAntd: false })
    if (!styles?.length) {
      return null
    }
    return <>{styles.map(item => item.style)}</>
  })

  return <CacheProvider value={emotionCssCache}>{children}</CacheProvider>
}
