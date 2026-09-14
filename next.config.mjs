import dns from 'node:dns'

// Windows'ta DNS default sıralaması IPv6'yı önce dener; bu makinede IPv6 yolu yok,
// bu yüzden api.github.com / Supabase istekleri UND_ERR_CONNECT_TIMEOUT ile düşüyordu.
// IPv4'ü önce çözmek bunu kökten çözer (tüm sunucu sürecinde geçerli: dev + prod).
dns.setDefaultResultOrder('ipv4first')

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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' https: wss:",
              "frame-src 'self'",
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
    ]
  },
}

export default nextConfig
