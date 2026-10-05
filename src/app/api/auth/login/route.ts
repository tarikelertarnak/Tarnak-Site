import { guardWrite } from '@/lib/rate-guard'
import { NextResponse } from 'next/server'
import { createSessionToken, verifyCredentials } from '@/lib/auth'
import { getAdmin } from '@/lib/content'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Kullanıcıyı ad/kullanıcı adıyla e-postasına çözer.
 *
 * Önce kısa önbellek: kimlik zaten e-posta ise dokunulmaz, ad ise 5 dakika
 * boyunca aynı sonuç döner. Böylece her giriş denemesinde tüm kullanıcı
 * listesi taranmaz (kimlik doğrulamasız amplifikasyon).
 */
const USER_LOOKUP_TTL_MS = 5 * 60 * 1000
const userCache = new Map<string, { email: string | null, at: number }>()

/** "Var/yok" bilgisi sızmasın diye kullanılmayan e-posta ile gerçek bir deneme. */
async function verifyDecoy(identifier: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signInWithPassword({
      email: `no-such-user-${Math.abs(hashCode(identifier))}@invalid.local`,
      password: `decoy-${Math.random()}`,
    })
  }
  catch { /* amacı zamanlama eşitlemesi — sonuç önemsiz */ }
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}

async function findUserByIdentifier(
  adminClient: ReturnType<typeof createAdminClient>,
  identifier: string,
): Promise<{ email: string } | null> {
  const key = identifier.toLowerCase()
  const hit = userCache.get(key)
  if (hit && Date.now() - hit.at < USER_LOOKUP_TTL_MS) {
    return hit.email ? { email: hit.email } : null
  }
  const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const match = data.users.find(u =>
    u.user_metadata?.username?.toLowerCase() === key
    || u.user_metadata?.full_name?.toLowerCase() === key,
  )
  const email = match?.email ?? null
  userCache.set(key, { email, at: Date.now() })
  return email ? { email } : null
}

/** Kısa süreli IP bazlı kilit (in-memory) — brute force yavaşlatma. */
const MAX_ATTEMPTS = 8
const LOCK_MS = 15 * 60 * 1000
const MAX_TRACKED_IPS = 5000
const attempts = new Map<string, { count: number, lockedUntil: number }>()

/**
 * IP'yi tek güvenilir kaynaktan al ve biçimini doğrula.
 *
 * `x-forwarded-for` istemci tarafından eklenebildiği için ilk değere bakmak
 * kilit anahtarını kullanıcıya veriyordu (kileti atlatmak için başlığı
 * değiştirmek yeterliydi). Cloudflare daima son değeri kendisi yazar, o yüzden
 * önce `cf-connecting-ip` okunur.
 */
function ipOf(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf && /^[0-9a-f:.]{3,45}$/i.test(cf)) {
    return cf
  }
  const xff = req.headers.get('x-forwarded-for')
  const last = xff?.split(',').at(-1)?.trim()
  if (last && /^[0-9a-f:.]{3,45}$/i.test(last)) {
    return last
  }
  return 'unknown'
}

/** Bellek sızıntısını önlemek için eski kayıtları budur. */
function pruneAttempts(): void {
  if (attempts.size <= MAX_TRACKED_IPS) {
    return
  }
  const now = Date.now()
  for (const [k, v] of attempts) {
    if (v.lockedUntil <= now && now - v.lockedUntil > LOCK_MS) {
      attempts.delete(k)
    }
  }
  if (attempts.size > MAX_TRACKED_IPS) {
    const excess = attempts.size - MAX_TRACKED_IPS
    let i = 0
    for (const k of attempts.keys()) {
      if (i++ >= excess) {
        break
      }
      attempts.delete(k)
    }
  }
}

/** Kullanıcıya aynı mesaj: "böyle biri yok" ile "şifre yanlış" ayrımı sızdırıyordu. */
const GENERIC_AUTH_ERROR = 'Ad/e-posta veya şifre hatalı.'

function normalizeIdentifier(raw: string): string {
  const v = raw.trim().slice(0, 254)
  return v.toLowerCase()
}

