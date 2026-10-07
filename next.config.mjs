import dns from 'node:dns'

// Windows'ta DNS default sıralaması IPv6'yı önce dener; bu makinede IPv6 yolu yok,
// bu yüzden api.github.com / Supabase istekleri UND_ERR_CONNECT_TIMEOUT ile düşüyordu.
// IPv4'ü önce çözmek bunu kökten çözer (tüm sunucu sürecinde geçerli: dev + prod).
dns.setDefaultResultOrder('ipv4first')

// 2026-10-07: Google AdSense / Google Sign-In izinleri (`AD_SCRIPT_SRC`,
// `AD_FRAME_SRC`, `GOOGLE_SIGNIN`) CSP'den KALDIRILDI ve src/lib/csp-nonce.ts
// içine taşındı — CSP artık burada değil, src/proxy.ts üzerinden gönderiliyor
// (nonce her istekte benzersiz olmalı, `headers()` bunu yapamaz).

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages statik export: EXPORT_MODE=1 iken next build "out/" üretir.
  // OpenNext (Workers/Cloudflare) build'ini etkilemez — export ekstra moddur.
  // Admin bileşenleri API route'larından tip import eder; export'ta API hariç
  // tutulduğundan type-check kırılır → ignoreBuildErrors sadece export'ta aktif.
  ...(process.env.EXPORT_MODE === '1'
    ? {
        output: 'export',
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
  devIndicators: false,
  trailingSlash: true,
  // 2026-10-03: Search Console HTML dosya dogrulamasi /google<TOKEN>.html adresini
  // DOGRUDAN GET eder ve yonlendirmeleri TAKIP ETMEZ. trailingSlash yuzunden
  // Next bu yolu 308 ile /google<TOKEN>/'e atiyor ve dogrulama surekli basarisiz
  // oluyor. skipTrailingSlashRedirect bu tek yolda (ve public/ statiklerinde)
  // yonlendirmeyi kapatir; sayfa rotalari trailingSlash:true ile degismez.
  skipTrailingSlashRedirect: true,
  // Turbopack, lightningcss'in native .node require'ını bundle edemiyor
  // (Cannot find module / could not resolve ...win32-x64-msvc.node).
  // External bırakınca Node kendi require'ıyla (düzgün çalışan) yüklüyor.
  serverExternalPackages: ['lightningcss', 'sharp'],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Genel güvenlik başlıkları
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Aynı origin frame'lere izin ver — admin editörün Önizleme iframe'i /puck/* embed eder
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          /*
            Permissions-Policy (2026-10-07 düzeltmesi):
              `microphone=()` YANLIŞTI — sitede /chat üzerinde sesli sohbet var
              ve tarayıcı bu satır sayesinde mikrofon iznini hiç vermiyordu.
              Doğrusu `microphone=(self)`: yalnızca kendi origin'imiz (aynı
              sayfa) erişebilir, üçüncü taraf iframe'ler erişemez.
              Ödenekli özellik kullanılmıyor → `payment=()`; WebUSB yok → `usb=()`.
          */
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()' },
          /*
            Strict-Transport-Security (2026-10-07 doğrulama):
            `preload` yalnızca `max-age >= 31536000` (1 yıl) ile anlamlıdır —
            preload listesine kayıt olabilmek için tarayıcı bu eşiği arar.
            Mevcut 63072000 (2 yıl) eşiğin 2 katı: preload kriterini fazlasıyla
            karşılıyor, DEĞER DEĞİŞTİRİLMEDİ (yalnızca doğrulandı).
            Not: `includeSubDomains` + `preload` bir kez gönderildikten sonra
            tarayıcıdan geri alınamaz; alt subdomain'lerinin hepsi HTTPS
            sunuyor olduğundan güvenli.
          */
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          /*
            2026-10-06 canlı ölçümde eksik olanlar eklendi:
              cross-origin-opener-policy → pencere izolasyonu (tabnabbing)
              cross-origin-resource-policy → başka origin'in kaynaklarımızı
                                                çekmesini engeller
            NOT: `COOP: same-origin` OAuth popup akışını (`/auth/google`)
            etkileyebilir; `same-origin-allow-popups` OAuth için güvenli olan
            varyanttır (birlikte kullanılır, izolasyonu tamamen kapatmaz).
          */
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          /*
            CORP (2026-10-07 kontrolü):
            `same-origin` yalnızca AYNI origin'in kaynaklarımızı okumasına izin
            verir. Bu sitede üçüncü taraf script YOK: Giscus yorum embed'i,
            analytics veya CDN script'i kullanılmıyor. iframe'ler SADEce kendi
            origin'imizden (`/puck/*` editör önizlemesi) geliyor. Dolayısıyla
            `same-origin` daraltma YAPMADAN doğru değer; Google OAuth açılır
            pencere olarak çalıştığı için COOP da `same-origin-allow-popups`
            (bileşik pencereyi kesmez) olarak kalmalı.
            Giscus/Disqus gibi bir yorum embed'i EKLENIRSE bu satır
            `same-site` veya `cross-origin` yapılmalı, yoksa gömülü yorumlar
            boş çizilir.
          */
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          /*
            2026-10-07: canlı ölçümde eksik olan iki başlık eklendi.
              X-Permitted-Cross-Domain-Policies → eski Flash/PDF tabanlı
                cross-domain policy dosyalarının (crossdomain.xml) uygulanmasını
                kapatır. Bugün kullanılmıyor ama başlık göndermek "policy yok"
                varsayılanından daha güvenli.
              Origin-Agent-Cluster → origin'ı keyfi bir agent cluster'a bağlar;
                cross-origin izolasyon (COOP/COEP) uygulanmadığı için sitenin
                işleyişini değiştirmez, sadece saldırı yüzeyini daraltır.
          */
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Origin-Agent-Cluster', value: '?1' },
          /*
            ⚠️ CSP ARTIK BURADA DEĞİL (2026-10-07) ⚠️

            CSP, `next.config.mjs` içinden KALDIRILDI ve `src/proxy.ts` +
            `src/lib/csp-nonce.ts` tarafına taşındı. Sebep: nonce her istekte
            benzersiz olmak zorunda, `headers()` ise statik çalışır ve
            request'e erişemez. Buradaki eski politika `script-src` içinde
            `'unsafe-inline' 'unsafe-eval'` taşıyordu — bu ikisi CSP'yi tamamen
            etkisiz hale getiriyordu (satır içi script + eval serbest = politika
            uygulanmıyor).

            Yeni yer: `src/proxy.ts` istek + yanıt header'ına
            `Content-Security-Policy-Report-Only` yazar, politika metnini
            `buildCspValue()` üretir.

            ══════════════════════════════════════════════════════════════
            ENFORCING (ZORUNLU) MODA GEÇİŞ TALİMATI
            ══════════════════════════════════════════════════════════════
            1) src/proxy.ts → `withCsp()` içinde tek satırı değiştir:
                 response.headers.set('Content-Security-Policy-Report-Only', csp)
               şu hale gelsin:
                 response.headers.set('Content-Security-Policy', csp)
               (İSTEK header'ındaki `Content-Security-Policy-Report-Only` KALMALI —
                Next nonce'u oradan okuyor: parse-request-headers.js sırasıyla
                `content-security-policy` sonra `content-security-policy-report-only`
                arar; ikisini birden göndermek nonce bağını bozmaz.)
            2) src/lib/csp-nonce.ts → TODO notunu takip et: gerçek bir rapor
               toplayıcı varsa `report-to <grup>` direktifini ekle.
            3) EN ÖNEMLİ ENGEL — src/app/layout.tsx:
               `export const dynamic = 'force-static'` yüzünden `headers()`
               boş döner, yani statik sayfalarda tema init script'i nonce
               ALAMAZ. Enforcing modda o script engellenir ve tema/FOUC
               davranışı bozulur. Geçişten önce ikisinden birini yap:
                 a) `force-static`'ı kaldır (dikkat: bu sitenin public
                    sayfalarını statik üretip CDN'den sunma stratejisini ve
                    Cloudflare Workers CPU bütçesini etkiler — 2026-10-03
                    1102 düzeltmesinin dayandığı varsayımdır), ya da
                 b) tema script'ini `src/app/layout.tsx`'te olduğu gibi
                    build-time'da SHA-256 hash'leyip `script-src`'e
                    `'sha256-...'` olarak ekle.
               Aynı sorun JSON-LD bloğunda da var (çalışmadığı için düşük risk).
            4) `style-src 'unsafe-inline'` PRAGMATİK KALDI: Emotion/antd/heroUI
               stilleri satır içi basıyor, stillere nonce verilemez. Kalması
               script enjeksiyonunu engellemez — script zaten nonce'lu.
            5) Doğrulama: `npm run build` + canlıda tarayıcı konsolunda CSP
               ihlal mesajı OLMAMALI, tema değiştirme çalışmalı.
            ══════════════════════════════════════════════════════════════
          */
        ],
      },
      {
        // Yüklenen kullanıcı dosyaları: aktif içerik olarak çalıştırılamasın
        source: '/uploads/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Disposition', value: 'attachment' },
        ],
      },
      {
        // public/ altındaki statik varlıklar.
        // Next varsayılan olarak `public, max-age=0, must-revalidate` gönderir;
        // yani her ziyarette her görsel için yeniden doğrulama isteği gider.
        // Bu varlıklar hash'siz olduğu için agresif cache riskli — ama
        // 1 gün + 7 gün stale-while-revalidate dengeli: tekrar ziyaretlerde
        // anında yüklenir, içerik değişirse en geç 1 gün içinde tazelenir.
        source: '/:path*.:ext(png|jpg|jpeg|webp|avif|gif|svg|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
