/**
 * Istemci IP'si — TEK kaynak.
 *
 * Neden tek yerde: bu mantik 4 dosyada KOPYALANMISTI ve ikisi duzeltilmemisti:
 *   - `api/admin/login`  → DOGRU (son XFF)
 *   - `api/ads`          → DOGRU (son XFF)
 *   - `api/chat`         → YANLIS (ILK XFF)
 *   - `api/chat/upload`  → YANLIS (ILK XFF)
 *
 * Sonuc: sohbet 10 sn bekleme suresi ve dosya yukleme siniri (5/dk),
 * `X-Forwarded-For` uydurularak ATLATILABILIYORDU. Kopya mantik = bir kopya
 * duzeltilir, digerleri geride kalir (bu projede PGRST204 hatasinda da ayni
 * desen yasandi).
 *
 * ⚠️ NEDEN "SON" XFF DEGERI:
 *   - Cloudflare XFF'i **EKLER** → gercek IP SONDA olur, basa istemcinin
 *     gonderdigi deger gelir. Ilk degeri almak = saldirganin istedigi IP.
 *   - Vercel XFF'i **EZER** → tek ve gercek deger.
 *   Her iki platformda da SON deger platform tarafindan yazilir.
 *
 * `cf-connecting-ip` yalnizca Cloudflare'de guvenilirdir; Vercel'de istemci
 * bu header'i kendisi gonderebilir. Bu yuzden XFF yoksa YEDEK olarak kullanilir.
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
/** Basit IPv6 kontrolu (tam dogrulama degil — sadece kabaca sekil). */
const IPV6 = /^[0-9a-f:]+$/i

function looksLikeIp(value: string): boolean {
  return IPV4.test(value) || (value.includes(':') && IPV6.test(value))
}

export function clientIp(req: Request): string {
  // 1) XFF'in SON degeri — platform tarafindan yazilir (Cloudflare ekler,
  //    Vercel ezer). Ilk degeri ASLA kullanma.
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && looksLikeIp(last)) {
      return last
    }
  }

  // 2) Cloudflare'in kendi header'i (XFF yoksa yedek)
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf && looksLikeIp(cf)) {
    return cf
  }

  // 3) Bazi platformlarin kullandigi alternatif
  const real = req.headers.get('x-real-ip')?.trim()
  if (real && looksLikeIp(real)) {
    return real
  }

  return 'unknown'
}
