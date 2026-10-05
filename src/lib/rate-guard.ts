/**
 * Yazma uç noktaları için tek satırlık koruma (2026-10-05).
 *
 * Neden ayrı dosya: 14+ route'a `checkLimit(...)` + 429 gövdesi yazmak
 * mantığı KOPYALAMAK olurdu; biri güncellenince diğerleri bayat kalırdı.
 * Burada tek bir yardımcı var, route'lar sadece çağırıyor.
 *
 * KULLANIM:
 *   import { guardWrite } from '@/lib/rate-guard'
 *   export async function POST(req: Request) {
 *     const denied = await guardWrite(req, 'admin-content')
 *     if (denied) return denied      // 429 ya da 503
 *     ...mevcut kod...
 *   }
 */

import { LIMITS, checkLimit, rateLimitResponse } from '@/lib/rate-limit-kv'

/**
 * @param req    İstek (IP için)
 * @param scope  Anahtar öneki. Aynı scope'u paylaşan route'lar kotaları
 *               PAYLAŞIR — dikkat: `/api/admin/login` ile
 *               `/api/auth/login` aynı scope'u kullanıyor mu diye seç.
 * @param limit  `LIMITS.write` (dakikada 20) varsayılan.
 * @returns `null` → devam et, `Response` → 429/503 döndür.
 */
export async function guardWrite(
  req: Request,
  scope: string,
  limit: { limit: number, windowMs: number } = LIMITS.write,
): Promise<Response | null> {
  // `failClosed: false` — bu uç noktalar ucuz (bir kayıt güncellemesi).
  // KV kesintisi kullanıcıyı admin panelinden veya profilinden mahrum
  // bırakmasın; gerçek koruma zaten oturum doğrulaması.
  const result = await checkLimit(scope, { ...limit, failClosed: false }, req)
  return result.ok ? null : rateLimitResponse(result)
}
