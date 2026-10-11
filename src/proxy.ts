import type { NextRequest as NextRequestType } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { PERMANENT_REDIRECTS } from '@/lib/breadcrumb'
import { buildCspValue, generateCspNonce } from '@/lib/csp-nonce'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Host guard — yalnızca kanonik alan adı üzerinden servis.
 *
 * `tarikelertarnak.pages.dev` açıktır; diğer host'lar kanonik adrese
 * (path + query korunarak) yönlendirilir. Yerel geliştirme (localhost/127.0.0.1)
 * muaf tutulur, yoksa `next dev` çalışmaz.
 */
const CANONICAL_HOST = 'tarikelertarnak.pages.dev'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

/**
 * 301 kalıcı yönlendirme (Faz 2 · SEO 2: "adı değişen sayfalar için 301
 * yönlendirme yapısı (tek dosyada)").
 *
 * Harita `src/lib/breadcrumb.ts` → `PERMANENT_REDIRECTS` içinde; burada
 * sadece uygulanıyor. Yeni bir taşıma eklemek için proxy'ye dokunmak
 * GEREKMEZ — tek dosyaya satır ekle.
 *
 * 301 (kalıcı) seçildi: arama motorları "eski URL'nin yerine şu geldi"
 * diye link equity'yi taşır. 302/307 "geçici" der ve equity taşınmaz.
 *
 * Dizi eşleşmesi YOK: sorgu dizesi ve hash korunur, böylece
 * `/profil?utm=x` → `/about?utm=x` olur.
 */
function permanentRedirect(request: NextRequestType): NextResponse | null {
  const { pathname } = request.nextUrl
  // Trailing slash normalize (Next `trailingSlash: true` kullanıyor).
  const yol
    = pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  const hedef = PERMANENT_REDIRECTS[yol]
  if (!hedef || hedef === yol)
return null

  const url = request.nextUrl.clone()
  url.pathname = `${hedef}/` // trailingSlash: true ile tutarlı
  return NextResponse.redirect(url, 301)
}

function redirectToCanonical(request: NextRequestType): NextResponse | null {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  if (!host || LOCAL_HOSTS.has(host) || host === CANONICAL_HOST)
return null
  const url = request.nextUrl.clone()
  url.host = CANONICAL_HOST
  url.protocol = 'https:'
  return NextResponse.redirect(url, 308)
}

