// Search Console dogrulama jetonu — TEK KAYNAK.
//
// 2026-10-04: Bu dosya artik `src/lib/search-verification.ts` uzerinden
// yeniden disa aktarir. Gerekce: Jeton iki dosyada da sabit yazili kalirsa
// (2026-10-03'te oldugu gibi) HTML etiketi ile HTML dosyasi yontemleri
// ayri ayri guncellenip birbirinden kopar. Yeni dosyada Google + Yandex +
// Bing jetonlari birlikte duruyor.
//
// Bu dosya silinmez: `/google-verification` route handler'i ve testler bu
// yolu import ediyor.
export { GOOGLE_VERIFICATION_TOKEN as GSC_VERIFICATION_TOKEN } from '@/lib/search-verification'