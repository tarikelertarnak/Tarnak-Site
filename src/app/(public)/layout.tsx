import type { ReactNode } from 'react'

/**
 * Public segment geçiş layout'u (2026-10-20).
 *
 * `app/layout.tsx` TEK kök layout olarak kalır ve TÜM rotaları kapsar
 * (public + admin + chat + login + sign). Bu dosya onun ALTINDA, yalnızca
 * public segmentine ait sarmalayıcıdır — kabuk (TopBar/Sidebar/
 * Navigation/ScrollToTop) kök layoutta kalır, burada TEKRARLANMAZ.
 *
 * VAROLMA SEBEBİ: `template.tsx`'i public segmentine sınırlamak.
 * Next.js'te bir route group içindeki `template.tsx`, o grubun ağacına
 * giren rotalarda mount olur; grubun DIŞINDAKİ rotalar (`/admin`,
 * `/chat`, `/login`, `/sign`) o şablondan GEÇMEZ → route değişiminde
 * yeniden mount olmazlar, state'leri korunur.
 *
 * ⚠️ Route group URL'i değiştirmez (`(public)` segment değildir) — tüm
 * public rotaların adresi aynı kalır (`/about`, `/blog/...` vb.).
 */
export default function PublicLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