export async function proxy(request: NextRequestType) {
  const maintenance = maintenanceResponse(request)
  if (maintenance)
return maintenance

  const moved = permanentRedirect(request)
  if (moved)
return moved

  const guard = redirectToCanonical(request)
  if (guard)
return guard

  /*
   * 2026-10-07 CSP faz 1 — nonce tabanlı politika (REPORT-ONLY).
   *
   * Neden burada: `next.config.mjs` statik çalışır, request'e erişemez; nonce
   * ise her istekte benzersiz olmak ZORUNDA. `next.config.mjs` içindeki
   * `'unsafe-inline' 'unsafe-eval'` ise CSP'yi tamamen etkisiz kiliyordu.
   *
   * Burada iki şey birden oluyor:
   *  1) İSTEK header'ına `Content-Security-Policy-Report-Only` yazılıyor.
   *     Next'in kendi `<script>` etiketlerine nonce'u OTOMATİK bağlaması
   *     tam olarak bu yola bakar (bkz. next/dist/server/route-modules/app-page/
   *     parse-request-headers.js — `content-security-policy ||
   *     content-security-policy-report-only` istek header'ını okur).
   *  2) AYNI değer YANIT header'ına yazılıyor; tarayıcı politika ihlallerini
   *     raporlar, ENGELLEMEZ (enforcing'e geçiş talimatı next.config.mjs'te).
   *
   * `x-nonce`: layout'ın (bkz. src/app/layout.tsx) tema init script'ine
   * verebilmesi için istek header'ı olarak taşınır.
   *
   * ⚠️ `src/app/layout.tsx` `dynamic = 'force-static'` olduğu için `headers()`
   * orada BOŞ döner → statik üretilen sayfalarda nonce HTML'e gömülemez.
   * Bu sayfalar ancak enforcing'e geçildiğinde hash tabanlı CSP'ye çevrilerek
   * kapsanabilir. Detaylı risk notu: fixer raporu + next.config.mjs bloğu.
   */
  const nonce = generateCspNonce()
  const csp = buildCspValue(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  /*
   * CSP KILL-SWITCH (2026-10-07, teşhis için eklendi).
   * `CSP_ENABLED=0` → politika hiç gönderilmez. Sorunu izole etmek ve
   * Next'in nonce uygulamadığı durumlarda (statik sayfalarda `headers()`
   * boş dönüyor) geçici olarak devre dışı bırakmak için.
   * Varsayılan: açık (değişken tanımlı değilse).
   */
  const cspAktif = process.env.CSP_ENABLED !== '0'

  if (cspAktif) {
    requestHeaders.set('Content-Security-Policy-Report-Only', csp)
  }
  // NextResponse.next({ request: { headers } }) yalnızca İSTEK header'ını
  // değiştirir; yanıt header'ı ayrıca set edilmeli.
  const withCsp = (response: NextResponse): NextResponse => {
    if (cspAktif)
      response.headers.set('Content-Security-Policy-Report-Only', csp)
    return response
  }

  // 2026-10-03 Cloudflare 1102 fix.
  //
  // `updateSession()` calls `supabase.auth.getUser()` — a NETWORK round-trip to
  // Supabase Auth plus JWT signature verification. On the Workers Free plan the
  // CPU budget is 10 ms, so running it on EVERY request guaranteed an
  // exceededCpu / 503 on any page the CDN could not serve statically. Prerendered
  // pages (assets/) bypassed the Worker and returned 200, which is why only the
  // dynamic routes failed — it looked random, it was CPU.
  //
  // Fix: the canonical-host guard (two header reads, free) still runs for every
  // route so hash-URL deployments keep redirecting and we don't get duplicate
  // content. The expensive session refresh runs ONLY where a session matters.
  // Public content pages keep their auth cookie untouched — the client reads it
  // directly for theme/locale.
  if (!needsServerSession(request)) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }))
  }

  // `updateSession` kendi `NextResponse.next({ request })`'ini kuruyor; nonce'u
  // Next'in script'lere bağlayabilmesi için değiştirilmiş istek header'ını
  // (özellikle Content-Security-Policy-Report-Only) ona vermek gerekiyor.
  const { response } = await updateSession(
    new NextRequest(request, { headers: requestHeaders }),
  )
  return withCsp(response)
}

/** Routes whose behaviour actually depends on a refreshed server-side session. */
const SESSION_PREFIXES = [
  '/api',
  '/admin',
  '/auth',
  '/chat',
  '/login',
  '/puck',
  '/sign',
]

