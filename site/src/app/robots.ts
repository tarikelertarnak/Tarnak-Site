import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/**
 * robots.txt (2026-10-07)
 *
 * ÖNCE: `robots.txt` YOKTU. Statik bir dosya bekleniyordu ama gerçekte
 * üretilmiyordu; arama motorları 404 alıyordu.
 *
 * Neler dizine ALINMALI:
 *  · Public içerik sayfaları (/, /projects, /blog, /about, /github…)
 *  · Blog yazıları ve proje detayları — arama sonuçları için kritik.
 *
 * Neler DIŞLANMALI:
 *  · /chat, /search, /login, /sign, /admin, /puck → kullanıcıya özel veya
 *    indekslenmesi anlamsız (thin content). Bu sayfalar ayrıca `noindex`
 *    meta'sı taşıyor; burada "gitme" sinyali veriyoruz.
 *  · /api/** → hiçbir zaman dizine girmez.
 *
 * `Host` satırı: 2010 öncesi bir uygulamadır, Google desteklemiyor.
 * Sitemap satırı zaten doğru sinyali veriyor → `Host` bilerek YOK.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  /*
   * KURAL LİSTESİ `public/robots.txt`'ten TAŞINDI (2026-10-07).
   * İki kaynak vardı: statik dosya ve bu route. Next ikisini birden
   * bulunca 500 veriyordu ("conflicting public file and page file").
   * Statik dosya SİLİNDİ; artık TEK kaynak burası.
   *
   * Silinen dosyada Cloudflare'ın "content signals" ön bilgilendirmesi
   * vardı; o bir SÖZLEŞME metni, robots.txt'in teknik kural listesi değil.
   * Aynı bilgi `docs/legal-content-signals.md` altında korunuyor.
   *
   * Kural mantığı:
   *  · /admin, /puck  → yönetim arayüzleri, indekslenmemeli
   *  · /login, /sign, /auth → form + OAuth callback; arama sonuçlarına
   *    çıkmaları kullanıcıya zarar verir (düşman link/param kirliliği)
   *  · /search      → klasik duplicate content
   *  · /api/        → JSON, asla indekslenmez
   *  · /chat        → kullanıcıya özel
   *  · /cv/         → PDF'in arama sonuçlarında çıkması istenmiyorsa
   */
  const privateRoutes = [
    '/admin',
    '/puck',
    '/login',
    '/sign',
    '/auth',
    '/search',
    '/chat',
    '/api/',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...privateRoutes, '/cv/'],
      },
      {
        userAgent: ['GoogleBot', 'Bingbot'],
        allow: '/',
        disallow: privateRoutes,
      },
    ],
    // Sitemap TEK kez bildirilir; cogaltmak gerekmez ve gürültü yaratır.
    sitemap: siteUrl('/sitemap.xml'),
  }
}