/**
 * Giriş — "Ad veya e-posta" + şifre.
 * 1) identifier e-posta içermiyorsa önce ADMIN girişi denenir (ayrı sistem —
 *    site yöneticisi admin_session cookie kullanır, Supabase değil).
 * 2) Supabase Auth ile gerçek kullanıcı girişi: ad girildiyse service-role ile
 *    metadata'da username/full_name eşleşen hesabın e-postası bulunur.
 */
export async function POST(req: Request) {
  /* __RATE_GUARD__ KV hız sınırı: IP başına auth-login dakikada 20 yazma.
   * Pahalı işlemden (Supabase INSERT / dosya yazımı) ÖNCE kontrol edilir. */
  const denied = await guardWrite(req, 'auth-login')
  if (denied)
    return denied
  const ip = ipOf(req)
  const now = Date.now()
  const lock = attempts.get(ip)
  if (lock && lock.lockedUntil > now) {
    return NextResponse.json(
      { success: false, message: 'Çok fazla hatalı deneme. Bir süre sonra tekrar deneyin.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const identifier = normalizeIdentifier(typeof body?.identifier === 'string' ? body.identifier : '')
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!identifier || !password) {
    return NextResponse.json({ success: false, message: 'Ad/e-posta ve şifre gerekli.' }, { status: 400 })
  }

  const recordFailure = () => {
    const rec = attempts.get(ip)
    const next = (rec?.count ?? 0) + 1
    if (next >= MAX_ATTEMPTS) {
      attempts.set(ip, { count: 0, lockedUntil: now + LOCK_MS })
    }
    else {
      attempts.set(ip, { count: next, lockedUntil: 0 })
    }
    // Sınırsız IP ile bellek şişmesini önle.
    pruneAttempts()
  }

  const fail = (message: string, status = 401) => {
    recordFailure()
    return NextResponse.json({ success: false, message }, { status })
  }

  // ── 1) Admin girişi (yalnızca e-posta formatı DEĞİLSE — "ad" ile) ──────
  // E-posta girildiyse kesin Supabase yoluna gider; admin adı e-posta
  // şeklinde olmadığı için çakışma yok.
  if (!identifier.includes('@')) {
    const admin = await getAdmin().catch(() => null)
    if (admin && identifier === admin.username.toLowerCase()) {
      const ok = await verifyCredentials(identifier, password)
      if (!ok.ok) {
        return fail('Kullanıcı adı veya şifre hatalı.')
      }
      attempts.delete(ip)
      const token = createSessionToken(admin.username)
      const res = NextResponse.json({ success: true, next: '/' })
      res.cookies.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      return res
    }
  }

  // ── 2) Supabase kullanıcı girişi ────────────────────────────────────────
  let email = identifier
  if (!identifier.includes('@')) {
    // "Ad" ile giriş: metadata'da username / full_name eşleşen hesabı bul.
    //
    // Daha önce her istekte `listUsers({perPage:1000})` çağrılıyordu — hem
    // pahalı, hem de "Kullanıcı bulunamadı." / "şifre hitali" ayrımıyla
    // kullanıcı adlarını tek tek sızdırıyordu. Artık:
    //   - eşleşme sonucu kısa süre önbelleğe alınıyor (yüzlerce kullanıcıda
    //     her istek tüm listeyi taramak anlamsız),
    //   - bulunamasa da şifre hatasıyla AYNI mesaj dönüyor (numaralandırma yok).
    try {
      const adminClient = createAdminClient()
      const match = await findUserByIdentifier(adminClient, identifier)
      if (!match?.email) {
        // Kullanıcı yok → yine de şifre doğrulaması çalıştırılıp aynı hata
        // döndürülüyor; aksi halde "var/yok" bilgisi sızardı.
        await verifyDecoy(identifier)
        return fail(GENERIC_AUTH_ERROR)
      }
      email = match.email
    }
    catch {
      return fail(GENERIC_AUTH_ERROR)
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Tüm kimlik hataları tek mesaj: "böyle biri yok" ile "şifre yanlış"
    // ayrımı kullanıcı adlarını sızdırıyordu.
    const msg = error.message?.toLowerCase().includes('invalid login credentials')
      ? GENERIC_AUTH_ERROR
      : error.message ?? 'Giriş başarısız oldu.'
    return fail(msg)
  }

  attempts.delete(ip)
  return NextResponse.json({ success: true })
}