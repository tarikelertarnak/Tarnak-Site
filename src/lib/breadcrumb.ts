/**
 * Breadcrumb öğe tipi (Faz 2 · SEO 2)
 *
 * `href` site içi yol olmalı (`/blog/yazi`). Dış bağlantı breadcrumb'a
 * konmaz — breadcrumb bir hiyerarşi gösterir, dış site değil.
 */
export interface BreadcrumbItem {
  /** Ekranda görünen ve JSON-LD'de `name` olarak kullanılan metin */
  label: string
  /** Site içi yol, örn. `/blog` */
  href: string
}

/**
 * Sayfaların breadcrumb listeleri — TEK dosya (kullanıcı isteği:
 * "adı değişen sayfalar için 301 yönlendirme yapısı (tek dosyada)" ile
 * aynı mantık: bağlantı haritası tek yerde toplanır).
 *
 * Yeni sayfa eklerken buraya bir satır eklemek yeterli; sayfa kendisi
 * `Breadcrumbs` bileşenini render eder.
 */
export const CRUMBS: Record<string, BreadcrumbItem[]> = {
  '/projects': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Projeler', href: '/projects' },
  ],
  '/blog': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Blog', href: '/blog' },
  ],
  '/about': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Hakkımda', href: '/about' },
  ],
  '/github': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'GitHub', href: '/github' },
  ],
  '/contact': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'İletişim', href: '/contact' },
  ],
  '/donate': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Destek Ol', href: '/donate' },
  ],
  '/credits': [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Katkıda Bulunanlar', href: '/credits' },
  ],
}

/** Bir yazının crumb'ı: Ana sayfa > Blog > Yazı başlığı. */
export function postCrumbs(title: string): BreadcrumbItem[] {
  return [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: title, href: '/blog' },
  ]
}

/** Bir projenin crumb'ı: Ana sayfa > Projeler > Proje adı. */
export function projectCrumbs(title: string, href: string): BreadcrumbItem[] {
  return [
    { label: 'Ana sayfa', href: '/' },
    { label: 'Projeler', href: '/projects' },
    { label: title, href },
  ]
}

/**
 * 301 yönlendirmeleri (kullanıcı isteği: "adı değişen sayfalar için 301
 * yönlendirme yapısı (tek dosyada)").
 *
 * ESKİ → YENİ adres eşlemesi. Arama motorlarına "bu sayfa taşındı, kalıcı
 * olarak burada" der (301 = kalıcı). `proxy.ts` bu listeyi uygular.
 *
 * ⚠️ Kurallar:
 *  · Hedefler sitemap'te OLMALI.
 *  · Kendini hedefleyen giriş YAZMA (döngü → sonsuz yönlendirme).
 *  · Giriş kaldırıldığında eski URL 404 döner; bu normaldir (404 de yeni
 *    bir 301'in sinyalidir ama en temiz olanı eski yönlendirmeyi tutmaktır).
 */
export const PERMANENT_REDIRECTS: Record<string, string> = {
  // Örnek yapı — gerçek taşımalar buraya. Şimdilik boş çünkü 2026-10-07
  // itibarıyla bilinen bir sayfa taşıması yok. (Eski GitHub Pages ve
  // Vercel yayınları KALDIRILDI; onlar için 301 kurmak yanlış olurdu —
  // domain değişikliği DNS seviyesinde yapılır.)
  '/profil': '/about',
  '/cv': '/about',
}