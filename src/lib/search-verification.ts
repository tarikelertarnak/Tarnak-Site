// Arama motoru dogrulama jetonlari — TEK KAYNAK (bkz. gsc.ts).
//
// Neden ayri dosya: Google jetonu zaten gsc.ts'te tek kaynaktan geliyordu ve
// 2026-10-03'te HTML etiketi ile HTML dosyasi yontemlerinin birbirinden
// kopmasi yuzunden iki kez bozulmustu. Yandex jetonu ise layout.tsx icinde
// gomuluydu; Bing hic yoktu. Ucunu de burada topluyoruz.
//
// Token tanimli degilse `undefined` doner; cagiran taraf kosul spreading ile
// anahtari hic eklemiyor (Next'in `metadata.other` tipi `undefined` kabul
// etmiyor — dogrudan yazmak TS2322 ile build'i kirardi). Yani eksik token
// siteyi bozmaz, dogru yontem hazir olur.

/** Google Search Console — HTML dosya yontemi (public/googlen1-*.html). */
export const GOOGLE_VERIFICATION_TOKEN
  = 'n1-lFT1ZA4DDYRLClGr0uEaqcMafk8h07dVeolKpHlA'

/** Google Search Console — HTML meta etiketi. */
export const GOOGLE_SITE_VERIFICATION = GOOGLE_VERIFICATION_TOKEN

/** Yandex Webmaster (webmaster.yandex.com) — meta etiketi. */
export const YANDEX_VERIFICATION = '95b7322d0c238a81'

/**
 * Bing Webmaster (bing.com/webmasters) — meta etiketi.
 *
 * Henuz alinmadi. Almak icin: Bing Webmaster'a site ekle -> "Site Ayarlari" ->
 * "Webmasterlar" -> HTML meta etiketi kopyala -> `.env.local` icine
 *   BING_SITE_VERIFICATION=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 * olarak yaz. Burasi bos string donerse etiket basilmaz.
 */
export const BING_VERIFICATION: string | undefined
  = process.env.BING_SITE_VERIFICATION || undefined

/**
 * IndexNow — ucretsiz, anlik indeksleme (Bing + Yandex + destekleyenler).
 * Anahtar `public/` altinda duz metin dosyasi olarak sunulur; API ucu
 * `POST /api/indexnow` ile sarilir (anahtari disariya sizdirmamak icin).
 */
export const INDEXNOW_KEY: string | undefined
  = process.env.INDEXNOW_KEY || undefined