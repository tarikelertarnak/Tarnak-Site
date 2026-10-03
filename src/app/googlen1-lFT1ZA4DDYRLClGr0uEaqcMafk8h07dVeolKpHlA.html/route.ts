// Search Console "HTML dosyasi yukleme" dogrulama yontemi.
//
// GSC bu adresi DOGRUDAN GET eder: /google<TOKEN>.html
// Yonlendirmeleri TAKIP ETMEZ — bu yuzden route public/ dosyasi degil,
// Next.js route handler'i olarak kurulur ve next.config'te
// skipTrailingSlashRedirect ile 308 uretmesi engellenir.
//
// TOKEN: src/lib/gsc.ts TEK KAYNAK. Klasor adi da ayni jetonu icerir;
// ikisi carpisma (RLC/LRC) yuzunden 2026-10-03'te ayristi. Klasor adini
// degistirirsen GSC dogrulamasi kacar: jetonu GSC'den tekrar al, sonra
// bu klasoru `google` + <yeni token> + `.html` adiyla yeniden olustur.

import { GSC_VERIFICATION_TOKEN } from '@/lib/gsc';

export const dynamic = 'force-static';

export function GET() {
  return new Response(`google-site-verification:${GSC_VERIFICATION_TOKEN}`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}