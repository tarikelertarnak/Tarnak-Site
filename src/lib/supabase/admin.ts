import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — yalnızca sunucu tarafında (API route).
 * RLS'yi bypass eder: kullanıcı oluşturma/silme, email_confirm, metadata
 * yönetimi gibi admin işlemleri için. ASLA import edilmemeli client tarafından.
 */
let adminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!
  if (!url || !serviceKey) {
    throw new Error('SUPABASE service-role ayarları eksik (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  adminClient = createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: Object.assign(
        (input: RequestInfo | URL, init?: RequestInit) =>
          globalThis.fetch(input, { ...(init || {}), signal: AbortSignal.timeout(25_000) }),
        { preconnect: () => {} }
      ) as unknown as typeof globalThis.fetch,
    },
  })
  return adminClient
}

/** Service-role istemi gerekmeyen kurulumlarda boş döner; anahtar istemciye aktarılmaz. */
export function createOptionalAdminClient(): SupabaseClient | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL
    || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE)) {
    return null
  }
  return createAdminClient()
}