function needsServerSession(request: NextRequestType): boolean {
  const { pathname } = request.nextUrl
  return SESSION_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * BAKIM MODU (2026-10-07, Faz 1 · operasyon)
 *
 * `MAINTENANCE_MODE=1` ortam değişkeni tanımlıysa her istek tek bir
 * HTML sayfasıyla karşılanır: 503 + `Retry-After`. Kullanıcı gerçek bir
 * hata ekranı değil, "bakımdayız" der.
 *
 * Neden proxy içinde:
 *  · `layout.tsx` `force-static` olduğu için içerikten karar verilemez —
 *    build zamanında donardı ve env değişimi yeniden build gerektirirdi.
 *  · Edge'de çalışır, sunucu maliyeti yok, anında açılıp kapanır.
 *  · Cloudflare env değişikliği tek bir "Deploy" demek; geri almak da öyle.
 *
 * `MAINTENANCE_SECRET` verilirse `/api/health` bu değeri ister — kimse
 * tesadüfen kapatmasın diye. Kapalıyken de `/api/health` herkese açık.
 */
function maintenanceResponse(request: NextRequestType): NextResponse | null {
  if (process.env.MAINTENANCE_MODE !== '1')
return null

  const { pathname } = request.nextUrl

  // Sağlık ucu her zaman 200 döner (bakım sırasında da) → UptimeRobot
  // "site çöktü" alarmı üretmez. Bakım durumu gövdede bildirilir.
  if (pathname === '/api/health') {
    return NextResponse.json(
      { status: 'maintenance', at: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  // Statik varlıklar (JS/CSS/görsel) sunulmaya devam eder; yoksa bakım
  // sayfası bile stilleri yükleyemez.
  if (
    pathname.startsWith('/_next/')
    || /\.(?:svg|png|jpe?g|gif|webp|avif|ico|mp3|mp4|woff2?|xml|txt|webmanifest)$/.test(
      pathname,
    )
  ) {
    return null
  }

  return new NextResponse(maintenancePage(), {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Retry-After': '3600',
      // Arama motorları bu sayfayı İNDEKLEMESİN (robots.txt zaten
      // Disallow'lu; burada ayrıca noindex meta'sı da var).
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

/**
 * Bakım sayfası HTML'i. Tasarım dili mevcut siteyle aynı (koyu tema,
 * mavi vurgu, yuvarlak köşe, glow YOK). Harici font/isim yüklenmiyor —
 * bakımdayken hiçbir dış bağımlılığa güvenmiyoruz.
 */
function maintenancePage(): string {
  // ⚠️ DİKKAT: `isEn` İNGİLİZCEYİ seçer. Değişken adı ters yazılırsa
  // (2026-10-07'de öyle bir hata vardı: `tr` adı `=== 'en'` kontrolüydü)
  // `MAINTENANCE_LANG=tr` yazınca site İngilizce gösteriyordu.
  const isEn
    = (process.env.MAINTENANCE_LANG ?? 'tr').trim().toLowerCase() === 'en'
  const t = (tr: string, en: string) => (isEn ? en : tr)
  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'tr'}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${t('Bakımdayız', 'Under maintenance')}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100svh; display: grid; place-items: center;
    background: #0a0a0b; color: #e5e5e5;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    padding: 24px; text-align: center;
  }
  .kutu {
    max-width: 420px; width: 100%; background: #121214;
    border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 32px;
  }
  .serit {
    display: inline-block; padding: 4px 12px; border-radius: 999px;
    border: 1px solid #3b82f6; color: #3b82f6; font-size: 13px; font-weight: 500;
  }
  h1 { margin: 20px 0 8px; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  p { margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
  <main class="kutu">
    <span class="serit">${t('Bakım çalışması', 'Maintenance')}</span>
    <h1>${t('Kısa bir bakımdayız', 'We are down for a short maintenance')}</h1>
    <p>${t(
      'Sitede kısa süreli bir bakım yapıyoruz. Birkaç dakika içinde geri döneceğiz.',
      'We are running a short maintenance. We will be back in a few minutes.',
    )}</p>
  </main>
</body>
</html>`
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     *   - _next/static, _next/image  → statik varlıklar
     *   - _next/hmr                  → ⚠️ KRİTİK (2026-10-07 bulundu)
     *   - favicon, public files, robots/sitemap
     *
     * `_next/hmr` NEDEN DIŞARIDA (Faz 1 · Playwright yazarken yakalandı):
     * `next dev` istemcisi sayfayı hydrate etmeden ÖNCE HMR WebSocket'ine
     * bağlanmayı dener. Bu proxy matcher'ı `/_next/hmr`'ı kapsadığı için
     * upgrade isteği proxy'ye düşüyor, `NextResponse` dönüyor ve el sıkışma
     * `ERR_INVALID_HTTP_RESPONSE` ile ölüyordu.
     *
     * Sonuç: HMR bağlanmadığı için Turbopack dev runtime'ı hydration'ı
     * başlatmıyor → sayfa SSR HTML olarak kalıyor, düğmelere tıklanmıyor,
     * `localStorage` boş kalıyor. Sayfa "ölü" görünüyordu.
     *
     * Tarayıcıda doğrulandı: düzeltmeden önce `ws://…/_next/hmr` 4 kez
     * hata veriyor, React fiber yok; sonrasında ikisi de temiz.
     *
     * CSP/nonce bu isteğe gerekmiyor (statik bir şey değil, WebSocket).
     */
    '/((?!_next/static|_next/image|_next/hmr|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|woff2?|txt|xml)$).*)',
  ],
}
