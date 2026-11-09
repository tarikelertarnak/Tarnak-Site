import localFont from 'next/font/local'

/**
 * Montserrat — `next/font/local` ile self-hosted
 *
 * ÖNCE: `@fontsource/montserrat/{400..800}.css` import ediliyordu. Her CSS
 * dosyası TÜM alt kümeleri (latin, latin-ext, cyrillic, greek, vietnamese)
 * `src:` olarak çekiyordu → 90 woff2 dosyası / 1.4 MB. Sitenin gerçek
 * ihtiyacı iki alt küme:
 *
 *   · latin     → çoğu Türkçe harf (a, b, c, ç, ğ, ı, ö, ş, ü)
 *   · latin-ext → Ğ, İ, Ş (Türkçe'nin ASCII dışı büyük harfleri) + Euro,
 *                 üç nokta vb. Türkçe olmayan bu 3 harf OLMAZSA "İ" ve "Ğ"
 *                 yanlış fontta (fallback) çizilir ve yazı bozulur.
 *
 * Bu yüzden ikisi birden yükleniyor — `latin` TEK BAŞINA yeterli DEĞİL.
 *
 * KAZANÇ:
 *  · Yalnızca kullanılan alt kümeler (10 dosya: 5 ağırlık × 2 alt küme)
 *  · `preload: true` → kritik font HTML'de `<link rel=preload>` ile gelir,
 *    LCP beklemez.
 *  · `display: 'swap'` → font yüklenene kadar sistem fontu gösterilir,
 *    CLS oluşmaz (performans bütçesi: CLS ≤ 0.1).
 *  · `adjustFontFallback` → satır yüksekliği farkını telafi eder.
 *  · CSS dosyası zinciri ve `node_modules`'a çalışma zamanı erişimi yok.
 *
 * DOSYALAR node_modules'tan alınıyor: build sırasında kopyalanıp Next'in
 * `_next/static/media` altına konur. Yani "kendi sunucundan yükleme"
 * (harici font CDN'i yok) sağlanıyor.
 */
export const montserrat = localFont({
  src: [
    // 400
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-ext-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    // 500
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-ext-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    // 600
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-ext-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    // 700
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-ext-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
    // 800
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/montserrat/files/montserrat-latin-ext-800-normal.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-montserrat',
  display: 'swap',
  preload: true,
  // Aşağı yönlü preload: bu yazı tipi LCP metni (hero başlığı) için kritik.
  // Next 15+ `preload` ile ilgili harici font dosyalarında öncelik verir.
  fallback: [
    'system-ui',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: 'Arial',
})
