import dns from 'node:dns'

// Windows'ta DNS default sıralaması IPv6'yı önce dener; bu makinede IPv6 yolu yok,
// bu yüzden api.github.com / Supabase istekleri UND_ERR_CONNECT_TIMEOUT ile düşüyordu.
// IPv4'ü önce çözmek bunu kökten çözer (tüm sunucu sürecinde geçerli: dev + prod).
dns.setDefaultResultOrder('ipv4first')

// Google AdSense yalnizca NEXT_PUBLIC_ADSENSE_CLIENT tanimliysa CSP'ye eklenir.
// Boylece reklam agi baglanmadigi surece politika dar kalir; "ileride lazim olur"
// diye kalici olarak genisletmeyiz.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''
const AD_SCRIPT_SRC = ADSENSE_CLIENT
  ? ' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com'
  : ''
const AD_FRAME_SRC = ADSENSE_CLIENT
  ? ' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com'
  : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages statik export: EXPORT_MODE=1 iken next build "out/" üretir.
  // OpenNext (Workers/Cloudflare) build'ini etkilemez — export ekstra moddur.
  // Admin bileşenleri API route'larından tip import eder; export'ta API hariç
  // tutulduğundan type-check kırılır → ignoreBuildErrors sadece export'ta aktif.
  ...(process.env.EXPORT_MODE === '1' ? {
    output: 'export',
    typescript: { ignoreBuildErrors: true },
  } : {}),
  trailingSlash: true,
  // Turbopack, lightningcss'in native .node require'ını bundle edemiyor
  // (Cannot find module / could not resolve ...win32-x64-msvc.node).
  // External bırakınca Node kendi require'ıyla (düzgün çalışan) yüklüyor.
  serverExternalPackages: ['lightningcss'],
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
          // Aynı origin frame'lere izin ver — admin editörün Önizle iframe'i /puck/* embed eder
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            // inline script (tema init) ve HeroUI/iconify için pragmatik CSP
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval'${AD_SCRIPT_SRC}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' https: wss:",
              `frame-src 'self'${AD_FRAME_SRC}`,
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
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
