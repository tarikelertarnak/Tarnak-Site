/**
 * CSP nonce üretimi + politika birleştirme (tek kaynak).
 *
 * Neden ayrı dosya: `next.config.mjs` statik çalışır, request'e erişemez;
 * nonce ise HER istekte benzersiz olmak zorundadır. Bu yüzden politika burada
 * kurulur, `src/proxy.ts` (Next 16'da middleware'in adı) çağırır.
 *
 * Uyumluluk kuralları:
 * - `node:crypto` YASAK (edge/Workers). Yalnızca global Web Crypto `crypto`.
 * - `Buffer` YASAK. base64 için `btoa` (edge runtime'da native).
 * - Yeni bağımlılık yok.
 */

/** Nonce byte sayısı. 16 bayt = 128 bit, CSP için önerilen asgari güç. */
const NONCE_BYTES = 16

/**
 * İstek başına benzersiz nonce üretir (base64).
 *
 * `crypto.getRandomValues` global Web Crypto API'sidir: Node 18+, Vercel/Cloudflare
 * Workers ve Next.js edge runtime'ında her yerde mevcuttur.
 *
 * Dönen değer `+`, `/`, `=` içerebilir; Next'in nonce ayrıştırıcısı
 * (`get-script-nonce-from-header.js`) bu karakterlere izin verir.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Google AdSense yalnızca NEXT_PUBLIC_ADSENSE_CLIENT tanımlıysa eklenir —
// reklam ağı bağlanmadığı sürece politika dar kalır.
const AD_SCRIPT_SRC = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  ? ' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com'
  : ''
const AD_FRAME_SRC = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  ? ' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com'
  : ''

// Google Sign-In: gsi/client script'i + hesap seçici iframe'i.
const GOOGLE_SIGNIN = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  ? ' https://accounts.google.com'
  : ''

/**
 * CSP başlık değerini üretir.
 *
 * 'unsafe-inline' ve 'unsafe-eval` bilinçli olarak YOK: nonce'un anlamı budur.
 * Tema init script'i nonce alır (bkz. src/components/theme-init-script.tsx),
 * Next'in kendi script'leri nonce'u istek header'ından okuyup otomatik alır.
 *
 * ⚠️ `report-uri`/`report-to` yorumda bekliyor: rapor toplayan endpoint henüz
 * yok. Rapor-only modda ihlaller konsola düşer; gerçek `report-to` grubu
 * (örn. Cloudflare `report-to` header'ı) kurulunca buraya eklenmeli.
 * Ayrıntı için bkz. next.config.mjs içindeki "ENFORCING MODA GEÇİŞ" bloğu.
 */
export function buildCspValue(nonce: string): string {
  return [
    'default-src \'self\'',
    `script-src 'self' 'nonce-${nonce}'${AD_SCRIPT_SRC}${GOOGLE_SIGNIN}`,
    // Emotion/antd/heroUI stil etiketlerini satır içi basıyor; stil tarafında
    // nonce kullanılamaz (stillere nonce verilmez, hash gerekir) → pragma korunur.
    'style-src \'self\' \'unsafe-inline\'',
    'img-src \'self\' data: blob: https:',
    'font-src \'self\' data: https:',
    'connect-src \'self\' https: wss:',
    `frame-src 'self'${AD_FRAME_SRC}${GOOGLE_SIGNIN}`,
    'object-src \'none\'',
    'base-uri \'self\'',
    'form-action \'self\'',
    // X-Frame-Options'in CSP karşılığı. Report-only modda tarayıcı bunu
    // UYGULAMAZ (frame-ancestors report-only'da yok sayılır) — enforcing'e
    // geçince devreye girer.
    'frame-ancestors \'self\'',
    // TODO(csp-report): `report-to csp-endpoint` ekle (endpoint kurulunca).
  ].join('; ')
}
