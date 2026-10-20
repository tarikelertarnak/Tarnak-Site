/**
 * Breadcrumb öğe tipi
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
 * Sözlükten çözülen kırıntı — `label` yerine `labelKey` taşır.
 *
 * NEDEN: sunucu her zaman TR bastığı için (`getStaticLocale` sabit 'tr',
 * kök layout `force-static`) hardcode `label` EN modda kalıcı Türkçe kalıyordu.
 * `labelKey` istemcide `t()` ile çözülür; JSON-LD'de ise statik TR `label`
 * kullanılır (metadata bilinçli sınır — SEO sinyali Türkçe kalır).
 */
export interface CrumbsI18n {
  labelKey: string
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
export const CRUMBS: Record<string, CrumbsI18n[]> = {
  '/projects': [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.projects', href: '/projects' },
  ],
  '/blog': [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.blog', href: '/blog' },
  ],
  '/about': [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.about', href: '/about' },
  ],
  '/contact': [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.contact', href: '/contact' },
  ],
  '/donate': [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.donate', href: '/donate' },
  ],
  '/credits': [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.credits', href: '/credits' },
  ],
}

/** Bir yazının crumb'ı: Ana sayfa > Blog > Yazı başlığı. */
export function postCrumbs(title: string): CrumbsI18n[] {
  return [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.blog', href: '/blog' },
    // Başlık kullanıcı verisidir — çevrilmez.
    { labelKey: `__raw:${title}`, href: '/blog' },
  ]
}

/** Bir projenin crumb'ı: Ana sayfa > Projeler > Proje adı. */
export function projectCrumbs(title: string, href: string): CrumbsI18n[] {
  return [
    { labelKey: 'nav.home', href: '/' },
    { labelKey: 'nav.projects', href: '/projects' },
    { labelKey: `__raw:${title}`, href },
  ]
}

/**
 * Sözlük anahtarlarını çözülmüş etiketlere çevirir (JSON-LD için).
 * `__raw:` ön ekli değerler (kullanıcı verisi) olduğu gibi geçer.
 */
export function resolveCrumbs(
  items: CrumbsI18n[],
  t: (k: string) => string,
): BreadcrumbItem[] {
  return items.map(i => ({
    label: i.labelKey.startsWith('__raw:')
      ? i.labelKey.slice(6)
      : t(i.labelKey),
    href: i.href,
  }))
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
