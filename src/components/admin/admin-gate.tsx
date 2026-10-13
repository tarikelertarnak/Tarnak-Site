'use client'

import type { BlogPost, ChatMessage, SiteContent } from '@/lib/content'
import type { SessionUser } from '@/lib/supabase/session'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminPanel } from '@/components/admin/admin-panel'
import { Link } from '@/components/ui/link'
import { LOCALE_COOKIE, TRANSLATED_LOCALES } from '@/lib/i18n'
import { roleLabel } from '@/lib/permissions'

/** İstemcide dil tercihi: `site-locale` cookie'si (sunucudaki getLocale ile aynı kaynak). */
function localeOf(): string {
  if (typeof document === 'undefined') {
    return 'tr'
  }
  const eslesme = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`).exec(document.cookie)
  const deger = eslesme?.[1]
  return deger && (TRANSLATED_LOCALES as readonly string[]).includes(deger) ? deger : 'tr'
}

function roleLabelFor(user: SessionUser): string {
  return roleLabel(user.role, localeOf(), user.isOwner)
}

/**
 * `/admin` istemci kapısı (2026-10-13) — NEDEN sunucuda değil:
 *
 * Kök layout `src/app/layout.tsx` içinde `export const dynamic = 'force-static'`
 * var ve Next 16'da bu ayar tüm alt segmentleri kapsıyor: ağaçtaki bir sayfanın
 * `cookies()` çağrısı BOŞ dönüyor (Next dokümanı: force-static, cookies/headers'ı
 * "return empty values" yapmaya zorlar). Deneyle doğrulandı (2026-10-13):
 *   · kök layout force-static + sayfada force-dynamic  → cookies() = []
 *   · iç içe admin/layout.tsx force-dynamic            → cookies() = []
 *   · kök layout force-static KALDIRILINCA             → cookies() = [admin_session]
 * Yani /admin sunucu tarafında admin_session cookie'sini ASLA göremezdi:
 * `getSessionUser()` daima null → sonsuz `/login` yönlendirmesi (panel tamamen
 * kullanılamaz durumdaydı).
 *
 * Kök layout'un force-static'i KALMALI: public sayfalar `getLocale()` ile
 * cookie okuyor, dinamik olsalardı Cloudflare Free 10 ms CPU bütçesi aşılır
 * (2026-10-03 1102 düzeltmesinin dayandığı varsayım). Bu yüzden /chat ile AYNI
 * desen kullanılıyor (bkz. src/app/chat/page.tsx yorumu): sayfa oturum
 * OKUMAZ, kimlik kapısı istemcide, ZORUNLU kontrol API katmanında
 * (her `/api/admin/*` ucu `isAdminUser()` ile 401 döner).
 */
export function AdminGate() {
  const router = useRouter()
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'anonymous' }
    | { kind: 'forbidden' }
    | { kind: 'ready', user: SessionUser, content: SiteContent, messages: ChatMessage[], blogPosts: BlogPost[] }
  >({ kind: 'loading' })

  useEffect(() => {
    let iptal = false

    async function ac() {
      try {
        const oturum = await fetch('/api/admin/session', { cache: 'no-store' })
        const oturumJson = await oturum.json().catch(() => null) as { user?: SessionUser | null } | null
        const user = oturumJson?.user ?? null

        if (!user) {
          if (!iptal) {
            setState({ kind: 'anonymous' })
            router.replace('/login?next=/admin')
          }
          return
        }
        if (user.role !== 'admin') {
          if (!iptal) {
            setState({ kind: 'forbidden' })
          }
          return
        }

        // Panelin ilk verisi de istemcide çekilir: sunucu render'ı build
        // zamanında donardı ve bayat içerikle kaydetmek sessiz veri kaybı olurdu.
        const veri = await fetch('/api/admin/content', { cache: 'no-store' })
        const veriJson = await veri.json().catch(() => null) as {
          content?: SiteContent
          messages?: ChatMessage[]
          blogPosts?: BlogPost[]
        } | null

        if (!veriJson?.content) {
          if (!iptal) {
            setState({ kind: 'forbidden' })
          }
          return
        }

        if (!iptal) {
          setState({
            kind: 'ready',
            user,
            content: veriJson.content,
            messages: veriJson.messages ?? [],
            blogPosts: veriJson.blogPosts ?? [],
          })
        }
      }
      catch {
        if (!iptal) {
          setState({ kind: 'forbidden' })
        }
      }
    }

    void ac()
    return () => {
      iptal = true
    }
  }, [router])

  if (state.kind === 'loading') {
    return (
      <p className="py-16 text-center text-sm text-foreground-500">
        Yükleniyor…
      </p>
    )
  }

  if (state.kind !== 'ready') {
    const isEn = localeOf() === 'en'
    return (
      <main
        id="main"
        className="flex min-h-[80vh] items-center justify-center"
      >
        {' '}
        <div className="max-w-sm rounded-2xl border border-danger-200/30 bg-danger-50/10 p-6 text-center">
          {' '}
          <p className="text-3xl">🔒</p>
          {' '}
          <h1 className="mt-2 text-xl font-bold">
            {state.kind === 'anonymous'
              ? (isEn ? 'Sign In Required' : 'Giriş Gerekli')
              : (isEn ? 'Unauthorized Access' : 'Yetkisiz Erişim')}
          </h1>
          {' '}
          <p className="mt-2 text-sm text-foreground-500">
            {' '}
            {state.kind === 'anonymous'
              ? (isEn ? 'Redirecting you to the sign-in page…' : 'Giriş sayfasına yönlendiriliyorsunuz…')
              : (isEn ? 'The admin panel is only available to admin accounts.' : 'Sayfa düzenleyici yalnızca yönetici hesaplarına açıktır.')}
            {' '}
          </p>
          {' '}
          {state.kind === 'anonymous' && (
            /* `Button` DEĞİL: auto-yönlendirme zaten çalıştı; manuel çıkış yolu
               için düz bağlantı yeterli (Lobehub Button'u ayrıca ConfigProvider
               ister — jsdom'da patlar, sıcak yolda gereksiz ağırlık). */
            <Link href="/login?next=/admin" className="mt-4 inline-block text-sm text-primary underline">
              {isEn ? 'Sign In' : 'Giriş Yap'}
            </Link>
          )}
          {' '}
        </div>
        {' '}
      </main>
    )
  }

  return (
    <main id="main" className="min-h-screen w-full px-4 sm:px-6 py-8">
      <AdminPanel
        initialContent={state.content}
        initialMessages={state.messages}
        initialBlogPosts={state.blogPosts}
        username={state.user.email ?? state.user.username ?? 'admin'}
        roleLabel={roleLabelFor(state.user)}
      />
    </main>
  )
}
