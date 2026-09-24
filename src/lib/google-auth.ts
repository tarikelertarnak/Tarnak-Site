/**
 * Google Sign-In (ID token) doğrulaması — "Google ile devam et" butonu için.
 *
 * Kullanılan yöntem: Google'ın resmî tokeninfo endpoint'i (tek fetch, TLS).
 * Alternatif (JWKS doğrulaması) için ek bağımlılık (jose vb.) gerekirdi —
 * bu proje için tokeninfo yeterli ve sıfır bağımlılık.
 *
 * Güvenlik kontrolleri:
 *  - audience (aud) == GOOGLE_CLIENT_ID (token bizim client'a ait olmalı)
 *  - email_verified == true (Google'ın doğruladığı e-posta)
 *  - expiration (exp)
 *  - dönen email, GOOGLE_ADMIN_EMAIL ile birebir eşleşmeli
 */

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'

export interface GoogleTokenResult {
  ok: true
  email: string
  name: string | null
  picture: string | null
  sub: string
}

interface TokenInfoResponse {
  aud?: string
  exp?: string
  email?: string
  email_verified?: string
  name?: string
  picture?: string
  sub?: string
  error_description?: string
}

export interface PreVerifyResult {
  ok: false
  status: number
  message: string
}

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? ''
}

/** Site'e girişe izin verilen Google hesabı. Yoksa Google girişi kapalıdır. */
export function googleAdminEmail(): string {
  return process.env.GOOGLE_ADMIN_EMAIL ?? ''
}

/** Google Sign-In yapılandırılmış mı (client id + admin email set edilmiş mi)? */
export function googleSignInEnabled(): boolean {
  return !!clientId() && !!googleAdminEmail()
}

/** id_token'ı doğrular; geçerliyse Google profili döner. */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleTokenResult | PreVerifyResult> {
  if (!googleSignInEnabled()) {
    return { ok: false, status: 503, message: 'Google girişi etkin değil.' }
  }
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) {
    return { ok: false, status: 400, message: 'Geçersiz kimlik belirteci.' }
  }

  let payload: TokenInfoResponse
  try {
    const res = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`, {
      headers: { accept: 'application/json' },
      // Cloudflare Workers: dış ağ çağrısı — varsayılan fetch ayarları yeterli.
    })
    if (!res.ok) {
      return { ok: false, status: 401, message: 'Google doğrulaması başarısız.' }
    }
    payload = (await res.json()) as TokenInfoResponse
  }
  catch {
    return { ok: false, status: 502, message: 'Google doğrulama servisine ulaşılamadı.' }
  }

  // audience kontrolü — token başka bir uygulamaya aitse REDDET
  if (payload.aud !== clientId()) {
    return { ok: false, status: 401, message: 'Kimlik belirteci bu siteye ait değil.' }
  }

  // expiration kontrolü
  const exp = Number(payload.exp)
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) {
    return { ok: false, status: 401, message: 'Kimlik belirtecinin süresi dolmuş.' }
  }

  // email + email_verified kontrolü
  const email = payload.email?.trim().toLowerCase() ?? ''
  if (!email || payload.email_verified !== 'true') {
    return { ok: false, status: 401, message: 'Doğrulanmamış e-posta.' }
  }

  // Yalnızca yetkili hesap giriş yapabilir
  if (!googleSignInEnabled() || email !== googleAdminEmail().trim().toLowerCase()) {
    return { ok: false, status: 403, message: 'Bu Google hesabı yetkili değil.' }
  }

  return {
    ok: true,
    email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    sub: payload.sub ?? email,
  }
}
